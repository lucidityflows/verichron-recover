// providers/phone-verification.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { IVerificationProvider } from './verification-provider.interface';
import { VerificationResultDto } from '../dto/verification-result.dto';
import { InvalidVerificationInputException } from '../errors';

/**
 * Phone Verification Provider (Stub)
 * 
 * In production, this would integrate with:
 * - Twilio Lookup API
 * - Telesign
 * - Neustar
 * 
 * For MVP/demo, this provides mock verification results.
 */
@Injectable()
export class PhoneVerificationProvider implements IVerificationProvider {
  private readonly logger = new Logger(PhoneVerificationProvider.name);

  getProviderName(): string {
    return 'TWILIO_LOOKUP_STUB';
  }

  getCost(): number {
    return 1; // 1 cent per lookup
  }

  async verify(inputData: Record<string, any>): Promise<VerificationResultDto> {
    this.logger.log('Phone verification requested (stub implementation)');

    // Validate input
    if (!inputData.phoneNumber) {
      throw new InvalidVerificationInputException(
        'PHONE_VERIFICATION',
        'Missing phoneNumber field in input data'
      );
    }

    const { phoneNumber } = inputData;

    // Validate E.164 format
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new InvalidVerificationInputException(
        'PHONE_VERIFICATION',
        'Phone number must be in E.164 format (e.g., +14155552671)'
      );
    }

    // Simulate API latency
    await this.delay(300);

    // Mock verification
    const isValid = this.mockPhoneValidation(phoneNumber);

    return {
      success: true,
      verified: isValid,
      confidence: isValid ? 90 : 30,
      details: {
        phoneNumber: phoneNumber,
        nationalFormat: this.formatNational(phoneNumber),
        carrier: isValid ? 'Verizon Wireless' : 'Unknown',
        lineType: isValid ? 'mobile' : 'unknown',
        countryCode: phoneNumber.substring(1, 2),
      },
      provider: this.getProviderName(),
      costCents: this.getCost(),
      rawResponse: {
        callerName: null,
        carrierType: isValid ? 'mobile' : 'unknown',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private mockPhoneValidation(phone: string): boolean {
    // Simple mock: US numbers (starting with +1) are valid
    return phone.startsWith('+1') && phone.length === 12;
  }

  private formatNational(phone: string): string {
    if (phone.startsWith('+1')) {
      const digits = phone.substring(2);
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    return phone;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
