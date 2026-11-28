import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QueryPortfoliosDto } from './dto/query-portfolios.dto';
import {
  PortfolioResponseDto,
  PaginatedPortfolioResponseDto,
  PortfolioUserAccessDto,
} from './dto/portfolio-response.dto';
import { AssignUserDto, TransferPortfolioDto } from './dto/assign-user.dto';
import { Permissions } from '@verichron/auth';
import { OrganizationPermission, PlatformPermission } from '@verichron/enums';

/**
 * Controller for portfolio management operations.
 */
@ApiTags('Portfolios')
@ApiBearerAuth()
@Controller('debts/portfolios/orgs/:organizationId')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  /**
   * Create a new portfolio record.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new portfolio',
    description: `
      Creates a new portfolio record.
    `,
  })
  @ApiBody({ type: CreatePortfolioDto })
  @ApiResponse({
    status: 201,
    description: 'Portfolio created successfully',
    type: PortfolioResponseDto,
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_WRITE)
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createPortfolioDto: CreatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    return this.portfoliosService.create(createPortfolioDto);
  }

  /**
   * Query and list portfolios with filters and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'List portfolios with filters and pagination',
    description: `
      Retrieve a paginated list of portfolios with optional filters and metrics.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolios retrieved successfully',
    type: PaginatedPortfolioResponseDto,
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_READ, PlatformPermission.ORGS_READ)
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: QueryPortfoliosDto,
  ): Promise<PaginatedPortfolioResponseDto> {
    return this.portfoliosService.findAll(organizationId, query);
  }

  /**
   * Get a single portfolio by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single portfolio by ID',
    description: `
      Retrieve detailed information about a specific portfolio.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Portfolio UUID',
    type: 'string',
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio retrieved successfully',
    type: PortfolioResponseDto,
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_READ, PlatformPermission.ORGS_READ)
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PortfolioResponseDto> {
    return this.portfoliosService.findOne(organizationId, id);
  }

  /**
   * Update a portfolio record.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a portfolio',
    description: `
      Update mutable fields on a portfolio record.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Portfolio UUID',
    type: 'string',
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiBody({ type: UpdatePortfolioDto })
  @ApiResponse({
    status: 200,
    description: 'Portfolio updated successfully',
    type: PortfolioResponseDto,
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_WRITE)
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    return this.portfoliosService.update(id, updatePortfolioDto);
  }

  /**
   * Soft delete a portfolio (not implemented in MVP).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a portfolio',
    description: `
      Soft delete a portfolio record.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Portfolio UUID',
    type: 'string',
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiResponse({
    status: 204,
    description: 'Portfolio deleted successfully',
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_DELETE)
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.portfoliosService.remove(id);
  }

  /**
   * Assign a user access to a portfolio (Layer 2 authorization setup).
   */
  @Post(':id/users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign user access to a portfolio',
    description: `
      Grant a user access to work on all debts within a portfolio.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Portfolio UUID',
    type: 'string',
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiBody({ type: AssignUserDto })
  @ApiResponse({
    status: 201,
    description: 'User assigned to portfolio successfully',
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_WRITE)
  async assignUser(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignUserDto: AssignUserDto,
  ): Promise<void> {
    return this.portfoliosService.assignUser(id, assignUserDto);
  }

  /**
   * Revoke user access from a portfolio.
   */
  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke user access from a portfolio',
    description: `
      Remove a user's access to a portfolio.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Portfolio UUID',
    type: 'string',
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiParam({
    name: 'userId',
    description: 'User UUID to revoke access from',
    type: 'string',
    format: 'uuid',
    example: '3d2e5f4b-1c9a-4e7d-8b2f-6a5c9e1d3f8b',
  })
  @ApiResponse({
    status: 204,
    description: 'User access revoked successfully',
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_WRITE)
  async revokeUser(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.portfoliosService.revokeUser(id, userId);
  }

  /**
   * List all users who have access to a portfolio.
   */
  @Get(':id/users')
  @ApiOperation({
    summary: 'List users with access to a portfolio',
    description: `
      Retrieve a list of all users who have been granted access to this portfolio.
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Portfolio UUID',
    type: 'string',
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [PortfolioUserAccessDto],
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_READ)
  async listUsers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PortfolioUserAccessDto[]> {
    return this.portfoliosService.listUsers(id);
  }

  /**
   * Transfer a portfolio to another organization.
   */
  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer portfolio to another organization',
    description: `
      Transfer ownership of a portfolio to another organization (portfolio sale).
    `,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Portfolio UUID',
    type: 'string',
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  @ApiBody({ type: TransferPortfolioDto })
  @ApiResponse({
    status: 200,
    description: 'Portfolio transferred successfully',
    type: PortfolioResponseDto,
  })
  @Permissions(OrganizationPermission.PORTFOLIOS_TRANSFER)
  async transfer(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() transferDto: TransferPortfolioDto,
  ): Promise<PortfolioResponseDto> {
    return this.portfoliosService.transfer(id, transferDto);
  }
}