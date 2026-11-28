// providers/skip-trace.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { IVerificationProvider } from './verification-provider.interface';
import { VerificationResultDto } from '../dto/verification-result.dto';
import { InvalidVerificationInputException } from '../errors';

/**
 * Skip Trace Provider (Stub)
 * 
 * In production, this would integrate with:
 * - TLOxp
 * - IDI Data
 * - LexisNexis
 * - Accurint
 * 
 * For MVP/demo, this provides mock skip trace results.
 */
@Injectable()
export class SkipTraceProvider implements IVerificationProvider {
  private readonly logger = new Logger(SkipTraceProvider.name);

  getProviderName(): string {
    return 'TLOXP_STUB';
  }

  getCost(): number {
    return 50; // 50 cents per skip trace
  }

  async verify(inputData: Record<string, any>): Promise<VerificationResultDto> {
    this.logger.log('Skip trace requested (stub implementation)');

    // Validate input
    if (!inputData.firstName || !inputData.lastName) {
      throw new InvalidVerificationInputException(
        'SKIP_TRACE',
        'Missing firstName or lastName in input data'
      );
    }

    // Simulate longer API latency for skip trace
    await this.delay(1500);

    // Mock skip trace
    const found = Math.random() > 0.3; // 70% success rate

    return {
      success: true,
      verified: found,
      confidence: found ? 80 : 10,
      details: found ? {
        possibleAddresses: [
          {
            streetLine1: '456 New Street',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90001',
            lastSeen: '2024-01-15',
            confidence: 80,
          },
          {
            streetLine1: '789 Another Ave',
            city: 'San Diego',
            state: 'CA',
            postalCode: '92101',
            lastSeen: '2023-11-20',
            confidence: 60,
          },
        ],
        possiblePhones: [
          {
            phoneNumber: '+16195551234',
            type: 'mobile',
            lastSeen: '2024-01-10',
          },
        ],
        possibleEmails: [
          {
            email: 'john.doe@newprovider.com',
            lastSeen: '2024-01-05',
          },
        ],
        relatives: [
          { name: 'Jane Doe', relationship: 'Spouse' },
          { name: 'John Doe Sr', relationship: 'Parent' },
        ],
      } : {},
      provider: this.getProviderName(),
      costCents: this.getCost(),
      rawResponse: {
        recordsFound: found ? 2 : 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}