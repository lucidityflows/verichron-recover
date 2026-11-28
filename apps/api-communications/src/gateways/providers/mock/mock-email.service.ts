import { Injectable, Logger } from '@nestjs/common';
import {
  IEmailGateway,
  EmailPayload,
  EmailGatewayResponse,
} from '@verichron/contracts';

/**
 * Mock Email Service
 *
 * Used for testing and development.
 * Logs email payloads instead of actually sending them.
 */
@Injectable()
export class MockEmailService implements IEmailGateway {
  private readonly logger = new Logger(MockEmailService.name);

  async send(payload: EmailPayload): Promise<EmailGatewayResponse> {
    this.logger.log('=== MOCK EMAIL ===');
    this.logger.log(`To: ${payload.to}`);
    this.logger.log(`From: ${payload.from}`);
    this.logger.log(`Subject: ${payload.subject}`);
    this.logger.log(`HTML: ${payload.html.substring(0, 100)}...`);
    this.logger.log('==================');

    return {
      success: true,
      messageId: `mock-email-${Date.now()}`,
    };
  }
}
