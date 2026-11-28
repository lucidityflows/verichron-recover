import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@verichron/auth';
import { ErrorResponseDto } from '../core/dto';
import { LenientUUIDPipe } from '../core/pipes';
import { OrganizationPermission } from '@verichron/enums';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  TeamResponseDto,
  TeamMemberResponseDto,
  PortfolioTeamAssignmentResponseDto,
  TeamMembershipMapResponseDto,
} from './dto';
import { TeamsService } from './teams.service';

/**
 * Teams controller handles team management endpoints for organization admins/managers
 */
@ApiTags('Teams')
@ApiBearerAuth()
@Controller('organizations/teams/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ============================================================================
  // Team Management Endpoints
  // ============================================================================

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @ApiOperation({
    summary: 'Create a new team',
    description: 'Creates a new team within an organization (requires TEAMS_MANAGE permission)',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Team successfully created',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Team with this name already exists',
    type: ErrorResponseDto,
  })
  async createTeam(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Body() createTeamDto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.createTeam(organizationId, createTeamDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({
    summary: 'List all teams',
    description: 'Get all teams for an organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teams retrieved successfully',
    type: [TeamResponseDto],
  })
  async getTeams(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<TeamResponseDto[]> {
    return this.teamsService.getTeams(organizationId);
  }

  @Get('memberships')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({
    summary: 'Get organization-wide team membership map',
    description: 'Retrieve a mapping of userId to team details for the entire organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Membership map retrieved successfully',
    type: TeamMembershipMapResponseDto,
  })
  async getMembershipMap(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<TeamMembershipMapResponseDto> {
    const memberships = await this.teamsService.getMembershipMap(organizationId);
    return { memberships };
  }

  @Get(':teamId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({
    summary: 'Get team by ID',
    description: 'Retrieve a single team with details',
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
    status: HttpStatus.OK,
    description: 'Team retrieved successfully',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
    type: ErrorResponseDto,
  })
  async getTeamById(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<TeamResponseDto> {
    return this.teamsService.getTeamById(organizationId, teamId);
  }

  @Get(':teamId/portfolios')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({
    summary: 'Get portfolios assigned to a team',
    description: 'Lists all portfolios authorized for a specific team',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Portfolios retrieved successfully',
    type: [PortfolioTeamAssignmentResponseDto],
  })
  async getPortfoliosForTeam(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<PortfolioTeamAssignmentResponseDto[]> {
    const assignments = await this.teamsService.getPortfoliosForTeam(organizationId, teamId);
    return assignments.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      portfolioId: a.portfolioId,
      teamId: a.teamId,
      assignedAt: a.assignedAt.toISOString(),
    }));
  }

  @Patch(':teamId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @ApiOperation({
    summary: 'Update a team',
    description: 'Update team name, description, or manager (requires TEAMS_MANAGE permission)',
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
    status: HttpStatus.OK,
    description: 'Team successfully updated',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Team with this name already exists',
    type: ErrorResponseDto,
  })
  async updateTeam(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.teamsService.updateTeam(organizationId, teamId, updateTeamDto);
  }

  @Delete(':teamId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a team',
    description: 'Delete a team and all its memberships (requires TEAMS_MANAGE permission)',
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
    status: HttpStatus.NO_CONTENT,
    description: 'Team successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
    type: ErrorResponseDto,
  })
  async deleteTeam(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<void> {
    return this.teamsService.deleteTeam(organizationId, teamId);
  }

  // ============================================================================
  // Team Member Management Endpoints
  // ============================================================================

  @Post(':teamId/members')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @ApiOperation({
    summary: 'Add a member to a team',
    description: 'Add a user to a team with optional role and primary designation (requires TEAMS_MANAGE permission)',
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
    status: HttpStatus.CREATED,
    description: 'Member successfully added to team',
    type: TeamMemberResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User is already a member of this team',
    type: ErrorResponseDto,
  })
  async addTeamMember(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
    @Body() addTeamMemberDto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    return this.teamsService.addTeamMember(organizationId, teamId, addTeamMemberDto);
  }

  @Get(':teamId/members')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({
    summary: 'List team members',
    description: 'Get all members of a team',
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
    status: HttpStatus.OK,
    description: 'Team members retrieved successfully',
    type: [TeamMemberResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team not found',
    type: ErrorResponseDto,
  })
  async getTeamMembers(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<TeamMemberResponseDto[]> {
    return this.teamsService.getTeamMembers(organizationId, teamId);
  }

  @Delete(':teamId/members/:userId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a member from a team',
    description: 'Remove a user from a team (requires TEAMS_MANAGE permission)',
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
  @ApiParam({
    name: 'userId',
    description: 'User UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Member successfully removed from team',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Team or member not found',
    type: ErrorResponseDto,
  })
  async removeTeamMember(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
    @Param('userId', LenientUUIDPipe) userId: string,
  ): Promise<void> {
    return this.teamsService.removeTeamMember(organizationId, teamId, userId);
  }

  // ============================================================================
  // User Teams Endpoint (for getting current user's teams)
  // ============================================================================

  @Get('user/:userId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({
    summary: 'Get teams for a specific user',
    description: 'Retrieve all teams a user belongs to within the organization',
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
    status: HttpStatus.OK,
    description: 'User teams retrieved successfully',
    type: [TeamResponseDto],
  })
  async getUserTeams(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('userId', LenientUUIDPipe) userId: string,
  ): Promise<TeamResponseDto[]> {
    return this.teamsService.getUserTeams(organizationId, userId);
  }

  // ============================================================================
  // Portfolio Assignment Endpoints
  // ============================================================================

  @Post('portfolios/:portfolioId/assign/:teamId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @ApiOperation({
    summary: 'Assign a portfolio to a team',
    description: 'Enables a team to work on debts within a specific portfolio (requires TEAMS_MANAGE permission)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Portfolio successfully assigned to team',
    type: PortfolioTeamAssignmentResponseDto,
  })
  async assignPortfolioToTeam(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('portfolioId', LenientUUIDPipe) portfolioId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<PortfolioTeamAssignmentResponseDto> {
    const assignment = await this.teamsService.assignPortfolioToTeam(organizationId, portfolioId, teamId);
    return {
      id: assignment.id,
      organizationId: assignment.organizationId,
      portfolioId: assignment.portfolioId,
      teamId: assignment.teamId,
      assignedAt: assignment.assignedAt.toISOString(),
    };
  }

  @Delete('portfolios/:portfolioId/unassign/:teamId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unassign a portfolio from a team',
    description: 'Removes a team\'s authorization to work on a portfolio (requires TEAMS_MANAGE permission)',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  @ApiParam({ name: 'teamId', description: 'Team UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Portfolio successfully unassigned' })
  async removePortfolioFromTeam(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('portfolioId', LenientUUIDPipe) portfolioId: string,
    @Param('teamId', LenientUUIDPipe) teamId: string,
  ): Promise<void> {
    return this.teamsService.removePortfolioFromTeam(organizationId, portfolioId, teamId);
  }

  @Get('portfolios/:portfolioId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.TEAMS_READ)
  @ApiOperation({
    summary: 'Get teams assigned to a portfolio',
    description: 'Lists all teams authorized to work on a specific portfolio',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Teams retrieved successfully',
    type: [TeamResponseDto],
  })
  async getTeamsForPortfolio(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('portfolioId', LenientUUIDPipe) portfolioId: string,
  ): Promise<TeamResponseDto[]> {
    const teams = await this.teamsService.getTeamsForPortfolio(organizationId, portfolioId);
    
    // Enrich with member counts
    return Promise.all(teams.map(async (t) => {
      const details = await this.teamsService.getTeamById(organizationId, t.id);
      return details;
    }));
  }
}
