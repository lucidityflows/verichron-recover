import { Controller, Post, Body, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@verichron/auth';
import { LogsService } from '../../../logs/logs.service';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES, EVENT_TOPICS, EVENT_SOURCES } from '@verichron/events';
import { EmailReplyReceivedDto } from '../../../events/event-dto/communications';

/**
 * SendGrid Inbound Parse Controller
 *
 * Handles inbound email replies from debtors via SendGrid Inbound Parse.
 * Marked as @Public() since SendGrid uses its own authentication, not JWT.
 *
 * SETUP REQUIRED:
 * 1. Configure SendGrid Inbound Parse Webhook pointing to this endpoint
 * 2. Set up MX records for inbound email domain
 * 3. Configure reply-to addresses in email templates to route through this system
 *
 * Documentation: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 */
@ApiTags('Webhooks')
@Public()
@Controller('webhooks/sendgrid/inbound')
export class SendGridInboundController {
  private readonly logger = new Logger(SendGridInboundController.name);

  constructor(
    private readonly logsService: LogsService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  @Post()
  @ApiExcludeEndpoint() // Exclude from public API docs - webhook only
  @ApiOperation({
    summary: 'Handle SendGrid inbound email webhook',
    description: 'Receives and processes inbound email replies from debtors via SendGrid Inbound Parse',
  })
  @ApiResponse({ status: 200, description: 'Email processed successfully' })
  async handleInboundEmail(@Body() payload: any) {
    this.logger.log('Received inbound email from SendGrid');

    try {
      // Extract email metadata from SendGrid Inbound Parse payload
      const {
        from,
        to,
        subject,
        text, // Plain text body
        html, // HTML body
        envelope, // SMTP envelope data
        headers, // Email headers (parsed JSON)
        attachments, // Number of attachments
      } = payload;

      if (!from || !to) {
        throw new BadRequestException('Missing required email fields (from, to)');
      }

      // Parse custom headers to find original communication logId
      // We should include a custom header like X-Verichron-Log-Id in outbound emails
      const parsedHeaders = headers ? JSON.parse(headers) : {};
      const logId = parsedHeaders['X-Verichron-Log-Id'] || null;

      if (!logId) {
        this.logger.warn('Received email reply without X-Verichron-Log-Id header', { from, to, subject });
        // Could implement fallback logic here to match by recipient address patterns
        return { received: true, warning: 'Could not match reply to original communication' };
      }

      // Look up the original communication log
      const originalLog = await this.logsService.findById(logId);
      if (!originalLog) {
        this.logger.error(`Original communication log ${logId} not found`);
        return { received: true, error: 'Original communication not found' };
      }

      // Publish email reply received event
      await this.eventPublisher.publish(
        EVENT_TYPES.COMMUNICATIONS_EMAIL_REPLY_RECEIVED,
        {
          logId: originalLog.id,
          organizationId: originalLog.organizationId,
          debtorId: originalLog.debtorId,
          repliedAt: new Date().toISOString(),
          subject: subject || '',
          replyContent: text || html || '',
          fromEmail: from,
          toEmail: to,
          providerMessageId: envelope ? JSON.parse(envelope).from : undefined,
        },
        EmailReplyReceivedDto,
      );

      this.logger.log(`Published email reply event for log ${logId} from ${from}`);

      return { received: true, processed: true };
    } catch (error: unknown) { // Explicitly type error as unknown
      this.logger.error('Failed to process inbound email:', error);
      // Return 200 anyway to prevent SendGrid retries for unrecoverable errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { received: true, error: errorMessage };
    }
  }
}
