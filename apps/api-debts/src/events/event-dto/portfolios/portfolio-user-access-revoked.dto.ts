import { PortfolioUserAccessRevokedPayload } from '@verichron/events';
import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class PortfolioUserAccessRevokedDto implements PortfolioUserAccessRevokedPayload {
  @IsUUID()
  portfolioId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  revokedBy?: string;

  @IsDateString()
  revokedAt: string;
}
