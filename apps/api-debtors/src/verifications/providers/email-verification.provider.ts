// providers/email-verification.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { IVerificationProvider } from './verification-provider.interface';
import { VerificationResultDto } from '../dto/verification-result.dto';
import { InvalidVerificationInputException } from '../errors';

/**
 * Email Verification Provider (Stub)
 * 
 * In production, this would integrate with:
 * - ZeroBounce
 * - NeverBounce
 * - SendGrid Email Validation API
 * 
 * For MVP/demo, this provides mock verification results.
 */
@Injectable()
export class EmailVerificationProvider implements IVerificationProvider {
  private readonly logger = new Logger(EmailVerificationProvider.name);

  getProviderName(): string {
    return 'ZEROBOUNCE_STUB';
  }

  getCost(): number {
    return 1; // 1 cent per verification
  }

  async verify(inputData: Record<string, any>): Promise<VerificationResultDto> {
    this.logger.log('Email verification requested (stub implementation)');

    // Validate input
    if (!inputData.email) {
      throw new InvalidVerificationInputException(
        'EMAIL_VERIFICATION',
        'Missing email field in input data'
      );
    }

    const { email } = inputData;

    // Basic email format validation
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new InvalidVerificationInputException(
        'EMAIL_VERIFICATION',
        'Invalid email format'
      );
    }

    // Simulate API latency
    await this.delay(400);

    // Mock verification
    const isValid = this.mockEmailValidation(email);

    return {
      success: true,
      verified: isValid,
      confidence: isValid ? 85 : 20,
      details: {
        email: email.toLowerCase(),
        status: isValid ? 'valid' : 'invalid',
        subStatus: isValid ? 'none' : 'mailbox_not_found',
        freeProvider: this.isFreeProvider(email),
        disposable: false,
        toxicity: 'low',
        smtpProvider: this.extractDomain(email),
      },
      provider: this.getProviderName(),
      costCents: this.getCost(),
      rawResponse: {
        catchAll: false,
        didYouMean: null,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private mockEmailValidation(email: string): boolean {
    // Simple mock: emails from known domains are valid
    const validDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    const domain = this.extractDomain(email);
    return validDomains.includes(domain);
  }

  private extractDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() || '';
  }

  private isFreeProvider(email: string): boolean {
    const freeDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    return freeDomains.includes(this.extractDomain(email));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}