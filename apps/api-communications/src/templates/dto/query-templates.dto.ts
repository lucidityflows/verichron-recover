import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateType } from '@verichron/enums';

/**
 * DTO for querying templates with filters and pagination
 */
export class QueryTemplatesDto {
  @ApiPropertyOptional({
    description: 'Filter by template name (partial match)',
    example: 'payment',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by template type',
    example: TemplateType.EMAIL,
    enum: TemplateType,
    enumName: 'TemplateType',
  })
  @IsEnum(TemplateType)
  @IsOptional()
  type?: TemplateType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search query (searches name and displayName)',
    example: 'receipt',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'name',
    enum: ['name', 'displayName', 'type', 'createdAt', 'updatedAt'],
    default: 'name',
  })
  @IsEnum(['name', 'displayName', 'type', 'createdAt', 'updatedAt'])
  @IsOptional()
  sortBy?: 'name' | 'displayName' | 'type' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
