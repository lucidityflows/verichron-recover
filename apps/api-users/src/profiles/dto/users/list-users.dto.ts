import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min, Max, IsEnum, IsUUID, IsString } from "class-validator";
import { Type } from "class-transformer";
import { UserStatus } from "@verichron/enums";
import { UserSummaryDto } from "../memberships/user-membership.dto";
import { IListUsersQuery, IPaginatedUsersResponse, IUserSummary } from "@verichron/contracts";

// profiles/dto/list-users.dto.ts
export class ListUsersQueryDto implements IListUsersQuery {
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
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
    enumName: 'UserStatus',
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Search by name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by role ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}

export class PaginatedUsersResponseDto implements IPaginatedUsersResponse<IUserSummary> {
  @ApiProperty({
    description: 'Array of users',
    type: [UserSummaryDto],
  })
  data: UserSummaryDto[];

  @ApiProperty({
    description: 'Total number of users matching the filters',
    example: 150,
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
    example: 8,
  })
  totalPages: number;
}