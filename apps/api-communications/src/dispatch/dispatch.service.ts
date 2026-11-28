import { Injectable, Logger } from '@nestjs/common';
import { TemplatesService } from '../templates/templates.service';
import { TemplateRendererService } from '../templates/template-renderer.service';
import { ComplianceService } from '../compliance/compliance.service';
import { GatewayFactoryService } from '../gateways/gateway-factory.service';
import { LogsService } from '../logs/logs.service';
import { EventPublisher } from '@verichron/event-publisher';
import { CommunicationStatus, CommunicationType, DispatchMethod, CommunicationProvider } from '@verichron/enums';
import { EVENT_TYPES } from '@verichron/events';
import { CommunicationBlockedDto, CommunicationDispatchedDto } from '../events/event-dto';
import { ComplianceViolationException } from './errors/compliance-violation.exception';
import { TemplateNotFoundException } from '../templates/errors/template-not-found.exception';
import { DispatchFailedException } from './errors/dispatch-failed.exception';

export interface DispatchRequest {
  organizationId: string;
  debtorId: string;
  debtId?: string;
  communicationType: DispatchMethod;
  templateName: string;
  context: Record<string, any>;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly rendererService: TemplateRendererService,
    private readonly complianceService: ComplianceService,
    private readonly gatewayFactory: GatewayFactoryService,
    private readonly logsService: LogsService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Main dispatch workflow
   */
  async dispatch(request: DispatchRequest): Promise<string> {
    const { organizationId, debtorId, communicationType, templateName, context, metadata } = request;

    this.logger.log(`Dispatching ${communicationType} to debtor ${debtorId}`);

    try {
      // Step 1: Check compliance
      const complianceResult = await this.complianceService.checkCompliance({
        debtorId,
        organizationId,
        communicationType: communicationType as unknown as CommunicationType,
        scheduledAt: request.scheduledAt,
      });

      if (!complianceResult.allowed) {
        const reason = complianceResult.reason || 'Compliance check failed';
        this.logger.warn(`Compliance check failed for debtor ${debtorId}: ${reason}`);

        const log = await this.logsService.create({
          organizationId,
          debtorId,
          debtId: request.debtId,
          type: communicationType as unknown as CommunicationType,
          status: CommunicationStatus.BLOCKED,
          templateName,
          blockedReason: reason,
          metadata: metadata, // Pass through invitationBatchId etc.
        });

        await this.eventPublisher.publish(
          EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_BLOCKED,
          {
            logId: log._id.toString(),
            organizationId,
            debtorId,
            blockedAt: new Date().toISOString(),
            reason,
            ruleName: complianceResult.ruleName || 'Unknown',
            type: DispatchMethod.EMAIL
          },
          CommunicationBlockedDto,
        );

        throw new ComplianceViolationException(reason);
      }

      // Step 2: Fetch and render template
      const template = await this.templatesService.findActiveByName(
        organizationId,
        templateName,
      );

      if (!template) {
        throw new TemplateNotFoundException(templateName);
      }

      const renderedContent = this.rendererService.render(template.body, context);
      const renderedSubject = template.subject
        ? this.rendererService.render(template.subject, context)
        : undefined;

      // Step 3: Send via gateway
      const gateway = this.getGateway(communicationType);
      const provider = this.getProviderName(communicationType);
      const payload = this.buildPayload(communicationType, {
        to: context.debtor?.email || context.debtor?.phone,
        subject: renderedSubject,
        content: renderedContent,
        organizationId,
        debtorId,
      });

      let gatewayResponse;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          gatewayResponse = await gateway.send(payload);
          
          if (gatewayResponse.success) {
            break;
          }

          if (attempts >= maxAttempts) {
            throw new DispatchFailedException(gatewayResponse.error);
          }

          this.logger.warn(`Gateway dispatch failed (attempt ${attempts}/${maxAttempts}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 100 * attempts)); // Simple backoff
        } catch (error: unknown) {
          if (attempts >= maxAttempts) {
            throw error;
          }
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Gateway dispatch threw error (attempt ${attempts}/${maxAttempts}), retrying: ${errorMessage}`);
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        }
      }

      if (!gatewayResponse?.success) {
        throw new DispatchFailedException(gatewayResponse?.error || 'Unknown gateway error');
      }

      // Step 4: Log the successful dispatch attempt
      const log = await this.logsService.create({
        organizationId,
        debtorId,
        debtId: request.debtId,
        type: communicationType as unknown as CommunicationType,
        status: CommunicationStatus.SENT,
        provider,
        providerMessageId: gatewayResponse.messageId,
        templateId: template.id,
        content: { subject: renderedSubject, body: renderedContent },
        sentAt: new Date(),
        metadata: { 
          ...metadata,
          templateVersion: template.version 
        },
      });

      const logId = log._id.toString();

      // Step 5: Publish `communications.dispatched` event
      await this.eventPublisher.publish(
        EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_DISPATCHED,
        {
          logId,
          organizationId,
          debtorId,
          type: communicationType as unknown as CommunicationType,
          provider,
          providerMessageId: gatewayResponse.messageId,
          dispatchedAt: new Date().toISOString(),
        },
        CommunicationDispatchedDto,
      );

      this.logger.log(`Dispatch completed. Log ID: ${logId}`);
      return logId;

    } catch (error) {
      if (error instanceof ComplianceViolationException) {
        // Already handled, just re-throw
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Dispatch failed for debtor ${debtorId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      
      // Log the failure if it hasn't been logged as BLOCKED
      // This is a generic failure (e.g., template not found, gateway error)
      await this.logsService.create({
        organizationId,
        debtorId,
        debtId: request.debtId,
        type: communicationType as unknown as CommunicationType,
        status: CommunicationStatus.FAILED,
        templateName,
        failureReason: errorMessage,
      });

      // Note: We don't publish a `communications.failed` event here.
      // That event is reserved for delivery failures reported by webhooks.
      // An error here is a system-level failure in the dispatch process.
      throw error;
    }
  }

  private getGateway(type: DispatchMethod): any {
    switch (type) {
      case DispatchMethod.EMAIL:
        return this.gatewayFactory.getEmailGateway();
      case DispatchMethod.SMS:
        return this.gatewayFactory.getSmsGateway();
      case DispatchMethod.LETTER:
        // TODO: Implement letter gateway (e.g., Lob.com)
        throw new Error('LETTER dispatch not yet implemented');
      default:
        throw new Error(`Unknown dispatch method: ${type}`);
    }
  }

  private getProviderName(type: DispatchMethod): CommunicationProvider {
    switch (type) {
      case DispatchMethod.EMAIL:
        return CommunicationProvider.SENDGRID;
      case DispatchMethod.SMS:
        return CommunicationProvider.TWILIO;
      case DispatchMethod.LETTER:
        // TODO: Implement letter provider when available
        throw new Error('LETTER dispatch provider not yet implemented');
      default:
        throw new Error(`Unknown provider for dispatch method: ${type}`);
    }
  }

  private buildPayload(type: DispatchMethod, data: any): any {
    switch (type) {
      case DispatchMethod.EMAIL:
        return {
          to: data.to,
          from: process.env.EMAIL_FROM_ADDRESS,
          subject: data.subject,
          html: data.content,
          customArgs: {
            organizationId: data.organizationId,
            debtorId: data.debtorId,
          },
        };
      case DispatchMethod.SMS:
        return {
          to: data.to,
          from: process.env.SMS_FROM_NUMBER,
          body: data.content,
        };
      case DispatchMethod.LETTER:
        // TODO: Implement letter payload for Lob.com or similar
        throw new Error('LETTER dispatch not yet implemented');
      default:
        throw new Error(`Unknown dispatch method: ${type}`);
    }
  }
}