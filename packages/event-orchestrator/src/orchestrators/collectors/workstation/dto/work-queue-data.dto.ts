import { IsString, IsUUID, IsOptional, IsObject, IsEnum, IsNumber, IsArray } from 'class-validator';

export class WorkQueueDataRequestedDto {
  @IsUUID()
  organizationId: string;

  @IsEnum(['getUnassignedItems'])
  action: 'getUnassignedItems';

  @IsObject()
  @IsOptional()
  filters?: {
    portfolioIds?: string[];
    balanceRange?: [number, number];
    accountAgeRange?: [number, number];
    priority?: string[];
    [key: string]: any;
  };

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  correlationId?: string;
}

export class WorkQueueDataResponseDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsObject()
  payload: {
    unassignedItems?: any[]; // Using any[] for simplicity as the item structure is complex and internal
  };

  @IsString()
  @IsOptional()
  error?: string;
}
