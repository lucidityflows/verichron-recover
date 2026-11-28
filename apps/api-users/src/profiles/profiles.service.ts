// src/profiles/profiles.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  UserEntity,
  UserMembershipEntity,
  UserAddressEntity,
  UserEmailEntity,
  UserPhoneNumberEntity,
} from './entities';
import {
  InviteUserDto,
  ActivateUserDto,
  UpdateUserDto,
  UserDetailDto,
  UserSummaryDto,
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
  UserMembershipDto,
} from './dto';
import {
  UserNotFoundException,
  UserAlreadyExistsException,
  InvalidInvitationTokenException,
  InvitationExpiredException,
  AddressNotFoundException,
} from './errors';
import { EventPublisher } from '@verichron/event-publisher';
import {
  EVENT_TYPES
} from '@verichron/events';
import {
  MembershipCreatedDto,
  UserCreatedDto,
  UserActivatedDto,
  UserProfileUpdatedDto,
  UserStatusChangedDto
} from '../events/event-dto';
import { UserStatus } from '@verichron/enums';
import type { UserRole } from '@verichron/enums';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly INVITATION_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(UserMembershipEntity)
    private readonly membershipRepository: Repository<UserMembershipEntity>,

    @InjectRepository(UserAddressEntity)
    private readonly addressRepository: Repository<UserAddressEntity>,

    @InjectRepository(UserEmailEntity)
    private readonly emailRepository: Repository<UserEmailEntity>,

    @InjectRepository(UserPhoneNumberEntity)
    private readonly phoneRepository: Repository<UserPhoneNumberEntity>,

    private readonly dataSource: DataSource,
    private readonly eventPublisher: EventPublisher,
    private readonly rbacService: RbacService,
  ) {}

  // ==================== USER CRUD ====================

  /**
   * List users with pagination and filtering
   */
  async findAll(
    organizationId: string | null,
    query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    const { page = 1, pageSize = 20, status, search, roleId } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.memberships', 'membership')
      .leftJoinAndSelect('membership.role', 'role');

    // Platform admins (organizationId = null) see all users
    // Organization users only see users in their organization
    if (organizationId !== null) {
      queryBuilder.where('membership.organizationId = :organizationId', { organizationId });
      // Exclude DEBTOR role for tenant-scoped staff lists by default
      if (!roleId) {
        queryBuilder.andWhere('role.name != :debtorRole', { debtorRole: 'DEBTOR' });
      }
    }

    // Apply filters
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (roleId) {
      queryBuilder.andWhere('membership.roleId = :roleId', { roleId });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Order by creation date (newest first)
    queryBuilder.orderBy('user.createdAt', 'DESC');

    const users = await queryBuilder.getMany();

    const data = users.map((user) => {
      // Find the membership for the relevant organization context
      const membership = organizationId
        ? user.memberships.find((m) => m.organizationId === organizationId)
        : user.memberships[0];

      return this.mapToUserSummaryDto(user, membership?.role?.name as UserRole);
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize: pageSize,
      totalPages,
    };
  }

  /**
   * Find user by ID with full details
   */
  async findById(
    userId: string,
    organizationId: string | null,
  ): Promise<UserDetailDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'memberships',
        'addresses',
        'emails',
        'phoneNumbers',
      ],
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Verify user belongs to the organization (or is a platform admin)
    const membership = user.memberships.find(
      (m) => m.organizationId === organizationId,
    );

    if (!membership && organizationId !== null) {
      throw new UserNotFoundException(userId);
    }

    return this.mapToUserDetailDto(user);
  }

  /**
   * Invite a new user to the organization
   */
  async inviteUser(
    dto: InviteUserDto,
    organizationId: string,
    createdBy?: string,
  ): Promise<UserDetailDto> {
    this.logger.log(`Inviting user: ${dto.email} to org: ${organizationId}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new UserAlreadyExistsException(dto.email);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate invitation token
      const invitationToken = this.generateInvitationToken();
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setHours(
        invitationExpiresAt.getHours() + this.INVITATION_EXPIRY_HOURS,
      );

      // Create user
      const user = this.userRepository.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: UserStatus.PENDING,
        invitationToken,
        invitationExpiresAt,
      });

      const savedUser = await queryRunner.manager.save(user);

      // Create membership
      const membership = this.membershipRepository.create({
        userId: savedUser.id,
        organizationId,
        roleId: dto.roleId,
      });

      await queryRunner.manager.save(membership);

      await queryRunner.commitTransaction();

      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_USER_CREATED,
        {
          userId: savedUser.id,
          organizationId,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          invitationToken: savedUser.invitationToken!,
          invitationExpiresAt: savedUser.invitationExpiresAt!.toISOString(),
          roleId: dto.roleId,
          createdBy: createdBy ?? null,
        },
        UserCreatedDto,
      );

      this.logger.log(`Successfully invited user: ${savedUser.id}`);

      return this.findById(savedUser.id, organizationId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to invite user: ${message}`, stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Activate user account with invitation token
   */
  async activateUser(dto: ActivateUserDto): Promise<UserDetailDto> {
    this.logger.log('Activating user account');

    const user = await this.userRepository.findOne({
      where: { invitationToken: dto.invitationToken },
      relations: ['memberships'],
    });

    if (!user) {
      throw new InvalidInvitationTokenException();
    }

    // Check if token expired
    if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
      throw new InvitationExpiredException();
    }

    // Check if already activated
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User account is already active.');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    // Update user
    user.passwordHash = passwordHash;
    user.status = UserStatus.ACTIVE;
    user.invitationToken = null;
    user.invitationExpiresAt = null;

    await this.userRepository.save(user);

    // Publish event for each organization the user belongs to
    for (const membership of user.memberships) {
      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_USER_ACTIVATED,
        {
          userId: user.id,
          organizationId: membership.organizationId,
          activatedAt: new Date().toISOString(),
        },

        UserActivatedDto,
      );
    }

    this.logger.log(`Successfully activated user: ${user.id}`);

    // Return user details for first organization
    const firstOrgId = user.memberships[0]?.organizationId;
    return this.findById(user.id, firstOrgId || null);
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    organizationId: string | null,
    updatedBy?: string,
  ): Promise<UserDetailDto> {
    this.logger.log(`Updating user: ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberships'],
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Verify user belongs to organization
    const membership = user.memberships.find(
      (m) => m.organizationId === organizationId,
    );

    if (!membership) {
      throw new UserNotFoundException(userId);
    }

    const updatedFields: string[] = [];
    const oldStatus = user.status;

    if (dto.firstName) {
      user.firstName = dto.firstName;
      updatedFields.push('firstName');
    }

    if (dto.lastName) {
      user.lastName = dto.lastName;
      updatedFields.push('lastName');
    }

    if (dto.status && dto.status !== user.status) {
      user.status = dto.status;
      updatedFields.push('status');
    }

    await this.userRepository.save(user);

    // Publish events
    if (updatedFields.length > 0) {
      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_USER_PROFILE_UPDATED,
        {
          userId: user.id,
          organizationId,
          updatedFields,
          updatedAt: new Date().toISOString(),
        },
        UserProfileUpdatedDto,
      );
    }

    // If status changed, publish separate event
    if (dto.status && dto.status !== oldStatus) {
      await this.eventPublisher.publish(
        EVENT_TYPES.USERS_USER_STATUS_CHANGED,
        {
          userId,
          organizationId,
          oldStatus,
          newStatus: dto.status,
          statusChangedAt: new Date().toISOString(),
          changedBy: updatedBy,
        },
        UserStatusChangedDto,
      );
    }

    this.logger.log(`Successfully updated user: ${userId}`);

    return this.findById(userId, organizationId);
  }

  /**
   * Soft delete user (set status to INACTIVE)
   */
  async deleteUser(
    userId: string,
    organizationId: string | null,
    deletedBy?: string,
  ): Promise<void> {
    this.logger.log(`Deleting user: ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberships'],
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Verify user belongs to organization
    const membership = user.memberships.find(
      (m) => m.organizationId === organizationId,
    );

    if (!membership) {
      throw new UserNotFoundException(userId);
    }

    const oldStatus = user.status;
    user.status = UserStatus.INACTIVE;

    await this.userRepository.save(user);

    // Publish status changed event
    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_USER_STATUS_CHANGED,
      {
        userId,
        organizationId,
        oldStatus,
        newStatus: UserStatus.INACTIVE,
        reason: 'User deleted',
        statusChangedAt: new Date().toISOString(),
        changedBy: deletedBy,
      },
      UserStatusChangedDto,
    );


    this.logger.log(`Successfully deleted user: ${userId}`);
  }

  /**
   * Find multiple users by ID (used for orchestration)
   */
  async findByIds(userIds: string[]): Promise<UserSummaryDto[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      relations: ['memberships', 'memberships.role'],
    });

    return users.map((user) => {
      const primaryRole = user.memberships?.[0]?.role?.name as UserRole;
      return this.mapToUserSummaryDto(user, primaryRole);
    });
  }

  /**
   * Find user by email (used by AuthService)
   */
  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['memberships'],
    });
  }

  /**
   * Find user by ID without organization context (used by AuthService)
   */
  async findOne(userId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['memberships'],
    });
  }

  /**
   * Get all organization associations for a user (used by AuthService)
   */
  async getOrganizationAssociations(userId: string): Promise<{ organizationId: string | null; organizationName: string | null; role: string }[]> {
    const memberships = await this.membershipRepository.find({
      where: { userId },
      relations: ['role'],
    });

    return memberships.map(m => ({
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      role: m.role?.name || 'Unknown',
    }));
  }

  /**
   * Check if user is a member of an organization (used by AuthService)
   */
  async isUserMemberOfOrg(userId: string, organizationId: string | null): Promise<boolean> {
    const where: FindOptionsWhere<UserMembershipEntity> = {
      userId,
      organizationId: organizationId === null ? IsNull() : organizationId,
    };

    const membership = await this.membershipRepository.findOne({ where });
    return !!membership;
  }

  // ==================== ADDRESSES ====================

  /**
   * Get all addresses for a user
   */
  async getUserAddresses(
    userId: string,
    organizationId: string | null,
  ): Promise<AddressResponseDto[]> {
    await this.verifyUserInOrganization(userId, organizationId);

    const addresses = await this.addressRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    return addresses.map((addr) => this.mapToAddressResponseDto(addr));
  }

  /**
   * Add address to user
   */
  async addAddress(
    userId: string,
    dto: CreateAddressDto,
    organizationId: string | null,
  ): Promise<AddressResponseDto> {
    this.logger.log(`Adding address for user: ${userId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    // If setting as primary, unset other primary addresses
    if (dto.isPrimary) {
      await this.addressRepository.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }

    const address = this.addressRepository.create({
      userId,
      street1: dto.street1,
      street2: dto.street2 || undefined, // Ensure undefined if falsy (not null)
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country || 'US',
      addressCategory: dto.category,
      isPrimary: dto.isPrimary || false,
    });

    const savedAddress = await this.addressRepository.save(address);

    this.logger.log(`Successfully added address: ${savedAddress.id}`);

    return this.mapToAddressResponseDto(savedAddress);
  }

  /**
   * Update user address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
    organizationId: string | null,
  ): Promise<AddressResponseDto> {
    this.logger.log(`Updating address: ${addressId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new AddressNotFoundException(addressId);
    }

    // If setting as primary, unset other primary addresses
    if (dto.isPrimary && !address.isPrimary) {
      await this.addressRepository.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }

    Object.assign(address, dto);
    const updatedAddress = await this.addressRepository.save(address);

    this.logger.log(`Successfully updated address: ${addressId}`);

    return this.mapToAddressResponseDto(updatedAddress);
  }

  /**
   * Delete user address
   */
  async deleteAddress(
    userId: string,
    addressId: string,
    organizationId: string | null,
  ): Promise<void> {
    this.logger.log(`Deleting address: ${addressId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    const result = await this.addressRepository.delete({
      id: addressId,
      userId,
    });

    if (result.affected === 0) {
      throw new AddressNotFoundException(addressId);
    }

    this.logger.log(`Successfully deleted address: ${addressId}`);
  }

  // ==================== EMAILS ====================

  /**
   * Get all emails for a user
   */
  async getUserEmails(
    userId: string,
    organizationId: string | null,
  ): Promise<EmailResponseDto[]> {
    await this.verifyUserInOrganization(userId, organizationId);

    const emails = await this.emailRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    return emails.map((email) => this.mapToEmailResponseDto(email));
  }

  /**
   * Add email to user
   */
  async addEmail(
    userId: string,
    dto: CreateEmailDto,
    organizationId: string | null,
  ): Promise<EmailResponseDto> {
    this.logger.log(`Adding email for user: ${userId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    // If setting as primary, unset other primary emails
    if (dto.isPrimary) {
      await this.emailRepository.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }

    const email = this.emailRepository.create({
      userId,
      email: dto.email,
      isPrimary: dto.isPrimary || false,
    });

    const savedEmail = await this.emailRepository.save(email);

    this.logger.log(`Successfully added email: ${savedEmail.id}`);

    return this.mapToEmailResponseDto(savedEmail);
  }

  /**
   * Update user email
   */
  async updateEmail(
    userId: string,
    emailId: string,
    dto: UpdateEmailDto,
    organizationId: string | null,
  ): Promise<EmailResponseDto> {
    this.logger.log(`Updating email: ${emailId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    const email = await this.emailRepository.findOne({
      where: { id: emailId, userId },
    });

    if (!email) {
      throw new BadRequestException('Email not found');
    }

    // If setting as primary, unset other primary emails
    if (dto.isPrimary && !email.isPrimary) {
      await this.emailRepository.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }

    email.isPrimary = dto.isPrimary;
    const updatedEmail = await this.emailRepository.save(email);

    this.logger.log(`Successfully updated email: ${emailId}`);

    return this.mapToEmailResponseDto(updatedEmail);
  }

  /**
   * Delete user email
   */
  async deleteEmail(
    userId: string,
    emailId: string,
    organizationId: string | null,
  ): Promise<void> {
    this.logger.log(`Deleting email: ${emailId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    const result = await this.emailRepository.delete({
      id: emailId,
      userId,
    });

    if (result.affected === 0) {
      throw new BadRequestException('Email not found');
    }

    this.logger.log(`Successfully deleted email: ${emailId}`);
  }

  // ==================== PHONE NUMBERS ====================

  /**
   * Get all phone numbers for a user
   */
  async getUserPhoneNumbers(
    userId: string,
    organizationId: string | null,
  ): Promise<PhoneNumberResponseDto[]> {
    await this.verifyUserInOrganization(userId, organizationId);

    const phones = await this.phoneRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    return phones.map((
      phone) => this.mapToPhoneNumberResponseDto(phone));
  }

  /**
   * Add phone number to user
   */
  async addPhoneNumber(
    userId: string,
    dto: CreatePhoneNumberDto,
    organizationId: string | null,
  ): Promise<PhoneNumberResponseDto> {
    this.logger.log(`Adding phone number for user: ${userId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    // If setting as primary, unset other primary phone numbers
    if (dto.isPrimary) {
      await this.phoneRepository.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }

    const phone = this.phoneRepository.create({
      userId,
      ...dto,
    });

    const savedPhone = await this.phoneRepository.save(phone);

    this.logger.log(`Successfully added phone number: ${savedPhone.id}`);

    return this.mapToPhoneNumberResponseDto(savedPhone);
  }

  /**
   * Update user phone number
   */
  async updatePhoneNumber(
    userId: string,
    phoneId: string,
    dto: UpdatePhoneNumberDto,
    organizationId: string | null,
  ): Promise<PhoneNumberResponseDto> {
    this.logger.log(`Updating phone number: ${phoneId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    const phone = await this.phoneRepository.findOne({
      where: { id: phoneId, userId },
    });

    if (!phone) {
      throw new BadRequestException('Phone number not found');
    }

    // If setting as primary, unset other primary phone numbers
    if (dto.isPrimary && !phone.isPrimary) {
      await this.phoneRepository.update(
        { userId, isPrimary: true },
        { isPrimary: false },
      );
    }

    Object.assign(phone, dto);
    const updatedPhone = await this.phoneRepository.save(phone);

    this.logger.log(`Successfully updated phone number: ${phoneId}`);

    return this.mapToPhoneNumberResponseDto(updatedPhone);
  }

  /**
   * Delete user phone number
   */
  async deletePhoneNumber(
    userId: string,
    phoneId: string,
    organizationId: string | null,
  ): Promise<void> {
    this.logger.log(`Deleting phone number: ${phoneId}`);

    await this.verifyUserInOrganization(userId, organizationId);

    const result = await this.phoneRepository.delete({
      id: phoneId,
      userId,
    });

    if (result.affected === 0) {
      throw new BadRequestException('Phone number not found');
    }

    this.logger.log(`Successfully deleted phone number: ${phoneId}`);
  }

  // ==================== MEMBERSHIPS ====================

  /**
   * Create membership (used during provisioning)
   */
  async createMembership(data: {
    userId: string;
    organizationId: string;
    organizationName: string;
    roleId: string;
  }): Promise<UserMembershipEntity> {
    const membership = this.membershipRepository.create(data);
    return this.membershipRepository.save(membership);
  }

  /**
   * Find memberships by organization
   */
  async findMembershipsByOrganization(
    organizationId: string,
  ): Promise<UserMembershipEntity[]> {
    return this.membershipRepository.find({
      where: { organizationId },
      relations: ['user'],
    });
  }

  /**
   * Update user status (used for cascading org suspension)
   */
  async updateUserStatus(
    userId: string,
    status: UserStatus,
  ): Promise<void> {
    await this.userRepository.update({ id: userId }, { status });
  }

  // ==================== EVENT-DRIVEN PROVISIONING ====================

  /**
   * Provision initial admin user for a new organization
   * Called by OrganizationCreatedListener
   */
  async provisionInitialAdmin(data: {
    organizationId: string;
    organizationName: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<UserEntity> {
    this.logger.log(`Provisioning initial admin for org: ${data.organizationId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transactionCommitted = false;
    let user: UserEntity | null = null;
    let adminRole: { id: string } | null = null;
    let isNewUser = false;

    try {
      // Check if user already exists (idempotency)
      user = await this.userRepository.findOne({
        where: { email: data.email },
      });

      if (!user) {
        isNewUser = true;
        // Generate invitation token
        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date();
        invitationExpiresAt.setHours(
          invitationExpiresAt.getHours() + this.INVITATION_EXPIRY_HOURS,
        );

        // Create user
        user = this.userRepository.create({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          status: UserStatus.PENDING,
          invitationToken,
          invitationExpiresAt,
        });

        user = await queryRunner.manager.save(user);
        this.logger.log(`New user ${user.id} (${user.email}) created in provisionInitialAdmin.`);
      } else {
        this.logger.log(`Existing user ${user.id} (${user.email}) found in provisionInitialAdmin.`);
      }

      // Get Organization Admin role
      adminRole = await this.rbacService.findOrCreateSystemRole(
        data.organizationId,
        'ORGANIZATION_ADMIN',
      );

      // Create membership (idempotent - will fail silently if exists)
      const existingMembership = await this.membershipRepository.findOne({
        where: {
          userId: user.id,
          organizationId: data.organizationId,
        },
      });

      if (!existingMembership) {
        const membership = this.membershipRepository.create({
          userId: user.id,
          organizationId: data.organizationId,
          organizationName: data.organizationName, // Denormalized for performance
          roleId: adminRole.id,
        });

        await queryRunner.manager.save(membership);
      }

      await queryRunner.commitTransaction();
      transactionCommitted = true;
      this.logger.log(`Transaction committed for admin user ${user.id} (${user.email}).`);

      // Publish appropriate event based on whether this is a new user or existing user
      try {
        if (isNewUser) {
          // New user - publish USER_CREATED with invitation fields
          await this.eventPublisher.publish(
            EVENT_TYPES.USERS_USER_CREATED,
            {
              userId: user.id,
              organizationId: data.organizationId,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              invitationToken: user.invitationToken!,
              invitationExpiresAt: user.invitationExpiresAt!.toISOString(),
              roleId: adminRole.id,
              createdBy: null, // System-generated admin user
            },
            UserCreatedDto,
          );
        } else {
          // Existing user added to new org - publish MEMBERSHIP_CREATED (no invitation fields)
          await this.eventPublisher.publish(
            EVENT_TYPES.USERS_MEMBERSHIP_CREATED,
            {
              userId: user.id,
              organizationId: data.organizationId,
              organizationName: data.organizationName,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              roleId: adminRole.id,
              createdBy: null, // System-generated membership
            },
            MembershipCreatedDto,
          );
        }
      } catch (eventError) {
        // Log but don't fail - user/membership was successfully created
        this.logger.warn(
          `User ${user.id} ${isNewUser ? 'created' : 'membership added'} but event publishing failed: ${eventError instanceof Error ? eventError.message : 'Unknown error'}`,
        );
      }

      this.logger.log(`Successfully provisioned admin user: ${user.id}`);

      return user;
    } catch (error) {
      // Only rollback if transaction wasn't already committed
      if (!transactionCommitted) {
        await queryRunner.rollbackTransaction();
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to provision admin user: ${message}`,
        stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process debtor invitation batch
   * Creates provisional user accounts for debtors who don't already have users
   * Implements deduplication by email to prevent duplicate user creation
   */
  async processDebtorInvitationBatch(
    organizationId: string,
    invitations: {
      debtorProfileId: string;
      debtorIdentityId: string;
      email: string;
      firstName: string;
      lastName: string;
    }[],
  ): Promise<{
    debtorIdentityId: string;
    userId: string;
    email: string;
    status: UserStatus.PROVISIONAL | UserStatus.ACTIVE;
    isNewUser: boolean;
    invitationToken?: string;
    invitationExpiresAt?: string;
  }[]> {
    this.logger.log(`Processing debtor invitation batch with ${invitations.length} invitations`);

    const userMappings: {
      debtorIdentityId: string;
      userId: string;
      email: string;
      status: UserStatus.PROVISIONAL | UserStatus.ACTIVE;
      isNewUser: boolean;
      invitationToken?: string;
      invitationExpiresAt?: string;
    }[] = [];

    for (const invitation of invitations) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Check if user already exists (deduplication by email)
        let user = await this.userRepository.findOne({
          where: { email: invitation.email },
        });

        let isNewUser = false;

        if (!user) {
          // Generate invitation token
          const invitationToken = this.generateInvitationToken();
          const invitationExpiresAt = new Date();
          invitationExpiresAt.setHours(
            invitationExpiresAt.getHours() + this.INVITATION_EXPIRY_HOURS,
          );

          // Create provisional user
          user = this.userRepository.create({
            email: invitation.email,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            status: UserStatus.PROVISIONAL,
            invitationToken,
            invitationExpiresAt,
          });

          user = await queryRunner.manager.save(user);
          isNewUser = true;

          this.logger.log(
            `Created provisional user ${user.id} for debtor identity ${invitation.debtorIdentityId}`,
          );
        } else {
          this.logger.log(
            `Found existing user ${user.id} for email ${invitation.email}, linking to debtor identity ${invitation.debtorIdentityId}`,
          );
        }

        // 1. Get/Create DEBTOR role for this organization (from rbacService)
        const debtorRole = await this.rbacService.findOrCreateSystemRole(
          organizationId,
          'DEBTOR',
        );

        // 2. Create membership (idempotent - check if exists)
        const existingMembership = await this.membershipRepository.findOne({
          where: {
            userId: user.id,
            organizationId,
          },
        });

        if (!existingMembership) {
          const membership = this.membershipRepository.create({
            userId: user.id,
            organizationId,
            roleId: debtorRole.id,
          });

          await queryRunner.manager.save(membership);
          this.logger.log(`Created membership for user ${user.id} in org ${organizationId} with role DEBTOR`);
        }

        await queryRunner.commitTransaction();

        // Map status from UserStatus to event status
        const eventStatus =
          user.status === UserStatus.ACTIVE
            ? UserStatus.ACTIVE
            : UserStatus.PROVISIONAL;

        userMappings.push({
          debtorIdentityId: invitation.debtorIdentityId,
          userId: user.id,
          email: user.email,
          status: eventStatus,
          isNewUser,
          invitationToken: user.invitationToken || undefined,
          invitationExpiresAt: user.invitationExpiresAt?.toISOString(),
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to process invitation for debtor identity ${invitation.debtorIdentityId}: ${message}`,
          stack,
        );
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    this.logger.log(`Successfully processed ${userMappings.length} debtor invitations`);
    return userMappings;
  }


  /**
   * Process a single debtor invitation.
   * Creates a provisional user account for a debtor if one doesn't exist, or links to an existing one.
   * Implements deduplication by email.
   */
  async processSingleDebtorInvitation(
    debtorProfileId: string,
    organizationId: string,
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<{
    debtorProfileId: string;
    organizationId: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: UserStatus; // PROVISIONAL or ACTIVE
    isNewUser: boolean;
    invitationToken?: string;
    invitationExpiresAt?: string;
  }> {
    this.logger.log(`Processing single debtor invitation for ${email} (debtorProfileId: ${debtorProfileId})`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user already exists (deduplication by email)
      let user = await this.userRepository.findOne({
        where: { email },
      });

      let isNewUser = false;

      if (!user) {
        // Generate invitation token for the new provisional user
        const invitationToken = this.generateInvitationToken();
        const invitationExpiresAt = new Date();
        invitationExpiresAt.setHours(
          invitationExpiresAt.getHours() + this.INVITATION_EXPIRY_HOURS,
        );

        // Create provisional user
        user = this.userRepository.create({
          email,
          firstName,
          lastName,
          status: UserStatus.PROVISIONAL,
          invitationToken,
          invitationExpiresAt,
        });

        user = await queryRunner.manager.save(user);
        isNewUser = true;

        this.logger.log(
          `Created provisional user ${user.id} for debtorProfileId ${debtorProfileId}`,
        );
      } else {
        this.logger.log(
          `Found existing user ${user.id} for email ${email}, linking to debtorProfileId ${debtorProfileId}`,
        );
      }

      // 1. Get/Create DEBTOR role for this organization
      const debtorRole = await this.rbacService.findOrCreateSystemRole(
        organizationId,
        'DEBTOR',
      );

      // 2. Create membership (idempotent - check if exists)
      const existingMembership = await this.membershipRepository.findOne({
        where: {
          userId: user.id,
          organizationId,
        },
      });

      if (!existingMembership) {
        const membership = this.membershipRepository.create({
          userId: user.id,
          organizationId,
          roleId: debtorRole.id,
        });

        await queryRunner.manager.save(membership);
        this.logger.log(`Created membership for user ${user.id} in org ${organizationId} with role DEBTOR`);
      }

      await queryRunner.commitTransaction();

      return {
        debtorProfileId,
        organizationId,
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        isNewUser,
        invitationToken: user.invitationToken || undefined,
        invitationExpiresAt: user.invitationExpiresAt?.toISOString(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process single invitation for debtorProfileId ${debtorProfileId}: ${message}`,
        stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Verify user belongs to organization
   */
  private async verifyUserInOrganization(
    userId: string,
    organizationId: string | null,
  ): Promise<void> {
    const where: FindOptionsWhere<UserMembershipEntity> = {
      userId,
      organizationId: organizationId === null ? IsNull() : organizationId,
    };

    const count = await this.membershipRepository.count({ where });

    if (count === 0) {
      throw new UserNotFoundException(userId);
    }
  }

  /**
   * Generate secure invitation token
   */
  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  // ==================== PASSWORD RESET ====================

  /**
   * Sets password reset token for a user
   */
  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.userRepository.update(userId, {
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    });
  }

  /**
   * Finds a user by their password reset token
   */
  async findUserByPasswordResetToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
    });
  }

  /**
   * Updates password and clears reset token
   */
  async updatePasswordAndClearResetToken(userId: string, passwordHash: string): Promise<void> {
    await this.userRepository.update(userId, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });
  }

  // ==================== MAPPERS ====================

  private mapToUserSummaryDto(user: UserEntity, roleName?: UserRole): UserSummaryDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      roleName,
    };
  }

  private async mapToUserDetailDto(user: UserEntity): Promise<UserDetailDto> {
    const memberships: UserMembershipDto[] = await Promise.all(
      user.memberships.map(async (m) => {
        // Fetch role details
        const role = await this.rbacService.findRoleById(
          m.roleId,
          m.organizationId,
        );

        return {
          organizationId: m.organizationId,
          // TODO: Fetch organization name from api-organizations service via event or API call
          organizationName: m.organizationName, // Use nullable organizationName
          role,
          joinedAt: m.createdAt,
        };
      }),
    );

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      memberships,
      emails: user.emails.map((e) => this.mapToEmailResponseDto(e)),
      phoneNumbers: user.phoneNumbers.map((p) =>
        this.mapToPhoneNumberResponseDto(p),
      ),
      addresses: user.addresses.map((a) => this.mapToAddressResponseDto(a)),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToAddressResponseDto(address: UserAddressEntity): AddressResponseDto {
    return {
      id: address.id,
      isPrimary: address.isPrimary,
      street1: address.street1,
      street2: address.street2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      addressCategory: address.addressCategory,
      createdAt: address.createdAt,
    };
  }

  private mapToEmailResponseDto(email: UserEmailEntity): EmailResponseDto {
    return {
      id: email.id,
      email: email.email,
      isPrimary: email.isPrimary,
      createdAt: email.createdAt,
    };
  }

  private mapToPhoneNumberResponseDto(
    phone: UserPhoneNumberEntity,
  ): PhoneNumberResponseDto {
    return {
      id: phone.id,
      phoneNumber: phone.phoneNumber,
      isPrimary: phone.isPrimary,
      category: phone.category,
    };
  }
}