import { Controller, Post, Body, Headers, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { LogsService } from '../../../logs/logs.service';
import { EventPublisher } from '@verichron/event-publisher';
import { InvalidWebhookSignatureException } from '../../errors/invalid-webhook-signature.exception';
import { CallbackRequestSource } from '@verichron/enums';
import { EVENT_TYPES, EVENT_TOPICS, EVENT_SOURCES } from '@verichron/events';
import { SmsReplyReceivedDto, CallbackRequestedDto } from '../../../events/event-dto/communications';
import { validateRequest } from 'twilio';

/**
 * Twilio Inbound SMS Controller
 *
 * Handles inbound SMS messages from debtors via Twilio.
 *
 * SETUP REQUIRED:
 * 1. Configure Twilio phone number to send inbound SMS webhooks to this endpoint
 * 2. In Twilio Console: Phone Numbers → Select Number → Messaging → Webhook URL
 * 3. Ensure outbound SMS includes custom parameters to link replies to original messages
 *
 * Documentation:
 * - https://www.twilio.com/docs/sms/tutorials/how-to-receive-and-reply
 * - https://www.twilio.com/docs/usage/webhooks/sms-webhooks
 */
@ApiTags('Webhooks')
@Controller('webhooks/twilio/inbound')
export class TwilioInboundController {
  private readonly logger = new Logger(TwilioInboundController.name);
  private readonly authToken: string;
  private readonly webhookUrl: string;

  // Callback request keywords that trigger CALLBACK_REQUESTED event
  private readonly CALLBACK_KEYWORDS = ['callback', 'call me', 'call back', 'please call'];

  constructor(
    private readonly logsService: LogsService,
    private readonly eventPublisher: EventPublisher,
    private readonly config: ConfigService,
  ) {
    this.authToken = this.config.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.webhookUrl = this.config.get<string>('TWILIO_INBOUND_WEBHOOK_URL') || '';

    if (!this.authToken) {
      this.logger.warn('TWILIO_AUTH_TOKEN not configured - webhook signature verification disabled');
    }
    if (!this.webhookUrl) {
      this.logger.warn('TWILIO_INBOUND_WEBHOOK_URL not configured - using request URL for verification');
    }
  }

  /**
   * Handle Twilio inbound SMS webhook
   *
   * Twilio sends POST requests with application/x-www-form-urlencoded data
   */
  @Post()
  @ApiExcludeEndpoint() // Exclude from public API docs - webhook only
  @ApiOperation({
    summary: 'Handle Twilio inbound SMS webhook',
    description: 'Receives and processes inbound SMS replies from debtors via Twilio',
  })
  @ApiResponse({ status: 200, description: 'SMS processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handleInboundSms(
    @Body() payload: any,
    @Req() request: Request,
    @Headers('x-twilio-signature') signature?: string,
  ) {
    this.logger.log(`Received inbound SMS from ${payload.From} to ${payload.To}`);

    // Verify signature if configured
    if (this.authToken && signature) {
      const url = this.webhookUrl || this.getFullUrl(request);
      const isValid = this.verifySignature(url, payload, signature);

      if (!isValid) {
        this.logger.error('Invalid Twilio inbound SMS webhook signature');
        throw new InvalidWebhookSignatureException('Twilio');
      }
    }

        try {

          const {

            MessageSid, // Unique ID for this inbound message

            From, // Debtor's phone number (E.164 format)

            To, // Our Twilio phone number

            Body, // Message content

            NumMedia, // Number of media attachments

            MediaUrl0, // First media URL (if any)

            // Additional media: MediaUrl1, MediaUrl1, etc.

          } = payload;

    

          // Extract media URLs if present

          const mediaUrls: string[] = [];

          if (NumMedia && parseInt(NumMedia) > 0) {

            for (let i = 0; i < parseInt(NumMedia); i++) {

              const mediaUrl = payload[`MediaUrl${i}`];

              if (mediaUrl) {

                mediaUrls.push(mediaUrl);

              }

            }

          }

    

          // Try to find the original outbound message this is replying to

          // We need to store custom parameters in outbound SMS (e.g., logId in StatusCallback URL)

          // For now, we'll try to find recent outbound messages to this debtor

          const originalLog = await this.findOriginalLog(From, To);

    

          if (!originalLog) {

            this.logger.warn('Received SMS reply but could not match to original communication', { From, To });

            // Could still process the message but won't have context

            return { received: true, warning: 'Could not match reply to original communication' };

          }

    

          // Check if message contains callback request keywords

          const isCallbackRequest = this.containsCallbackKeywords(Body);

    

          if (isCallbackRequest) {

            // Publish callback requested event

            await this.publishCallbackRequest(originalLog, From, To, Body);

          } else {

            // Publish SMS reply received event

            await this.publishSmsReply(originalLog, From, To, Body, MessageSid, mediaUrls);

          }

    

          this.logger.log(`Processed inbound SMS from ${From}`);

    

          // Twilio expects TwiML response for SMS replies

          // Return empty response to acknowledge receipt without replying

          return { received: true, processed: true };

        } catch (error: unknown) { // Explicitly type error as unknown

          this.logger.error('Failed to process inbound SMS:', error);

          // Return 200 anyway to prevent Twilio retries for unrecoverable errors

          const errorMessage = error instanceof Error ? error.message : String(error);

          return { received: true, error: errorMessage };

        }

      }

  /**
   * Verify Twilio webhook signature
   */
  private verifySignature(url: string, params: any, signature: string): boolean {
    try {
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
   * Find the original outbound communication log
   * This attempts to match the inbound message to a previous outbound message
   */
  private async findOriginalLog(from: string, to: string): Promise<any | null> {
    try {
      // Look for recent outbound SMS to this debtor's phone number
      // TODO: Implement more robust matching logic
      // Options:
      // 1. Store custom parameters in outbound SMS StatusCallback URL
      // 2. Use conversation threading by phone number and time window
      // 3. Match based on recent messages within last 24-48 hours

      // For now, this is a placeholder - actual implementation would query logsService
      return null;
    } catch (error) {
      this.logger.error('Error finding original log:', error);
      return null;
    }
  }

  /**
   * Check if message contains callback request keywords
   */
  private containsCallbackKeywords(messageBody: string): boolean {
    if (!messageBody) return false;

    const lowerBody = messageBody.toLowerCase();
    return this.CALLBACK_KEYWORDS.some(keyword => lowerBody.includes(keyword));
  }

  /**
   * Publish SMS reply received event
   */
  private async publishSmsReply(
    originalLog: any,
    from: string,
    to: string,
    body: string,
    messageSid: string,
    mediaUrls: string[],
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.COMMUNICATIONS_SMS_REPLY_RECEIVED,
      {
        logId: originalLog.id,
        organizationId: originalLog.organizationId,
        debtorId: originalLog.debtorId,
        repliedAt: new Date().toISOString(),
        replyContent: body,
        fromPhone: from,
        toPhone: to,
        providerMessageId: messageSid,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      },
      SmsReplyReceivedDto,
    );

    this.logger.log(`Published SMS reply event for log ${originalLog.id} from ${from}`);
  }

  /**
   * Publish callback requested event
   */
  private async publishCallbackRequest(
    originalLog: any,
    from: string,
    to: string,
    body: string,
  ): Promise<void> {
    await this.eventPublisher.publish(
      EVENT_TYPES.COMMUNICATIONS_CALLBACK_REQUESTED,
      {
        logId: originalLog.id,
        organizationId: originalLog.organizationId,
        debtorId: originalLog.debtorId,
        requestedAt: new Date().toISOString(),
        requestSource: CallbackRequestSource.SMS_REPLY,
        callbackPhone: from,
        callbackReason: body,
        urgency: undefined, // Could be inferred from message content or set by business rules
        metadata: {
          originalTo: to,
          messageBody: body,
        },
      },
      CallbackRequestedDto,
    );

    this.logger.log(`Published callback request event for log ${originalLog.id} from ${from}`);
  }
}
