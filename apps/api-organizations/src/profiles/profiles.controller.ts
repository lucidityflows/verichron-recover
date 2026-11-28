import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, OrganizationId, Permissions } from '@verichron/auth';
import { PaginatedResponseDto } from '../core/dto';
import { LenientUUIDPipe } from '../core/pipes';
import { OrganizationPermission } from '@verichron/enums';
import {
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationQueryDto,
  CreateAddressDto,
  UpdateAddressDto,
  AddressResponseDto,
  CreateEmailDto,
  UpdateEmailDto,
  EmailResponseDto,
  CreatePhoneNumberDto,
  UpdatePhoneNumberDto,
  PhoneNumberResponseDto,
} from './dto';
import { ProfilesService } from './profiles.service';

/**
 * Profiles controller handles organization identity and contact information management
 */
@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations/profiles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiExtraModels(PaginatedResponseDto, OrganizationResponseDto, AddressResponseDto, EmailResponseDto, PhoneNumberResponseDto)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ============================================================================
  // Organization Management Endpoints (Tenant Scoped)
  // ============================================================================

  @Get()
  @Permissions(OrganizationPermission.ORGS_READ)
  @ApiOperation({
    summary: 'Get organization profile',
    description: 'Retrieve the profile for the current organization.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: OrganizationResponseDto,
  })
  async findAllOrganizations(
    @Query() query: OrganizationQueryDto,
    @OrganizationId() organizationId: string,
  ): Promise<PaginatedResponseDto<OrganizationResponseDto>> {
    // Standard users only see their own organization
    return this.profilesService.findAllOrganizations(query, organizationId);
  }

  @Get(':organizationId')
  @Permissions(OrganizationPermission.ORGS_READ)
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Retrieve organization details (must match current organization context)',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization retrieved successfully',
    type: OrganizationResponseDto,
  })
  async findOneOrganization(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<OrganizationResponseDto> {
    return this.profilesService.findOneOrganization(organizationId);
  }

  @Patch(':organizationId')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @ApiOperation({
    summary: 'Update organization',
    description: 'Partially update organization details (requires ORGS_WRITE permission)',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  async updateOrganization(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.profilesService.updateOrganization(
      organizationId,
      updateOrganizationDto,
    );
  }

  // ============================================================================
  // Address Management Endpoints
  // ============================================================================

  @Get(':organizationId/addresses')
  @Permissions(OrganizationPermission.ORGS_READ)
  @ApiOperation({
    summary: 'List organization addresses',
    description: 'Get all addresses for the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Addresses retrieved successfully',
    type: [AddressResponseDto],
  })
  async findAllAddresses(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<AddressResponseDto[]> {
    return this.profilesService.findAllAddresses(organizationId);
  }

  @Post(':organizationId/addresses')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @ApiOperation({
    summary: 'Add address to organization',
    description: 'Create a new address for the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Address created successfully',
    type: AddressResponseDto,
  })
  async createAddress(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.profilesService.createAddress(organizationId, createAddressDto);
  }

  @Patch(':organizationId/addresses/:addressId')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @ApiOperation({
    summary: 'Update organization address',
    description: 'Partially update an organization address',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address UUID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address updated successfully',
    type: AddressResponseDto,
  })
  async updateAddress(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('addressId', LenientUUIDPipe) addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.profilesService.updateAddress(
      organizationId,
      addressId,
      updateAddressDto,
    );
  }

  @Delete(':organizationId/addresses/:addressId')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove organization address',
    description: 'Delete an address from the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address UUID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Address deleted successfully',
  })
  async deleteAddress(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('addressId', LenientUUIDPipe) addressId: string,
  ): Promise<void> {
    return this.profilesService.deleteAddress(organizationId, addressId);
  }

  // ============================================================================
  // Email Management Endpoints
  // ============================================================================

  @Get(':organizationId/emails')
  @Permissions(OrganizationPermission.ORGS_READ)
  @ApiOperation({
    summary: 'List organization emails',
    description: 'Get all emails for the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Emails retrieved successfully',
    type: [EmailResponseDto],
  })
  async findAllEmails(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<EmailResponseDto[]> {
    return this.profilesService.findAllEmails(organizationId);
  }

  @Post(':organizationId/emails')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @ApiOperation({
    summary: 'Add email to organization',
    description: 'Create a new email for the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Email created successfully',
    type: EmailResponseDto,
  })
  async createEmail(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Body() createEmailDto: CreateEmailDto,
  ): Promise<EmailResponseDto> {
    return this.profilesService.createEmail(organizationId, createEmailDto);
  }

  @Patch(':organizationId/emails/:emailId')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @ApiOperation({
    summary: 'Update organization email',
    description: 'Partially update an organization email',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'emailId',
    description: 'Email UUID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email updated successfully',
    type: EmailResponseDto,
  })
  async updateEmail(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('emailId', LenientUUIDPipe) emailId: string,
    @Body() updateEmailDto: UpdateEmailDto,
  ): Promise<EmailResponseDto> {
    return this.profilesService.updateEmail(organizationId, emailId, updateEmailDto);
  }

  @Delete(':organizationId/emails/:emailId')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove organization email',
    description: 'Delete an email from the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'emailId',
    description: 'Email UUID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Email deleted successfully',
  })
  async deleteEmail(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('emailId', LenientUUIDPipe) emailId: string,
  ): Promise<void> {
    return this.profilesService.deleteEmail(organizationId, emailId);
  }

  // ============================================================================
  // Phone Number Management Endpoints
  // ============================================================================

  @Get(':organizationId/phone-numbers')
  @Permissions(OrganizationPermission.ORGS_READ)
  @ApiOperation({
    summary: 'List organization phone numbers',
    description: 'Get all phone numbers for the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phone numbers retrieved successfully',
    type: [PhoneNumberResponseDto],
  })
  async findAllPhoneNumbers(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
  ): Promise<PhoneNumberResponseDto[]> {
    return this.profilesService.findAllPhoneNumbers(organizationId);
  }

  @Post(':organizationId/phone-numbers')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @ApiOperation({
    summary: 'Add phone number to organization',
    description: 'Create a new phone number for the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Phone number created successfully',
    type: PhoneNumberResponseDto,
  })
  async createPhoneNumber(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Body() createPhoneNumberDto: CreatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    return this.profilesService.createPhoneNumber(organizationId, createPhoneNumberDto);
  }

  @Patch(':organizationId/phone-numbers/:phoneNumberId')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @ApiOperation({
    summary: 'Update organization phone number',
    description: 'Partially update an organization phone number',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'phoneNumberId',
    description: 'Phone Number UUID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phone number updated successfully',
    type: PhoneNumberResponseDto,
  })
  async updatePhoneNumber(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('phoneNumberId', LenientUUIDPipe) phoneNumberId: string,
    @Body() updatePhoneNumberDto: UpdatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    return this.profilesService.updatePhoneNumber(
      organizationId,
      phoneNumberId,
      updatePhoneNumberDto,
    );
  }

  @Delete(':organizationId/phone-numbers/:phoneNumberId')
  @Permissions(OrganizationPermission.ORGS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove organization phone number',
    description: 'Delete a phone number from the organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'phoneNumberId',
    description: 'Phone Number UUID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Phone number deleted successfully',
  })
  async deletePhoneNumber(
    @Param('organizationId', LenientUUIDPipe) organizationId: string,
    @Param('phoneNumberId', LenientUUIDPipe) phoneNumberId: string,
  ): Promise<void> {
    return this.profilesService.deletePhoneNumber(organizationId, phoneNumberId);
  }
}
