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
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { QueryDebtsDto } from './dto/query-debts.dto';
import { DebtResponseDto, PaginatedDebtResponseDto } from './dto/debt-response.dto';
import { Permissions } from '@verichron/auth';
import { OrganizationPermission, DebtorPermission } from '@verichron/enums';

/**
 * Controller for debt management operations.
 */
@ApiTags('Debts')
@ApiBearerAuth()
@Controller('debts/debts/orgs/:organizationId')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  /**
   * Create a new debt record.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new debt record',
    description: `
      Creates a new debt record with associated debtors.
    `,
  })
  @ApiBody({ type: CreateDebtDto })
  @ApiResponse({
    status: 201,
    description: 'Debt created successfully',
    type: DebtResponseDto,
  })
  @Permissions(OrganizationPermission.DEBTS_WRITE)
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createDebtDto: CreateDebtDto,
  ): Promise<DebtResponseDto> {
    return this.debtsService.create(createDebtDto);
  }

  /**
   * Query and list debts with filters and pagination.
   */
  @Get()
  @ApiOperation({
    summary: 'List debts with filters and pagination',
    description: `
      Retrieve a paginated list of debts with optional filters.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Debts retrieved successfully',
    type: PaginatedDebtResponseDto,
  })
  @Permissions(OrganizationPermission.DEBTS_READ)
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: QueryDebtsDto,
  ): Promise<PaginatedDebtResponseDto> {
    return this.debtsService.findAll(query);
  }

  /**
   * Get debts for the authenticated DEBTOR user.
   */
  @Get('my-debts')
  @ApiOperation({
    summary: 'Get my debts (DEBTOR users only)',
    description: `
      Retrieve all debts for the authenticated DEBTOR user in the current organization.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved debtor debts',
    type: PaginatedDebtResponseDto,
  })
  @Permissions(DebtorPermission.SELF_READ)
  async findMyDebts(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize') pageSize?: number,
    @Query('offset') offset?: number,
  ): Promise<PaginatedDebtResponseDto> {
    return this.debtsService.findMyDebts(pageSize ?? 100, offset ?? 0);
  }

  /**
   * Get a single debt by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single debt by ID',
    description: `
      Retrieve detailed information about a specific debt.
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
    description: 'Debt UUID',
    type: 'string',
    format: 'uuid',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Debt retrieved successfully',
    type: DebtResponseDto,
  })
  @Permissions(OrganizationPermission.DEBTS_READ)
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DebtResponseDto> {
    return this.debtsService.findOne(id);
  }

  /**
   * Update a debt record.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a debt record',
    description: `
      Update mutable fields on a debt record.
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
    description: 'Debt UUID',
    type: 'string',
    format: 'uuid',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({ type: UpdateDebtDto })
  @ApiResponse({
    status: 200,
    description: 'Debt updated successfully',
    type: DebtResponseDto,
  })
  @Permissions(OrganizationPermission.DEBTS_WRITE)
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDebtDto: UpdateDebtDto,
  ): Promise<DebtResponseDto> {
    return this.debtsService.update(id, updateDebtDto);
  }

  /**
   * Soft delete a debt (not implemented in MVP).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a debt',
    description: `
      Soft deletes a debt record by changing its status to \`CHARGED_OFF\`.
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
    description: 'Debt UUID',
    type: 'string',
    format: 'uuid',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 204,
    description: 'Debt deleted successfully',
  })
  @Permissions(OrganizationPermission.DEBTORS_DELETE)
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.debtsService.remove(id);
  }
}