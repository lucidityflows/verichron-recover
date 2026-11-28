import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '@verichron/auth';
import { LenientUUIDPipe } from '../core/pipes';
import { TeamsService } from './teams.service';
import { TeamResponseDto, TeamMemberResponseDto } from './dto';

/**
 * Internal Teams Controller
 *
 * Provides internal endpoints for service-to-service communication.
 * These endpoints are called by other services (api-collectors, api-workflows, etc.)
 * to query team information without requiring user authentication.
 *
 * Security: These endpoints use HMAC authentication (not JWT) for service-to-service calls.
 */
@ApiTags('Teams (Internal)')
@Controller('internal/organizations/teams')
export class TeamsInternalController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('verify-team-org/:organizationId/:teamId')
  @Public()
  @ApiOperation({
    summary: 'Verify team belongs to organization (internal)',
    description: 'Internal endpoint to verify that a team belongs to a specific organization. Used by TeamAccessGuard in api-collectors.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification result',
    schema: {
      type: 'object',
      properties: {
        belongs: { type: 'boolean', example: true },
        teamId: { type: 'string', format: 'uuid' },
        organizationId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async verifyTeamBelongsToOrg(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<{ belongs: boolean; teamId: string; organizationId: string }> {
    const belongs = await this.teamsService.verifyTeamBelongsToOrg(teamId, organizationId);
    return { belongs, teamId, organizationId };
  }

  @Get('verify-membership/:userId/:teamId')
  @Public()
  @ApiOperation({
    summary: 'Verify user is a team member (internal)',
    description: 'Internal endpoint to verify that a user is a member of a specific team. Used by TeamAccessGuard in api-collectors.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification result',
    schema: {
      type: 'object',
      properties: {
        isMember: { type: 'boolean', example: true },
        userId: { type: 'string', format: 'uuid' },
        teamId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async verifyUserIsTeamMember(
    @Param('userId', LenientUUIDPipe) userId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<{ isMember: boolean; userId: string; teamId: string }> {
    const isMember = await this.teamsService.verifyUserIsTeamMember(userId, teamId);
    return { isMember, userId, teamId };
  }

  @Get('user-primary-team/:organizationId/:userId')
  @Public()
  @ApiOperation({
    summary: 'Get user primary team (internal)',
    description: 'Internal endpoint to get a user\'s primary team ID within an organization. Returns null if no primary team set.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary team ID or null',
    schema: {
      type: 'object',
      properties: {
        primaryTeamId: { type: 'string', format: 'uuid', nullable: true },
        userId: { type: 'string', format: 'uuid' },
        organizationId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async getUserPrimaryTeamId(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('userId', LenientUUIDPipe) userId: string,
  ): Promise<{ primaryTeamId: string | null; userId: string; organizationId: string }> {
    const primaryTeamId = await this.teamsService.getUserPrimaryTeamId(userId, organizationId);
    return { primaryTeamId, userId, organizationId };
  }

  @Get(':organizationId/collectors')
  @Public()
  @ApiOperation({
    summary: 'Get all collector user IDs for organization (internal)',
    description:
      'Optimized internal endpoint that returns all user IDs with collector roles (MEMBER or LEAD) across all teams in an organization. ' +
      'Uses a single JOIN query instead of 1+N queries. Designed for orchestrators and analytics aggregation.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Collector user IDs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', format: 'uuid' },
        collectorIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Distinct user IDs of all collectors in the organization',
        },
        count: {
          type: 'number',
          description: 'Total number of unique collectors',
        },
      },
    },
  })
  async getOrganizationCollectors(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<{ organizationId: string; collectorIds: string[]; count: number }> {
    const collectorIds = await this.teamsService.getCollectorsByOrganization(organizationId);
    return {
      organizationId,
      collectorIds,
      count: collectorIds.length,
    };
  }

  @Get(':organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get all teams for organization (internal)',
    description: 'Internal endpoint to get all teams for an organization. Used by other services for team lookups.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Teams retrieved successfully',
    type: [TeamResponseDto],
  })
  async getTeamsInternal(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<TeamResponseDto[]> {
    return this.teamsService.getTeams(organizationId);
  }

  @Get(':organizationId/user/:userId')
  @Public()
  @ApiOperation({
    summary: 'Get user teams (internal)',
    description: 'Internal endpoint to get all teams a user belongs to within an organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User teams retrieved successfully',
    type: [TeamResponseDto],
  })
  async getUserTeamsInternal(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('userId', LenientUUIDPipe) userId: string,
  ): Promise<TeamResponseDto[]> {
    return this.teamsService.getUserTeams(organizationId, userId);
  }

  @Get(':organizationId/:teamId/members')
  @Public()
  @ApiOperation({
    summary: 'Get team members (internal)',
    description: 'Internal endpoint to get all members of a team.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Team members retrieved successfully',
    type: [TeamMemberResponseDto],
  })
  async getTeamMembersInternal(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<TeamMemberResponseDto[]> {
    return this.teamsService.getTeamMembers(organizationId, teamId);
  }
}
