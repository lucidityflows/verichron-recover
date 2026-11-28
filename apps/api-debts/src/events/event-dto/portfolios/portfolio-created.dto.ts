import { PortfolioCreatedPayload } from '@verichron/events';
import { PortfolioStatus } from '@verichron/enums';
import { IsUUID, IsString, IsEnum, IsDateString } from 'class-validator';

export class PortfolioCreatedDto implements PortfolioCreatedPayload {
  @IsUUID()
  portfolioId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  name: string;

  @IsEnum(PortfolioStatus)
  status: PortfolioStatus;

  @IsDateString()
  purchaseDate: string;

  @IsString()
  purchasePrice: string;

  @IsString()
  totalPrincipal: string;

  @IsString()
  source: string;

  @IsUUID()
  createdBy: string;

  @IsDateString()
  createdAt: string;
}
