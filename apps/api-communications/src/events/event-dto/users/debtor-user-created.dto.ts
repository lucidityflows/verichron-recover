import { IsString, IsNotEmpty, IsUUID, IsEmail, IsEnum, IsBoolean, IsISO8601 } from 'class-validator';
import type { DebtorUserCreatedPayload } from '@verichron/events';
import { UserStatus } from '@verichron/enums/dist';

export class DebtorUserCreatedDto implements DebtorUserCreatedPayload {

  @IsString()
  @IsNotEmpty()
  debtorProfileId: string;
  
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;

  @IsBoolean()
  @IsNotEmpty()
  isNewUser: boolean;

  @IsISO8601()
  @IsNotEmpty()
  createdAt: string;
  
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;
}
