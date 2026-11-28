import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../core/dto/pagination-query.dto';
import { OrganizationType, OrganizationStatus, SortOrder } from '@verichron/enums';
import { IOrganizationQuery } from '@verichron/contracts';

/**
 * Query DTO for filtering and searching organizations
 */
export class OrganizationQueryDto extends PaginationQueryDto implements IOrganizationQuery {
  @ApiProperty({
    description: 'Search term for name or display name (partial match)',
    required: false,
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by organization name (partial match)',
    required: false,
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Filter by organization type',
    enum: OrganizationType,
    enumName: 'OrganizationType',
    required: false,
    example: OrganizationType.COLLECTION_AGENCY,
  })
  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  @ApiProperty({
    description: 'Filter by organization status',
    enum: OrganizationStatus,
    enumName: 'OrganizationStatus',
    required: false,
    example: OrganizationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @ApiProperty({
    description: 'Filter by parent organization ID',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentOrganizationId?: string;

  @ApiProperty({
    description: 'Filter to show only top-level organizations (no parent)',
    required: false,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  topLevelOnly?: boolean;

  @ApiProperty({
    description: 'Field to sort by',
    required: false,
    enum: ['name', 'displayName', 'organizationType', 'status', 'createdAt', 'updatedAt'],
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'displayName', 'organizationType', 'status', 'createdAt', 'updatedAt'])
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    required: false,
    enum: SortOrder,
    enumName: 'SortOrder',
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
