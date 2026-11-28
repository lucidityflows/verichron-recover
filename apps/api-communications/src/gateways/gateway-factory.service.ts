import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendGridService } from './providers/sendgrid/sendgrid.service';
import { TwilioService } from './providers/twilio/twilio.service';
import { MockEmailService } from './providers/mock/mock-email.service';
import { IEmailGateway, ISmsGateway } from '@verichron/contracts/dist';
import { MockSmsService } from './providers/mock/mock-sms.service';

@Injectable()
export class GatewayFactoryService {
  constructor(
    private readonly sendgridService: SendGridService,
    private readonly twilioService: TwilioService,
    private readonly config: ConfigService,
  ) {}

  getEmailGateway(): IEmailGateway {
    const useMock = this.config.get<string>('USE_MOCK_GATEWAYS') === 'true';
    if (useMock) {
      return new MockEmailService();
    }

    const provider = this.config.get<string>('EMAIL_PROVIDER') || 'sendgrid';
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');

    // Auto-fallback to mock if no API key configured
    if (provider === 'sendgrid' && !apiKey) {
      return new MockEmailService();
    }

    switch (provider) {
      case 'sendgrid':
        return this.sendgridService;
      case 'mock':
        return new MockEmailService();
      default:
        throw new Error(`Unknown email provider: ${provider}`);
    }
  }

  getSmsGateway(): ISmsGateway {
    const useMock = this.config.get<string>('USE_MOCK_GATEWAYS') === 'true';
    if (useMock) {
      return new MockSmsService();
    }

    const provider = this.config.get<string>('SMS_PROVIDER') || 'twilio';
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');

    // Auto-fallback to mock if no Twilio credentials configured
    if (provider === 'twilio' && (!accountSid || !authToken)) {
      return new MockSmsService();
    }

    switch (provider) {
      case 'twilio':
        return this.twilioService;
      case 'mock':
        return new MockSmsService();
      default:
        throw new Error(`Unknown SMS provider: ${provider}`);
    }
  }

  /**
   * Get consolidated health status for all enabled gateways
   */
  async getGatewayHealths(): Promise<Record<string, { status: string; mode: string; error?: string }>> {
    const isMock = this.config.get<string>('USE_MOCK_GATEWAYS') === 'true';

    const [emailHealth, smsHealth] = await Promise.all([
      isMock ? { status: 'active', error: undefined } : this.sendgridService.checkHealth(),
      isMock ? { status: 'active', error: undefined } : this.twilioService.checkHealth(),
    ]);

    return {
      email: {
        status: emailHealth.status,
        mode: isMock ? 'mock' : 'sendgrid',
        error: emailHealth.error,
      },
      sms: {
        status: smsHealth.status,
        mode: isMock ? 'mock' : 'twilio',
        error: smsHealth.error,
      },
    };
  }
}