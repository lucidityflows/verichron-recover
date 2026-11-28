// providers/address-verification.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { IVerificationProvider } from './verification-provider.interface';
import { VerificationResultDto } from '../dto/verification-result.dto';
import { InvalidVerificationInputException } from '../errors';

/**
 * Address Verification Provider (Stub)
 * 
 * In production, this would integrate with:
 * - USPS Address Validation API
 * - Google Maps Geocoding API
 * - Melissa Data
 * - Smarty Streets
 * 
 * For MVP/demo, this provides mock verification results.
 */
@Injectable()
export class AddressVerificationProvider implements IVerificationProvider {
  private readonly logger = new Logger(AddressVerificationProvider.name);

  getProviderName(): string {
    return 'USPS_STUB';
  }

  getCost(): number {
    return 5; // 5 cents per verification
  }

  async verify(inputData: Record<string, any>): Promise<VerificationResultDto> {
    this.logger.log('Address verification requested (stub implementation)');

    // Validate input
    if (!inputData.address) {
      throw new InvalidVerificationInputException(
        'ADDRESS_VERIFICATION',
        'Missing address field in input data'
      );
    }

    const { address } = inputData;

    if (!address.streetLine1 || !address.city || !address.state || !address.postalCode) {
      throw new InvalidVerificationInputException(
        'ADDRESS_VERIFICATION',
        'Address must include streetLine1, city, state, and postalCode'
      );
    }

    // Simulate API latency
    await this.delay(500);

    // Mock verification logic
    const isValid = this.mockAddressValidation(address);

    return {
      success: true,
      verified: isValid,
      confidence: isValid ? 95 : 40,
      details: {
        standardizedAddress: isValid ? {
          streetLine1: address.streetLine1.toUpperCase(),
          streetLine2: address.streetLine2?.toUpperCase() || null,
          city: address.city.toUpperCase(),
          state: address.state.toUpperCase(),
          postalCode: this.formatPostalCode(address.postalCode),
          plus4: '1234', // Mock ZIP+4
        } : null,
        deliverability: isValid ? 'DELIVERABLE' : 'UNDELIVERABLE',
        residentialIndicator: true,
      },
      provider: this.getProviderName(),
      costCents: this.getCost(),
      rawResponse: {
        // Mock USPS API response
        returnText: isValid ? 'Address Found' : 'Address Not Found',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private mockAddressValidation(address: any): boolean {
    // Simple mock logic: addresses with street number are valid
    const hasStreetNumber = /^\d+/.test(address.streetLine1);
    return hasStreetNumber && address.postalCode.length === 5;
  }

  private formatPostalCode(zip: string): string {
    return zip.replace(/[^0-9]/g, '').slice(0, 5);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
