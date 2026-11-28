import { IsString, IsUUID, IsArray, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CollectorsDataRequestedDto {
  @IsUUID()
  organizationId: string;

  @IsEnum(['getCollectorWorkload', 'getCollectorSkills', 'getCollectorTerritories'])
  action: 'getCollectorWorkload' | 'getCollectorSkills' | 'getCollectorTerritories';

  @IsArray()
  @IsString({ each: true })
  collectorIds: string[];

  @IsString()
  @IsOptional()
  correlationId?: string;
}

export class CollectorsDataResponseDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsObject()
  payload: {
    workload?: Record<string, number>;
    skills?: Record<string, string[]>;
    territories?: Record<string, { states?: string[]; zipcodes?: string[] }>;
  };

  @IsString()
  @IsOptional()
  error?: string;
}
