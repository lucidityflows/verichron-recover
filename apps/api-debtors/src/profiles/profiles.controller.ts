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
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';
import { PartialUpdateDebtorDto } from './dto/partial-update-debtor.dto';
import { QueryDebtorsDto } from './dto/query-debtors.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { InviteDebtorDto } from './dto/invite-debtor.dto';
import { InviteDebtorResponseDto } from './dto/invite-debtor-response.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { PaginatedDebtorsDto } from './dto/paginated-debtors.dto';
import { InvitePortfolioDto } from './dto/invite-portfolio.dto';
import { DebtorProfileEntity } from './entities/debtor-profile.entity';
import { DebtorAddress } from './entities/debtor-address.entity';
import { DebtorEmail } from './entities/debtor-email.entity';
import { DebtorPhone } from './entities/debtor-phone.entity';
import { JwtAuthGuard, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

/**
 * Profiles Controller
 * 
 * Manages debtor profiles and contact information.
 */
@ApiTags('Debtor Profiles')
@ApiBearerAuth()
@Controller('debtors/profiles/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ========== Core Debtor CRUD ==========

  @Get()
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'List all debtors',
    description:
      'Retrieve a paginated list of debtors accessible by the requesting organization with optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Debtors retrieved successfully',
    type: PaginatedDebtorsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: QueryDebtorsDto
  ) {
    return this.profilesService.findAll(query);
  }

  @Get(':id')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'Get debtor by ID',
    description:
      'Retrieve detailed information about a specific debtor including contact information.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Debtor retrieved successfully',
    type: DebtorProfileEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<DebtorProfileEntity> {
    return this.profilesService.findOne(id);
  }

  @Post()
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Create a new debtor',
    description:
      'Create a new debtor profile. Automatically grants access to the creating organization.',
  })
  @ApiResponse({
    status: 201,
    description: 'Debtor created successfully',
    type: DebtorProfileEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Debtor already exists',
  })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createDebtorDto: CreateDebtorDto
  ): Promise<DebtorProfileEntity> {
    return this.profilesService.create(createDebtorDto);
  }

  @Put(':id')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Update debtor profile (full replacement)',
    description:
      'Fully update a debtor profile. All fields in the request body will replace existing values.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Debtor updated successfully',
    type: DebtorProfileEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDebtorDto: UpdateDebtorDto,
  ): Promise<DebtorProfileEntity> {
    return this.profilesService.update(id, updateDebtorDto);
  }

  @Patch(':id')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Partially update debtor profile',
    description:
      'Update specific fields of a debtor profile. Only provided fields will be updated.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Debtor updated successfully',
    type: DebtorProfileEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async partialUpdate(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() partialUpdateDto: PartialUpdateDebtorDto,
  ): Promise<DebtorProfileEntity> {
    return this.profilesService.partialUpdate(id, partialUpdateDto);
  }

  @Delete(':id')
  @Permissions(OrganizationPermission.DEBTORS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a debtor',
    description: 'Soft delete a debtor profile by setting deletedAt timestamp. Maintains audit trail for compliance.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Debtor soft deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    return this.profilesService.remove(id);
  }

  // ========== Debtor Invitation ==========

  @Post(':id/invite')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Invite a debtor to link to a user account',
    description: 'Sends an invitation to a debtor to create a user account or links an existing user account to the debtor profile. Enforces global email uniqueness.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent or user linked successfully',
    type: InviteDebtorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already associated with a different debtor',
  })
  async inviteDebtor(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() inviteData: InviteDebtorDto,
  ): Promise<InviteDebtorResponseDto> {
    return this.profilesService.inviteDebtor(id, inviteData);
  }

  @Post('invite-portfolio')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invite all debtors from a portfolio',
    description: 'Sends invitation events in batches to create debtor user accounts for all debtors in a portfolio. Processes 100 invitations per batch for optimal performance.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation batch sent successfully',
    schema: {
      properties: {
        invitationBatchId: { type: 'string', format: 'uuid', description: 'Unique identifier for this invitation batch' },
        totalInvitations: { type: 'number', description: 'Number of debtors invited' },
        totalBatches: { type: 'number', description: 'Number of event batches published' },
        skipped: { type: 'number', description: 'Number of debtors skipped (already invited or no email)' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid portfolio ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Portfolio not found or no debtors to invite',
  })
  async invitePortfolioDebtors(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: InvitePortfolioDto,
  ): Promise<{
    invitationBatchId: string;
    totalInvitations: number;
    totalBatches: number;
    skipped: number;
  }> {
    return this.profilesService.invitePortfolioDebtors(dto.portfolioId);
  }

  // ========== Address Management ==========

  @Get(':id/addresses')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'List all addresses for a debtor',
    description: 'Retrieve all addresses associated with a specific debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses retrieved successfully',
    type: [DebtorAddress],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async findAllAddresses(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<DebtorAddress[]> {
    return this.profilesService.findAllAddresses(id);
  }

  @Get(':id/addresses/:addressId')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'Get a specific address',
    description: 'Retrieve detailed information about a specific debtor address.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Address retrieved successfully',
    type: DebtorAddress,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Address not found',
  })
  async findOneAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ): Promise<DebtorAddress> {
    return this.profilesService.findOneAddress(id, addressId);
  }

  @Post(':id/addresses')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Add a new address to a debtor',
    description: 'Create a new address record for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    type: DebtorAddress,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async createAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<DebtorAddress> {
    return this.profilesService.createAddress(id, createAddressDto);
  }

  @Put(':id/addresses/:addressId')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Update a debtor address',
    description: 'Update an existing address for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    type: DebtorAddress,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Address not found',
  })
  async updateAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<DebtorAddress> {
    return this.profilesService.updateAddress(id, addressId, updateAddressDto);
  }

  @Delete(':id/addresses/:addressId')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an address from a debtor',
    description: 'Delete a specific address for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 204,
    description: 'Address deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Address not found',
  })
  async removeAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ): Promise<void> {
    return this.profilesService.removeAddress(id, addressId);
  }

  // ========== Email Management ==========

  @Get(':id/emails')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'List all emails for a debtor',
    description: 'Retrieve all email addresses associated with a specific debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Emails retrieved successfully',
    type: [DebtorEmail],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async findAllEmails(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<DebtorEmail[]> {
    return this.profilesService.findAllEmails(id);
  }

  @Get(':id/emails/:emailId')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'Get a specific email',
    description: 'Retrieve detailed information about a specific debtor email.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'emailId',
    description: 'Email UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: 'Email retrieved successfully',
    type: DebtorEmail,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
  })
  async findOneEmail(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
  ): Promise<DebtorEmail> {
    return this.profilesService.findOneEmail(id, emailId);
  }

  @Post(':id/emails')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Add a new email to a debtor',
    description: 'Create a new email record for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Email created successfully',
    type: DebtorEmail,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists for this debtor',
  })
  async createEmail(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createEmailDto: CreateEmailDto,
  ): Promise<DebtorEmail> {
    return this.profilesService.createEmail(id, createEmailDto);
  }

  @Put(':id/emails/:emailId')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Update a debtor email',
    description: 'Update an existing email for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'emailId',
    description: 'Email UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: 'Email updated successfully',
    type: DebtorEmail,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists for this debtor',
  })
  async updateEmail(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
    @Body() updateEmailDto: UpdateEmailDto,
  ): Promise<DebtorEmail> {
    return this.profilesService.updateEmail(id, emailId, updateEmailDto);
  }

  @Delete(':id/emails/:emailId')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an email from a debtor',
    description: 'Delete a specific email for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'emailId',
    description: 'Email UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 204,
    description: 'Email deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Email not found',
  })
  async removeEmail(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
  ): Promise<void> {
    return this.profilesService.removeEmail(id, emailId);
  }

  // ========== Phone Management ==========

  @Get(':id/phones')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'List all phones for a debtor',
    description: 'Retrieve all phone numbers associated with a specific debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Phones retrieved successfully',
    type: [DebtorPhone],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  async findAllPhones(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<DebtorPhone[]> {
    return this.profilesService.findAllPhones(id);
  }

  @Get(':id/phones/:phoneId')
  @Permissions(OrganizationPermission.DEBTORS_READ)
  @ApiOperation({
    summary: 'Get a specific phone',
    description: 'Retrieve detailed information about a specific debtor phone.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'phoneId',
    description: 'Phone UUID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone retrieved successfully',
    type: DebtorPhone,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Phone not found',
  })
  async findOnePhone(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phoneId', ParseUUIDPipe) phoneId: string,
  ): Promise<DebtorPhone> {
    return this.profilesService.findOnePhone(id, phoneId);
  }

  @Post(':id/phones')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Add a new phone to a debtor',
    description: 'Create a new phone record for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Phone created successfully',
    type: DebtorPhone,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Debtor not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Phone already exists for this debtor',
  })
  async createPhone(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createPhoneDto: CreatePhoneDto,
  ): Promise<DebtorPhone> {
    return this.profilesService.createPhone(id, createPhoneDto);
  }

  @Put(':id/phones/:phoneId')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @ApiOperation({
    summary: 'Update a debtor phone',
    description: 'Update an existing phone for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'phoneId',
    description: 'Phone UUID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone updated successfully',
    type: DebtorPhone,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Phone not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Phone already exists for this debtor',
  })
  async updatePhone(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phoneId', ParseUUIDPipe) phoneId: string,
    @Body() updatePhoneDto: UpdatePhoneDto,
  ): Promise<DebtorPhone> {
    return this.profilesService.updatePhone(id, phoneId, updatePhoneDto);
  }

  @Delete(':id/phones/:phoneId')
  @Permissions(OrganizationPermission.DEBTORS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a phone from a debtor',
    description: 'Delete a specific phone for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'id',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'phoneId',
    description: 'Phone UUID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 204,
    description: 'Phone deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Organization does not have access to this debtor',
  })
  @ApiResponse({
    status: 404,
    description: 'Phone not found',
  })
  async removePhone(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('phoneId', ParseUUIDPipe) phoneId: string,
  ): Promise<void> {
    return this.profilesService.removePhone(id, phoneId);
  }
}
