
import { LoginSuccessPayload } from '@verichron/events';
import { LoginMethod } from '@verichron/enums';
import { IsString, IsEmail, IsUUID, IsOptional, IsEnum, IsIP } from 'class-validator';

export class LoginSuccessDto implements LoginSuccessPayload {
  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsEnum(LoginMethod)
  loginMethod: LoginMethod;

  @IsIP()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}
