import { IsEnum, IsNumber, IsArray, ValidateNested, IsString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import type { IGeographicCreditorAnalytics, ICreditorGeographicStateData, ITopCreditor, ICoordinates } from '@verichron/contracts';
import { GeographicAnalyticsView, StateAbbreviation } from '@verichron/enums';

class CoordinatesDto implements ICoordinates {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

class TopCreditorDto implements ITopCreditor {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  debtValue: number;
}

class CreditorGeographicStateDataDto implements ICreditorGeographicStateData {
  @IsEnum(StateAbbreviation)
  stateCode: StateAbbreviation;

  @IsString()
  stateName: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: ICoordinates;

  @IsNumber()
  creditorCount: number;

  @IsNumber()
  totalDebtValue: number;

  @IsNumber()
  averageDebtValue: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopCreditorDto)
  topCreditors: ITopCreditor[];
}

/**
 * Geographic Creditor Analytics Response DTO
 * Implements IGeographicCreditorAnalytics from @verichron/contracts
 */
export class GeographicCreditorAnalyticsResponseDto implements IGeographicCreditorAnalytics {
  @IsEnum(GeographicAnalyticsView)
  type: GeographicAnalyticsView.CREDITORS;

  @IsNumber()
  totalCreditors: number;

  @IsNumber()
  totalDebtValue: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditorGeographicStateDataDto)
  states: CreditorGeographicStateDataDto[];
}
