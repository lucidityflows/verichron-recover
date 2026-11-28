import { Controller, Post, Body, Headers, Logger, BadRequestException, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Public } from '@verichron/auth';
import { LogsService } from '../../../logs/logs.service';
import { SendGridWebhookDto } from '../../dto/sendgrid-webhook.dto';
import { InvalidWebhookSignatureException } from '../../errors/invalid-webhook-signature.exception';
import { CommunicationStatus } from '@verichron/enums';
import * as crypto from 'crypto';

/**
 * SendGrid Webhook Controller
 *
 * Handles SendGrid Event Webhook notifications using secure ECDSA signature verification.
 * Marked as @Public() since SendGrid uses signature-based auth, not JWT.
 */
@ApiTags('Webhooks')
@Public()
@Controller('public/communications/webhooks/sendgrid')
export class SendGridWebhookController {
  private readonly logger = new Logger(SendGridWebhookController.name);
  private readonly publicKey: string;

  constructor(
    private readonly logsService: LogsService,
    private readonly config: ConfigService,
  ) {
    this.publicKey = this.config.get<string>('SENDGRID_WEBHOOK_PUBLIC_KEY') || '';
    if (!this.publicKey) {
      this.logger.warn('SENDGRID_WEBHOOK_PUBLIC_KEY not configured - ECDSA signature verification disabled');
    }
  }

  @Post()
  @ApiOperation({
    summary: 'Handle SendGrid webhook events',
    description: 'Receives and processes email event notifications from SendGrid',
  })
  @ApiResponse({ status: 200, description: 'Events processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Body() events: SendGridWebhookDto[],
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-twilio-email-event-webhook-signature') signature?: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp?: string,
  ) {
    this.logger.log(`Received ${events?.length || 0} SendGrid events`);

    if (!Array.isArray(events)) {
      throw new BadRequestException('Expected array of events');
    }

    if (this.publicKey && signature && timestamp) {
      const rawBody = req.rawBody?.toString('utf8') || '';
      const isValid = this.verifySignature(rawBody, signature, timestamp);
      if (!isValid) {
        this.logger.error('Invalid SendGrid ECDSA webhook signature');
        throw new InvalidWebhookSignatureException('SendGrid');
      }
    }

    const results = await Promise.allSettled(
      events.map((event) => this.processEvent(event)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Processed ${succeeded} SendGrid events successfully, ${failed} failed`,
    );

    return {
      received: true,
      processed: succeeded,
      failed,
    };
  }

  /**
   * Verifies the SendGrid webhook signature using ECDSA.
   * https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
   */
  private verifySignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    try {
      const verifier = crypto.createVerify('sha256');
      const signedPayload = timestamp + payload;
      verifier.update(signedPayload);
      
      return verifier.verify(
        {
          key: Buffer.from(this.publicKey, 'base64'),
          format: 'der',
          type: 'spki',
        },
        Buffer.from(signature, 'base64'),
      );
    } catch (error) {
      this.logger.error('Error verifying SendGrid ECDSA signature:', error);
      return false;
    }
  }

  /**
   * Process individual SendGrid event
   */
  private async processEvent(event: SendGridWebhookDto): Promise<void> {
    try {
      const status = this.mapEventToStatus(event.event);
      if (!status) {
        this.logger.debug(`Skipping unmapped SendGrid event: ${event.event}`);
        return;
      }
      
      const customArgs = event.custom_args
        ? JSON.parse(event.custom_args)
        : {};

      await this.logsService.updateStatusByProviderMessageId(
        event.sg_message_id,
        status,
        {
          event: event.event,
          timestamp: event.timestamp,
          reason: event.reason,
          status: event.status,
          response: event.response,
          ip: event.ip,
          useragent: event.useragent,
          url: event.url,
          sg_event_id: event.sg_event_id,
        },
      );

      this.logger.debug(
        `Updated communication log for message ${event.sg_message_id} to status ${status} (event: ${event.event})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process SendGrid event for message ${event.sg_message_id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Map SendGrid event type to CommunicationStatus
   */
  private mapEventToStatus(event: string): CommunicationStatus | null {
    const statusMap: Record<string, CommunicationStatus> = {
      delivered: CommunicationStatus.DELIVERED,
      open: CommunicationStatus.OPENED,
      click: CommunicationStatus.CLICKED,
      bounce: CommunicationStatus.FAILED,
      dropped: CommunicationStatus.FAILED,
      deferred: CommunicationStatus.SENT, // Still trying to deliver
      spam_report: CommunicationStatus.FAILED,
    };
    return statusMap[event] || null;
  }
}
