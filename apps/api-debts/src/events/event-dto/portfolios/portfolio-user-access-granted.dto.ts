import { PortfolioUserAccessGrantedPayload } from '@verichron/events';
import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class PortfolioUserAccessGrantedDto implements PortfolioUserAccessGrantedPayload {
  @IsUUID()
  portfolioId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  @IsOptional()
  grantedBy?: string;

  @IsDateString()
  grantedAt: string;
}
