import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { EventEnvelope } from '@verichron/events';
import { UserCreatedDto } from '../../events/event-dto/users/user-created.dto';
import { TemplatesService } from '../../templates/templates.service';
import { TemplateRendererService } from '../../templates/template-renderer.service';
import { GatewayFactoryService } from '../../gateways/gateway-factory.service';
import { DispatchMethod } from '@verichron/enums';

@Injectable()
export class UserCreatedListener extends AbstractBaseListener<UserCreatedDto> {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly rendererService: TemplateRendererService,
    private readonly gatewayFactory: GatewayFactoryService,
  ) {
    super();
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.USERS,
    eventType: EVENT_TYPES.USERS_USER_CREATED,
    dto: UserCreatedDto,
  })
  async handleUserCreated(
    data: UserCreatedDto,
    envelope: EventEnvelope<UserCreatedDto>,
  ): Promise<void> {
    this.logger.log(`Handling USER_CREATED event for user ${data.userId}`);

    // 1. Fetch Template
    // We assume a system-wide template named 'USER_INVITATION' exists.
    // If organizationId is provided, we try to find an org-specific override, otherwise default.
    // Since TemplatesService might require orgId, we use the one from event or a system default.
    const organizationId = data.organizationId || 'SYSTEM'; // Fallback if null
    
    // Note: TemplatesService usually expects a valid UUID. If organizationId is null (platform admin),
    // we might need a specific handling. For now, we assume org context.
    // If data.organizationId is null, it's a platform user. 
    
    let templateName = 'USER_INVITATION';
    let template;

    // 1. Try to find organization-specific template
    if (data.organizationId) {
        try {
            template = await this.templatesService.findActiveByName(data.organizationId, templateName);
        } catch (e) {
            this.logger.debug(`No organization-specific template for ${data.organizationId}, checking SYSTEM fallback...`);
        }
    }
    
    // 2. Fallback to system default if not found or no org
    if (!template) {
        try {
            template = await this.templatesService.findActiveByName('00000000-0000-0000-0000-000000000000', templateName);
        } catch (e) {
            this.logger.error(`Required template ${templateName} not found even in SYSTEM context. Invitation cannot be sent.`);
            return;
        }
    }

    // 2. Render Content
    const activationBaseUrl = (process.env.ACTIVATION_BASE_URL || 'http://localhost:5173/activate').trim();

    // Format expiration date for American timezone display
    const expiresAtDate = new Date(data.invitationExpiresAt);
    const formattedExpiresAt = expiresAtDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: 'America/New_York'
    });

    const context = {
        user: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
        },
        invitation: {
            token: data.invitationToken,
            expiresAt: formattedExpiresAt,
            link: `${activationBaseUrl.replace(/\/$/, '')}/${data.invitationToken}`,
        },
        organization: {
            id: data.organizationId
        }
    };

    const renderedBody = this.rendererService.render(template.body, context as any);
    const renderedSubject = template.subject 
        ? this.rendererService.render(template.subject, context as any) 
        : 'Welcome to Verichron';

    // 3. Send Email
    const emailGateway = this.gatewayFactory.getEmailGateway();
    
    const payload = {
        to: data.email,
        from: process.env.EMAIL_FROM_ADDRESS || 'noreply@verichroninc.com',
        subject: renderedSubject,
        html: renderedBody,
        customArgs: {
            userId: data.userId,
            organizationId: data.organizationId || '',
            notificationType: 'USER_INVITATION'
        }
    };

    const result = await emailGateway.send(payload);

    if (result.success) {
        this.logger.log(`Invitation email sent to ${data.email} (Message ID: ${result.messageId})`);
    } else {
        const errorMessage = result.error || 'Unknown error';
        
        // Detect permanent errors that should NOT be retried
        const isPermanentError = 
            errorMessage.includes('Forbidden') || // 403
            errorMessage.includes('Unauthorized') || // 401
            errorMessage.includes('Bad Request') || // 400
            errorMessage.includes('403') || 
            errorMessage.includes('401') || 
            errorMessage.includes('400');

        if (isPermanentError) {
            this.logger.error(`PERMANENT FAILURE: Could not send email to ${data.email}. Stopping retries. Error: ${errorMessage}`);
            // We return successfully to ACK the message and remove it from the queue
            return;
        }

        this.logger.error(`Failed to send invitation email to ${data.email}: ${errorMessage}`);
        // Throwing here triggers the Pub/Sub retry policy for transient errors
        throw new Error(`Email dispatch failed: ${errorMessage}`);
    }
  }
}
