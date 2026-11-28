import { IsEnum, IsNumber, IsArray, ValidateNested, IsString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import type { IGeographicDebtorAnalytics, IDebtorGeographicStateData, ICoordinates } from '@verichron/contracts';
import { GeographicAnalyticsView, StateAbbreviation } from '@verichron/enums';

class CoordinatesDto implements ICoordinates {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

class DebtorGeographicStateDataDto implements IDebtorGeographicStateData {
  @IsEnum(StateAbbreviation)
  stateCode: StateAbbreviation;

  @IsString()
  stateName: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: ICoordinates;

  @IsNumber()
  debtorCount: number;

  @IsNumber()
  totalDebtValue: number;

  @IsNumber()
  averageDebtValue: number;

  @IsNumber()
  activeDebts: number;

  @IsNumber()
  paidDebts: number;

  @IsNumber()
  defaultedDebts: number;

  @IsNumber()
  recoveryRate: number;
}

/**
 * Geographic Debtor Analytics Response DTO
 * Implements IGeographicDebtorAnalytics from @verichron/contracts
 */
export class GeographicDebtorAnalyticsResponseDto implements IGeographicDebtorAnalytics {
  @IsEnum(GeographicAnalyticsView)
  type: GeographicAnalyticsView.DEBTORS;

  @IsNumber()
  totalDebtors: number;

  @IsNumber()
  totalDebtValue: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtorGeographicStateDataDto)
  states: DebtorGeographicStateDataDto[];
}
