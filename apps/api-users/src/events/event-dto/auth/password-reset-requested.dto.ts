
import { PasswordResetRequestedPayload } from '@verichron/events';
import { IsString, IsEmail, IsUUID, IsDateString, IsIP } from 'class-validator';

export class PasswordResetRequestedDto implements PasswordResetRequestedPayload {
  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  resetToken: string;

  @IsDateString()
  resetTokenExpiresAt: string;

  @IsIP()
  ipAddress: string;
}
