import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import {
  ISmsGateway,
  SmsPayload,
  SmsGatewayResponse,
} from '@verichron/contracts';

/**
 * Twilio SMS Gateway Service
 *
 * Handles SMS dispatch via Twilio API
 * - Sends SMS messages
 * - Tracks message SIDs for webhook correlation
 * - Maps Twilio responses to standard format
 */
@Injectable()
export class TwilioService implements ISmsGateway {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: Twilio | null = null;
  private readonly defaultFromNumber: string;

  constructor(private readonly config: ConfigService) {
    const accountSid = config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = config.get<string>('TWILIO_AUTH_TOKEN');
    this.defaultFromNumber = config.get<string>('SMS_FROM_NUMBER') || '';

    if (!accountSid || !authToken) {
      this.logger.warn(
        'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured - SMS sending will fail',
      );
    } else {
      if (accountSid.startsWith('AC')) {
        // Standard Account SID authentication
        this.client = new Twilio(accountSid, authToken);
      } else if (accountSid.startsWith('SK')) {
        // API Key authentication
        // When using API Keys (SK...), the first argument is the API Key SID,
        // the second is the API Secret, and the 'accountSid' option must
        // contain the *main* Account SID (AC...).
        // Assuming TWILIO_MASTER_ACCOUNT_SID holds the main Account SID.
        const masterAccountSid = config.get<string>(
          'TWILIO_MASTER_ACCOUNT_SID',
        );
        if (!masterAccountSid || !masterAccountSid.startsWith('AC')) {
          this.logger.error(
            'TWILIO_MASTER_ACCOUNT_SID (main Account SID) is required and must start with AC when TWILIO_ACCOUNT_SID is an API Key SID (SK...)',
          );
          // Exit gracefully, client remains null, send method will handle.
          return;
        }
        this.client = new Twilio(accountSid, authToken, {
          accountSid: masterAccountSid,
        });
      } else {
        this.logger.error(
          'TWILIO_ACCOUNT_SID must start with AC (Account SID) or SK (API Key SID)',
        );
        return;
      }
      this.logger.log('Twilio client initialized');
    }

    if (!this.defaultFromNumber) {
      this.logger.warn(
        'SMS_FROM_NUMBER not configured - must provide from number in payload',
      );
    }
  }

  /**
   * Check Twilio connectivity and credentials
   */
  async checkHealth(): Promise<{ status: string; error?: string }> {
    if (!this.client) {
      return { status: 'failed', error: 'Twilio client not initialized' };
    }

    try {
      // Fetch account details to verify credentials
      await this.client.api.v2010.accounts(this.client.accountSid).fetch();
      return { status: 'active' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Twilio health check failed: ${errorMessage}`);
      return { status: 'failed', error: errorMessage };
    }
  }

  async send(payload: SmsPayload): Promise<SmsGatewayResponse> {
    if (!this.client) {
      const error =
        'Twilio client not initialized - check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN';
      this.logger.error(error);
      return {
        success: false,
        error,
      };
    }

    try {
      const fromNumber = payload.from || this.defaultFromNumber;

      if (!fromNumber) {
        throw new Error(
          'No from number specified and SMS_FROM_NUMBER not configured',
        );
      }

      this.logger.log(`Sending SMS via Twilio to ${payload.to}`);

      const message = await this.client.messages.create({
        to: payload.to,
        from: fromNumber,
        body: payload.body,
      });

      this.logger.log(
        `SMS sent successfully via Twilio. Message SID: ${message.sid}`,
      );

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send SMS via Twilio: ${errorMessage}`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
