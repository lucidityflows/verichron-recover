import { IsString, IsNotEmpty, IsUUID, IsEmail, IsISO8601 } from 'class-validator';
import type { PasswordResetRequestedPayload } from '@verichron/events';

export class PasswordResetRequestedDto implements PasswordResetRequestedPayload {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @IsISO8601()
  @IsNotEmpty()
  resetTokenExpiresAt: string;

  @IsString()
  ipAddress: string;
}
