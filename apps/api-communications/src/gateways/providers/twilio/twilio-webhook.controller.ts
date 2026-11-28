import { Controller, Post, Body, Headers, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { LogsService } from '../../../logs/logs.service';
import { TwilioWebhookDto } from '../../dto/twilio-webhook.dto';
import { InvalidWebhookSignatureException } from '../../errors/invalid-webhook-signature.exception';
import { CommunicationStatus } from '@verichron/enums';
import { validateRequest } from 'twilio';

/**
 * Twilio Webhook Controller
 *
 * Handles Twilio SMS Status Callback webhooks
 * - Verifies webhook signature using Twilio's validateRequest
 * - Processes SMS status updates (delivered, failed, undelivered, etc.)
 * - Updates communication logs in MongoDB
 *
 * Twilio Webhook Documentation:
 * https://www.twilio.com/docs/usage/webhooks/webhooks-connection-overrides
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
@ApiTags('Webhooks')
@Controller('public/communications/webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);
  private readonly authToken: string;
  private readonly webhookUrl: string;

  constructor(
    private readonly logsService: LogsService,
    private readonly config: ConfigService,
  ) {
    this.authToken = this.config.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.webhookUrl = this.config.get<string>('TWILIO_WEBHOOK_URL') || '';

    if (!this.authToken) {
      this.logger.warn('TWILIO_AUTH_TOKEN not configured - webhook signature verification disabled');
    }
    if (!this.webhookUrl) {
      this.logger.warn('TWILIO_WEBHOOK_URL not configured - using request URL for verification');
    }
  }

  /**
   * Handle Twilio SMS status callback
   *
   * Twilio sends POST requests to this endpoint when SMS status changes.
   * The body is application/x-www-form-urlencoded format.
   */
  @Post()
  @ApiOperation({
    summary: 'Handle Twilio SMS status callback',
    description: 'Receives and processes SMS status update notifications from Twilio',
  })
  @ApiResponse({ status: 200, description: 'Event processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Body() event: TwilioWebhookDto,
    @Req() request: Request,
    @Headers('x-twilio-signature') signature?: string,
  ) {
    this.logger.log(
      `Received Twilio event: MessageSid=${event.MessageSid}, Status=${event.MessageStatus}`,
    );

    // Verify signature if configured
    if (this.authToken && signature) {
      const url = this.webhookUrl || this.getFullUrl(request);
      const isValid = this.verifySignature(url, event, signature);

      if (!isValid) {
        this.logger.error('Invalid Twilio webhook signature');
        throw new InvalidWebhookSignatureException('Twilio');
      }
    }

    // Process the event
    await this.processEvent(event);

    return { received: true };
  }

  /**
   * Verify Twilio webhook signature
   *
   * Uses Twilio's validateRequest utility to verify the X-Twilio-Signature header
   * https://www.twilio.com/docs/usage/security#validating-requests
   */
  private verifySignature(
    url: string,
    params: any,
    signature: string,
  ): boolean {
    try {
      // Twilio.validateRequest validates the webhook signature
      return validateRequest(this.authToken, signature, url, params);
    } catch (error) {
      this.logger.error('Error verifying Twilio signature:', error);
      return false;
    }
  }

  /**
   * Get full URL from Express request
   */
  private getFullUrl(request: Request): string {
    const protocol = request.protocol;
    const host = request.get('host');
    const path = request.originalUrl;
    return `${protocol}://${host}${path}`;
  }

  /**
   * Process individual Twilio event
   */
  private async processEvent(event: TwilioWebhookDto): Promise<void> {
    try {
      // Map Twilio MessageStatus to CommunicationStatus
      const status = this.mapStatusToEnum(event.MessageStatus);

      if (!status) {
        this.logger.debug(`Skipping unmapped Twilio status: ${event.MessageStatus}`);
        return;
      }

      // Update log by provider message ID (MessageSid)
      await this.logsService.updateStatusByProviderMessageId(
        event.MessageSid,
        status,
        {
          messageStatus: event.MessageStatus,
          to: event.To,
          from: event.From,
          errorCode: event.ErrorCode,
          errorMessage: event.ErrorMessage,
          numSegments: event.NumSegments,
          price: event.Price,
          priceUnit: event.PriceUnit,
          accountSid: event.AccountSid,
          messagingServiceSid: event.MessagingServiceSid,
          dateSent: event.DateSent,
          dateUpdated: event.DateUpdated,
        },
      );

      this.logger.debug(
        `Updated communication log for MessageSid ${event.MessageSid} to status ${status} (Twilio status: ${event.MessageStatus})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process Twilio event for MessageSid ${event.MessageSid}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Map Twilio MessageStatus to CommunicationStatus
   */
  private mapStatusToEnum(status: string): CommunicationStatus | null {
    const statusMap: Record<string, CommunicationStatus> = {
      queued: CommunicationStatus.SENDING,
      sending: CommunicationStatus.SENDING,
      sent: CommunicationStatus.SENT,
      delivered: CommunicationStatus.DELIVERED,
      undelivered: CommunicationStatus.FAILED,
      failed: CommunicationStatus.FAILED,
      // receiving/received are for inbound messages - not applicable
    };

    return statusMap[status] || null;
  }
}

