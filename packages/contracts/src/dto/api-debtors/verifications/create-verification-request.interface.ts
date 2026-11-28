import { VerificationType } from '@verichron/enums';

export interface ICreateVerificationRequest {
  verificationType: VerificationType;
  inputData: Record<string, any>;
  metadata?: Record<string, any>;
}
