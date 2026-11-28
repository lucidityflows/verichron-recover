
import { LoginFailedPayload } from '@verichron/events';
import { LoginFailReason } from '@verichron/enums';
import { IsString, IsEmail, IsOptional, IsEnum, IsIP } from 'class-validator';

export class LoginFailedDto implements LoginFailedPayload {
  @IsEmail()
  email: string;

  @IsEnum(LoginFailReason)
  reason: LoginFailReason;

  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}
