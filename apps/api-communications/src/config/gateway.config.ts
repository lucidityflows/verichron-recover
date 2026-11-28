import { registerAs } from '@nestjs/config';

/**
 * Gateway Configuration
 *
 * Configures third-party communication providers (SendGrid, Twilio).
 * Supports mock providers for testing via feature flags.
 */
export default registerAs('gateway', () => ({
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@verichroninc.com',
      fromName: process.env.EMAIL_BRAND_COMPANY_NAME || 'Verichron Inc',
      webhookUrl: process.env.SENDGRID_WEBHOOK_URL || '',
      webhookPublicKey: process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || '',
    },
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.SMS_FROM_NUMBER || '',
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || '',
    },
  },
  mock: {
    enabled: process.env.NODE_ENV === 'test' || process.env.USE_MOCK_GATEWAYS === 'true',
    simulateFailures: process.env.MOCK_SIMULATE_FAILURES === 'true',
    deliveryDelayMs: parseInt(process.env.MOCK_DELIVERY_DELAY_MS || '1000', 10),
  },
}));
