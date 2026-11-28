// src/profiles/profiles.controller.ts
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
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import {
  InviteUserDto,
  UpdateUserDto,
  UserDetailDto,
  ListUsersQueryDto,
  PaginatedUsersResponseDto,
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
import { 
  PermissionsGuard, 
  Permissions, 
  CurrentUserId
} from '../core';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('users/profiles/orgs/:organizationId')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // ==================== USER ENDPOINTS ====================

  @Get()
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({
    summary: 'List all users',
    description: 'Returns a paginated list of users in your organization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    type: PaginatedUsersResponseDto,
  })
  async listUsers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.profilesService.findAll(organizationId, query);
  }

  @Get(':userId')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({
    summary: 'Get user details',
    description: 'Returns detailed information about a specific user in your organization including memberships, contact info, etc.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User details',
    type: UserDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or does not belong to your organization',
  })
  async getUserById(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserDetailDto> {
    return this.profilesService.findById(userId, organizationId);
  }

  @Post()
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Invite a new user to your organization',
    description: 'Creates a user account in PENDING status and sends an invitation email with activation link.',
  })
  @ApiResponse({
    status: 201,
    description: 'User invited successfully',
    type: UserDetailDto,
  })
  @ApiResponse({
    status: 409,
    description: 'A user with this email already exists',
  })
  async inviteUser(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: InviteUserDto,
    @CurrentUserId() currentUserId: string,
  ): Promise<UserDetailDto> {
    return this.profilesService.inviteUser(dto, organizationId, currentUserId);
  }

  @Patch(':userId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Updates user profile information such as name and status for a user in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user to update',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateUser(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUserId() currentUserId: string,
  ): Promise<UserDetailDto> {
    return this.profilesService.updateUser(
      userId,
      dto,
      organizationId,
      currentUserId,
    );
  }

  @Delete(':userId')
  @Permissions(OrganizationPermission.USERS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user account',
    description: 'Soft deletes a user in your organization by setting their status to INACTIVE. The user record is retained for audit purposes.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteUser(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<void> {
    return this.profilesService.deleteUser(userId, organizationId, currentUserId);
  }

  // ==================== ADDRESS ENDPOINTS ====================

  @Get(':userId/addresses')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({
    summary: 'Get user addresses',
    description: 'Returns all addresses associated with a user in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user addresses',
    type: [AddressResponseDto],
  })
  async getUserAddresses(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AddressResponseDto[]> {
    return this.profilesService.getUserAddresses(userId, organizationId);
  }

  @Post(':userId/addresses')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Add address to user',
    description: 'Adds a new address to a user profile in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Address added successfully',
    type: AddressResponseDto,
  })
  async addAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.profilesService.addAddress(userId, dto, organizationId);
  }

  @Put(':userId/addresses/:addressId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Update user address',
    description: 'Updates an existing address for a user in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'addressId',
    description: 'The UUID of the address',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    type: AddressResponseDto,
  })
  async updateAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.profilesService.updateAddress(
      userId,
      addressId,
      dto,
      organizationId,
    );
  }

  @Delete(':userId/addresses/:addressId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user address',
    description: 'Removes an address from a user profile in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'addressId',
    description: 'The UUID of the address to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Address deleted successfully',
  })
  async deleteAddress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ): Promise<void> {
    return this.profilesService.deleteAddress(userId, addressId, organizationId);
  }

  // ==================== EMAIL ENDPOINTS ====================

  @Get(':userId/emails')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({
    summary: 'Get user emails',
    description: 'Returns all email addresses associated with a user in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user emails',
    type: [EmailResponseDto],
  })
  async getUserEmails(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<EmailResponseDto[]> {
    return this.profilesService.getUserEmails(userId, organizationId);
  }

  @Post(':userId/emails')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Add email to user',
    description: 'Adds a new email address to a user profile in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Email added successfully',
    type: EmailResponseDto,
  })
  async addEmail(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateEmailDto,
  ): Promise<EmailResponseDto> {
    return this.profilesService.addEmail(userId, dto, organizationId);
  }

  @Put(':userId/emails/:emailId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Update user email',
    description: 'Updates an existing email address for a user in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'emailId',
    description: 'The UUID of the email',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Email updated successfully',
    type: EmailResponseDto,
  })
  async updateEmail(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
    @Body() dto: UpdateEmailDto,
  ): Promise<EmailResponseDto> {
    return this.profilesService.updateEmail(
      userId,
      emailId,
      dto,
      organizationId,
    );
  }

  @Delete(':userId/emails/:emailId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user email',
    description: 'Removes an email address from a user profile in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'emailId',
    description: 'The UUID of the email to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Email deleted successfully',
  })
  async deleteEmail(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
  ): Promise<void> {
    return this.profilesService.deleteEmail(userId, emailId, organizationId);
  }

  // ==================== PHONE NUMBER ENDPOINTS ====================

  @Get(':userId/phones')
  @Permissions(OrganizationPermission.USERS_READ)
  @ApiOperation({
    summary: 'Get user phone numbers',
    description: 'Returns all phone numbers associated with a user in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user phone numbers',
    type: [PhoneNumberResponseDto],
  })
  async getUserPhoneNumbers(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<PhoneNumberResponseDto[]> {
    return this.profilesService.getUserPhoneNumbers(userId, organizationId);
  }

  @Post(':userId/phones')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Add phone number to user',
    description: 'Adds a new phone number to a user profile in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Phone number added successfully',
    type: PhoneNumberResponseDto,
  })
  async addPhoneNumber(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    return this.profilesService.addPhoneNumber(userId, dto, organizationId);
  }

  @Put(':userId/phones/:phoneId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @ApiOperation({
    summary: 'Update user phone number',
    description: 'Updates an existing phone number for a user in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'phoneId',
    description: 'The UUID of the phone number',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Phone number updated successfully',
    type: PhoneNumberResponseDto,
  })
  async updatePhoneNumber(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('phoneId', ParseUUIDPipe) phoneId: string,
    @Body() dto: UpdatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    return this.profilesService.updatePhoneNumber(
      userId,
      phoneId,
      dto,
      organizationId,
    );
  }

  @Delete(':userId/phones/:phoneId')
  @Permissions(OrganizationPermission.USERS_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user phone number',
    description: 'Removes a phone number from a user profile in your organization.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'phoneId',
    description: 'The UUID of the phone number to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Phone number deleted successfully',
  })
  async deletePhoneNumber(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('phoneId', ParseUUIDPipe) phoneId: string,
  ): Promise<void> {
    return this.profilesService.deletePhoneNumber(userId, phoneId, organizationId);
  }
}