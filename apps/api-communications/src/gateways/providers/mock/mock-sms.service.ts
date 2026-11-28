import { Injectable, Logger } from '@nestjs/common';
import {
  ISmsGateway,
  SmsPayload,
  SmsGatewayResponse,
} from '@verichron/contracts';

/**
 * Mock SMS Service
 *
 * Used for testing and development.
 * Logs SMS payloads instead of actually sending them.
 */
@Injectable()
export class MockSmsService implements ISmsGateway {
  private readonly logger = new Logger(MockSmsService.name);

  async send(payload: SmsPayload): Promise<SmsGatewayResponse> {
    this.logger.log('=== MOCK SMS ===');
    this.logger.log(`To: ${payload.to}`);
    this.logger.log(`From: ${payload.from || 'N/A'}`);
    this.logger.log(`Body: ${payload.body}`);
    this.logger.log('================');

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
    };
  }
}
