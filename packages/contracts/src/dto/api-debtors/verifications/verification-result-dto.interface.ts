// verification-result.dto.ts (internal use)
/**
 * Internal DTO for verification results from providers
 */
export interface VerificationResultDto {
  /** Whether the verification was successful */
  success: boolean;
  
  /** Whether the data was verified */
  verified: boolean;
  
  /** Confidence score 0-100 */
  confidence: number;
  
  /** Provider-specific details */
  details: Record<string, any>;
  
  /** Raw response from provider */
  rawResponse?: any;
  
  /** Provider name */
  provider: string;
  
  /** Cost in cents */
  costCents?: number;
  
  /** Error message if failed */
  errorMessage?: string;
  
  /** Error code if failed */
  errorCode?: string;
}