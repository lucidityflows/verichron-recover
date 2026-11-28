// src/rbac/dto/permissions/list-permissions.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionResponseDto } from './permission-response.dto';
import { 
  IListPermissionsQuery, 
  IPaginatedPermissionsResponse, 
  IPermissionsByResource 
} from '@verichron/contracts';

export class ListPermissionsQueryDto implements IListPermissionsQuery {
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
    example: 'debt',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter by action',
    example: 'read',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Search by permission code or description',
    example: 'debt',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PaginatedPermissionsResponseDto implements IPaginatedPermissionsResponse {
  @ApiProperty({
    description: 'Array of permissions',
    type: [PermissionResponseDto],
  })
  data: PermissionResponseDto[];

  @ApiProperty({
    description: 'Total number of permissions',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 50,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages: number;
}

export class PermissionsByResourceDto implements IPermissionsByResource {
  @ApiProperty({
    description: 'The resource name',
    example: 'debt',
  })
  resource: string;

  @ApiProperty({
    description: 'Permissions for this resource',
    type: [PermissionResponseDto],
  })
  permissions: PermissionResponseDto[];
}