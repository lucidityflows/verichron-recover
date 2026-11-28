import { PortfolioUpdatedPayload } from '@verichron/events';
import { PortfolioStatus } from '@verichron/enums';
import { IsUUID, IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class PortfolioUpdatedDto implements PortfolioUpdatedPayload {
  @IsUUID()
  portfolioId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  updatedBy: string;

  @IsDateString()
  updatedAt: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  purchasePrice?: string;

  @IsString()
  @IsOptional()
  totalPrincipal?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsEnum(PortfolioStatus)
  @IsOptional()
  status?: PortfolioStatus;
}
