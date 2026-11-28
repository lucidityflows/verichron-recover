import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProfilesService } from '../profiles/profiles.service';
import { GetUsersDataDto } from './dto/users/get-users-data.dto';
import { UserSummaryDto, ProvisionInitialAdminDto } from '../profiles/dto';
import { Public } from '@verichron/auth';

@ApiTags('Users (Internal)')
@Controller('internal/users')
export class UsersInternalController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('summaries')
  @Public()
  @ApiOperation({
    summary: 'Get user summaries by IDs (internal)',
    description: 'Internal endpoint to fetch basic user profiles (names, emails) for orchestration.',
  })
  @ApiResponse({
    status: 200,
    description: 'User summaries retrieved successfully',
    type: [UserSummaryDto],
  })
  async getUserSummariesInternal(
    @Body() dto: GetUsersDataDto,
  ): Promise<UserSummaryDto[]> {
    // We'll need to add a findByIds method to ProfilesService
    return this.profilesService.findByIds(dto.userIds);
  }

  @Post('provision-initial-admin')
  @Public()
  @ApiOperation({
    summary: 'Provision initial admin user for a new organization (internal)',
    description: 'Internal endpoint called by the orchestrator to provision the initial admin user during organization onboarding.',
  })
  @ApiResponse({
    status: 201,
    description: 'Initial admin user provisioned successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string' },
      },
    },
  })
  async provisionInitialAdminInternal(
    @Body() dto: ProvisionInitialAdminDto,
  ): Promise<{ id: string; email: string }> {
    const user = await this.profilesService.provisionInitialAdmin(dto);
    return { id: user.id, email: user.email };
  }
}
