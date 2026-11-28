export interface IVerificationResult {
  success: boolean;
  verified: boolean;
  confidence: number;
  details: Record<string, any>;
  provider: string;
  costCents: number;
  rawResponse?: Record<string, any>;
  errorMessage?: string;
  errorCode?: string;
}
