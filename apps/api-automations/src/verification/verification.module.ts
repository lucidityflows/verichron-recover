import { Module } from '@nestjs/common';
import { DebtVerificationService } from './debt-verification.service';

@Module({
  providers: [DebtVerificationService],
  exports: [DebtVerificationService],
})
export class VerificationModule {}
