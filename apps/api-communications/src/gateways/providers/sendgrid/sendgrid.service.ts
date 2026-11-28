import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import {
  IEmailGateway,
  EmailPayload,
  EmailGatewayResponse,
} from '@verichron/contracts';

/**
 * SendGrid Email Gateway Service
 *
 * Handles email dispatch via SendGrid API
 * - Sends transactional emails
 * - Tracks message IDs for webhook correlation
 * - Maps SendGrid responses to standard format
 */
@Injectable()
export class SendGridService implements IEmailGateway {
  private readonly logger = new Logger(SendGridService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'SENDGRID_API_KEY not configured - email sending will fail',
      );
    } else {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid client initialized');
    }
  }

  /**
   * Check SendGrid configuration
   */
  async checkHealth(): Promise<{ status: string; error?: string }> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      return { status: 'failed', error: 'SENDGRID_API_KEY not configured' };
    }
    return { status: 'active' };
  }

  async send(payload: EmailPayload): Promise<EmailGatewayResponse> {
    try {
      this.logger.log(`Sending email via SendGrid to ${payload.to}`);

      const [response] = await sgMail.send({
        to: payload.to,
        from: payload.from,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo,
        customArgs: payload.customArgs,
      });

      const messageId = response.headers['x-message-id'] as string;

      this.logger.log(
        `Email sent successfully via SendGrid. Message ID: ${messageId}`,
      );

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email via SendGrid: ${errorMessage}`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}