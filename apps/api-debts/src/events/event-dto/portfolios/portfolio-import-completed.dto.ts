import { PortfolioImportCompletedPayload } from '@verichron/events';
import { IsUUID, IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class PortfolioImportCompletedDto implements PortfolioImportCompletedPayload {
  @IsUUID()
  portfolioId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  portfolioName: string;

  @IsNumber()
  debtsCreated: number;

  @IsString()
  totalPrincipal: string;

  @IsString()
  purchasePrice: string;

  @IsString()
  source: string;

  @IsString()
  parseMethod: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsUUID()
  importedBy: string;

  @IsDateString()
  importedAt: string;
}
