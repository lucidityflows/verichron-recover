import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder } from '@verichron/enums';

/**
 * DTO for sort configuration
 */
export class SortConfigDto {
  @ApiProperty({
    description: 'Field to sort by',
    example: 'priorityScore',
  })
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsEnum(SortOrder)
  order: SortOrder;
}

/**
 * DTO for creating a new saved view
 */
export class CreateSavedViewDto {
  @ApiProperty({
    description: 'Name of the saved view',
    example: 'High Balance Overdue',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of what this view filters',
    example: 'Accounts with balance > $10,000 that are 60+ days overdue',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Filter criteria as JSON object',
    example: {
      minBalance: 10000,
      minDaysOverdue: 60,
      priorityLabels: ['HIGH', 'URGENT'],
      status: ['NEW', 'IN_PROGRESS'],
    },
  })
  @IsObject()
  filters: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Whether this view is shared with the team',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the default view for the user',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Sort configuration',
    type: SortConfigDto,
    example: { field: 'priorityScore', order: 'DESC' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SortConfigDto)
  sort?: SortConfigDto;
}

/**
 * DTO for updating an existing saved view
 */
export class UpdateSavedViewDto extends PartialType(CreateSavedViewDto) {
  // All fields are optional for partial updates
}

/**
 * Response DTO for saved view
 */
export class SavedViewResponseDto {
  @ApiProperty({
    description: 'Unique saved view identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'User ID of the view creator',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  userId: string;

  @ApiProperty({
    description: 'Name of the saved view',
    example: 'High Balance Overdue',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of what this view filters',
    example: 'Accounts with balance > $10,000 that are 60+ days overdue',
  })
  description?: string;

  @ApiProperty({
    description: 'Filter criteria',
    example: {
      minBalance: 10000,
      minDaysOverdue: 60,
      priorityLabels: ['HIGH', 'URGENT'],
    },
  })
  filters: Record<string, any>;

  @ApiProperty({
    description: 'Whether this view is shared with the team',
    example: false,
  })
  isShared: boolean;

  @ApiProperty({
    description: 'Whether this is a system-provided quick filter',
    example: false,
  })
  isSystem: boolean;

  @ApiProperty({
    description: 'Whether this is the default view for the user',
    example: false,
  })
  isDefault: boolean;

  @ApiPropertyOptional({
    description: 'Sort configuration',
    type: SortConfigDto,
  })
  sort?: SortConfigDto;

  @ApiProperty({
    description: 'Timestamp when view was created',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when view was last updated',
    example: '2024-12-16T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: string;
}

/**
 * Query DTO for fetching saved views
 */
export class GetSavedViewsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter to include shared views',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeShared?: boolean;

  @ApiPropertyOptional({
    description: 'Filter to include only system views',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  onlySystem?: boolean;
}

/**
 * DTO for setting a view as default
 */
export class SetDefaultViewDto {
  @ApiProperty({
    description: 'Saved view ID to set as default',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  @IsUUID()
  viewId: string;
}
