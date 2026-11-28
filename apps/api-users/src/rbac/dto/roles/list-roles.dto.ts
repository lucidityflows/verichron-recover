// src/rbac/dto/roles/list-roles.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RoleResponseDto } from './role-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IListRolesQuery, IPaginatedRolesResponse } from '@verichron/contracts';

export class ListRolesQueryDto implements IListRolesQuery {
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
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Search by role name',
    example: 'manager',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter to show only system roles',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isSystemRole?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by permission ID - returns roles that have this permission',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  permissionId?: string;
}

export class PaginatedRolesResponseDto implements IPaginatedRolesResponse {
  @ApiProperty({
    description: 'Array of roles',
    type: [RoleResponseDto],
  })
  data: RoleResponseDto[];

  @ApiProperty({
    description: 'Total number of roles matching the filters',
    example: 15,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 1,
  })
  totalPages: number;
}