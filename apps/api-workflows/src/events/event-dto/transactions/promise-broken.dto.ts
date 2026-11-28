import { PromiseBrokenPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsNumber, IsDateString } from 'class-validator';

export class PromiseBrokenDto implements PromiseBrokenPayload {
  @IsUUID()
  @IsNotEmpty()
  promiseId: string;

  @IsUUID()
  @IsNotEmpty()
  debtId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsDateString()
  @IsNotEmpty()
  promiseDate: string;

  @IsNumber()
  @IsNotEmpty()
  promisedAmount: number;

  @IsDateString()
  @IsNotEmpty()
  brokenAt: string;
}
