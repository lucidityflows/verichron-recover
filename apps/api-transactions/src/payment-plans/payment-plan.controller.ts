import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PlansService } from './payment-plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { PaymentPlan } from './entities/payment-plan.entity';
import { Permissions } from '@verichron/auth';
import { RequestContext } from '../core/services/request-context.service';

/**
 * Plans Controller
 * 
 * Manages payment plan operations including creation, approval, and cancellation.
 * Supports multi-debt consolidation and configurable approval workflows.
 * 
 * All endpoints enforce organization-level tenant isolation.
 */
@ApiTags('Payment Plans')
@ApiBearerAuth()
@Controller('transactions/payment-plans/orgs/:organizationId')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly requestContext: RequestContext,
  ) {}

  /**
   * Create Payment Plan
   * 
   * Creates a new payment plan to consolidate one or more debts.
   * The plan status will be set based on organization approval settings.
   * 
   * Requires: payment_plan:create permission
   */
  @Post()
  @Permissions('payment_plan:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create payment plan',
    description:
      'Creates a new payment plan to consolidate one or more debts. ' +
      'The initial status will be DRAFT, PENDING_APPROVAL, or ACTIVE depending on ' +
      'the total amount and organization approval threshold. ' +
      'Supports multi-debt consolidation via debtIds array.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment plan created successfully',
    type: PaymentPlan,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'One or more debts are already part of an active payment plan',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:create permission',
  })
  async create(
    @Param('organizationId') _orgId: string,
    @Body() createDto: CreatePlanDto,
  ): Promise<PaymentPlan> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.plansService.create(createDto, userId, organizationId);
  }

  /**
   * List Payment Plans
   * 
   * Retrieve a paginated, filterable list of payment plans.
   * Results are automatically scoped to the user's organization.
   * 
   * Requires: payment_plan:read permission
   */
  @Get()
  @Permissions('payment_plan:read')
  @ApiOperation({
    summary: 'List payment plans',
    description:
      'Retrieve a paginated list of payment plans with optional filters. ' +
      'Results are automatically scoped to the requesting user\'s organization.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PaymentPlan' },
        },
        total: { type: 'number', example: 75 },
        page: { type: 'number', example: 1 },
        pageSize: { type: 'number', example: 20 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:read permission',
  })
  async findAll(
    @Param('organizationId') _orgId: string,
    @Query() query: QueryPlansDto,
  ): Promise<{
    data: PaymentPlan[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    return this.plansService.findAll(query, organizationId);
  }

  /**
   * Get Payment Plan Details
   * 
   * Retrieve detailed information about a specific payment plan.
   * Includes associated debt information.
   * 
   * Requires: payment_plan:read permission
   */
  @Get(':id')
  @Permissions('payment_plan:read')
  @ApiOperation({
    summary: 'Get payment plan details',
    description:
      'Retrieve detailed information about a specific payment plan by ID. ' +
      'Includes associated debt information. ' +
      'Access is automatically scoped to the requesting user\'s organization.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan found',
    type: PaymentPlan,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment plan not found or access denied',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:read permission',
  })
  async findOne(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentPlan> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    return this.plansService.findOne(id, organizationId);
  }

  /**
   * Update Payment Plan
   * 
   * Update an existing payment plan.
   * Only DRAFT plans can be updated.
   * 
   * Requires: payment_plan:update permission
   */
  @Put(':id')
  @Permissions('payment_plan:update')
  @ApiOperation({
    summary: 'Update payment plan',
    description:
      'Update an existing payment plan. ' +
      'Only plans with DRAFT status can be updated. ' +
      'All provided fields will replace existing values.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan updated successfully',
    type: PaymentPlan,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body or plan status prevents updates',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment plan not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:update permission',
  })
  async update(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePlanDto,
  ): Promise<PaymentPlan> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.plansService.update(id, updateDto, userId, organizationId);
  }

  /**
   * Partial Update Payment Plan
   * 
   * Partially update an existing payment plan.
   * Only DRAFT plans can be updated.
   * 
   * Requires: payment_plan:update permission
   */
  @Patch(':id')
  @Permissions('payment_plan:update')
  @ApiOperation({
    summary: 'Partially update payment plan',
    description:
      'Partially update an existing payment plan. ' +
      'Only plans with DRAFT status can be updated. ' +
      'Only provided fields will be updated.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan updated successfully',
    type: PaymentPlan,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body or plan status prevents updates',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment plan not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:update permission',
  })
  async partialUpdate(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePlanDto,
  ): Promise<PaymentPlan> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.plansService.update(id, updateDto, userId, organizationId);
  }

  /**
   * Approve Payment Plan
   * 
   * Approve a pending payment plan, activating it for scheduled payments.
   * Only plans with PENDING_APPROVAL status can be approved.
   * 
   * Requires: payment_plan:approve permission
   */
  @Post(':id/approve')
  @Permissions('payment_plan:approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve payment plan',
    description:
      'Approve a pending payment plan, changing its status from PENDING_APPROVAL to ACTIVE. ' +
      'Only users with payment_plan:approve permission can approve plans. ' +
      'Once approved, scheduled payments will begin processing.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan approved successfully',
    type: PaymentPlan,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Plan status prevents approval (must be PENDING_APPROVAL)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment plan not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:approve permission',
  })
  async approve(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentPlan> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.plansService.approve(id, userId, organizationId);
  }

  /**
   * Cancel Payment Plan
   * 
   * Cancel an active or pending payment plan.
   * No future scheduled payments will be processed.
   * 
   * Requires: payment_plan:cancel permission
   */
  @Post(':id/cancel')
  @Permissions('payment_plan:cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel payment plan',
    description:
      'Cancel an active or pending payment plan. ' +
      'No future scheduled payments will be processed. ' +
      'This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan canceled successfully',
    type: PaymentPlan,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Plan status prevents cancellation',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment plan not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:cancel permission',
  })
  async cancel(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentPlan> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.plansService.cancel(id, userId, organizationId);
  }

  /**
   * Soft Delete Payment Plan
   * 
   * Alias for cancel operation - maintains RESTful convention.
   * 
   * Requires: payment_plan:cancel permission
   */
  @Delete(':id')
  @Permissions('payment_plan:cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete (cancel) payment plan',
    description:
      'Soft delete (cancel) a payment plan. ' +
      'This is an alias for the cancel operation. ' +
      'No future scheduled payments will be processed.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment plan canceled successfully',
    type: PaymentPlan,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Plan status prevents cancellation',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment plan not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:cancel permission',
  })
  async remove(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentPlan> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.plansService.cancel(id, userId, organizationId);
  }
}