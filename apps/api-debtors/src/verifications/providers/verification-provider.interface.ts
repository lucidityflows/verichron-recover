// providers/verification-provider.interface.ts
import { VerificationResultDto } from '../dto/verification-result.dto';

/**
 * Interface for verification providers
 */
export interface IVerificationProvider {
  /**
   * Verify the provided data
   */
  verify(inputData: Record<string, any>): Promise<VerificationResultDto>;
  
  /**
   * Get provider name
   */
  getProviderName(): string;
  
  /**
   * Get typical cost in cents
   */
  getCost(): number;
}

