import { TokenIssuanceMethod, TokenType } from '@verichron/enums';
import { TokenIssuedPayload } from '@verichron/events';
import { IsUUID, IsOptional, IsEnum, IsIP, IsDateString } from 'class-validator';

export class TokenIssuedDto implements TokenIssuedPayload {
  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  organizationId: string | null;

  @IsEnum(TokenType)
  tokenType: TokenType;

  @IsDateString()
  expiresAt: string;

  @IsEnum(TokenIssuanceMethod)
  issuanceMethod: TokenIssuanceMethod;

  @IsIP()
  @IsOptional()
  ipAddress?: string;
}