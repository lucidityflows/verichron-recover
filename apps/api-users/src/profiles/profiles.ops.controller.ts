import { Controller, Get, Patch, Query, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProfilesOpsService } from './profiles.ops.service';
import { 
  PaginatedUsersResponseDto, 
  UserDetailDto, 
  ListUsersQueryDto 
} from './dto';
import { 
  JwtAuthGuard, 
  PermissionsGuard, 
  Permissions, 
  SkipOrgContext,
  CurrentUserId
} from '../core';
import { PlatformPermission, UserStatus } from '@verichron/enums';

@ApiTags('Ops: Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@SkipOrgContext() // <--- CRITICAL: Bypasses OrgContextGuard checks
@Controller('ops/users/profiles')
export class ProfilesOpsController {
  constructor(private readonly opsService: ProfilesOpsService) {}

  @Get()
  @Permissions(PlatformPermission.USERS_MANAGE)
  @ApiOperation({ summary: 'List all users (System Wide)' })
  @ApiResponse({ status: 200, type: PaginatedUsersResponseDto })
  async findAll(@Query() query: ListUsersQueryDto) {
    return this.opsService.findAll(query as any);
  }

  @Get(':id')
  @Permissions(PlatformPermission.USERS_MANAGE)
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({ status: 200, type: UserDetailDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.opsService.findById(id);
  }

  @Patch(':id/status')
  @Permissions(PlatformPermission.USERS_MANAGE)
  @ApiOperation({ summary: 'Force update user status (Ban/Suspend)' })
  @ApiQuery({ name: 'status', enum: UserStatus })
  @ApiResponse({ status: 200, type: UserDetailDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: UserStatus,
    @CurrentUserId() adminId: string
  ) {
    return this.opsService.updateUserStatus(id, status, adminId);
  }
}
