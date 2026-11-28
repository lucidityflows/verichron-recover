import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserAddressEntity, UserEmailEntity, UserPhoneNumberEntity } from './entities';
import { UserDetailDto, PaginatedUsersResponseDto, UserSummaryDto, AddressResponseDto, EmailResponseDto, PhoneNumberResponseDto, UserMembershipDto } from './dto';
import { RoleResponseDto } from '../rbac/dto';
import { RoleEntity } from '../rbac/entities';
import { UserNotFoundException } from './errors';
import { UserStatus } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { UserStatusChangedDto } from '../events/event-dto';

/**
 * Ops Service for User Management
 *
 * Exclusively for Platform Admins (ui-ops).
 * Bypasses all organization context checks.
 * STRICTLY SEPARATED from tenant business logic.
 */
@Injectable()
export class ProfilesOpsService {
  private readonly logger = new Logger(ProfilesOpsService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,

    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * List all users system-wide
   * Optional filtering by organizationId
   */
  async findAll(
    query: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: UserStatus;
      organizationId?: string;
    }
  ): Promise<PaginatedUsersResponseDto> {
    const { page = 1, pageSize = 20, search, status, organizationId } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.memberships', 'membership');

    // Optional Org Filter
    if (organizationId) {
      queryBuilder.andWhere('membership.organizationId = :organizationId', { organizationId });
    }

    // Status Filter
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // Search Filter
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const skip = (page - 1) * pageSize;
    
    queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(pageSize);
    
    const users = await queryBuilder.getMany();

    return {
      data: users.map(user => this.mapToUserSummaryDto(user)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get full user details system-wide
   * No membership checks required for admins.
   */
  async findById(userId: string): Promise<UserDetailDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'memberships', 
        'addresses', 
        'emails', 
        'phoneNumbers'
      ],
    });

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return this.mapToUserDetailDto(user);
  }

  /**
   * Admin Force-Status Change
   * Can suspend/activate any user system-wide.
   */
  async updateUserStatus(
    userId: string, 
    status: UserStatus, 
    adminId: string
  ): Promise<UserDetailDto> {
    this.logger.log(`Admin ${adminId} changing status of user ${userId} to ${status}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UserNotFoundException(userId);

    const oldStatus = user.status;
    user.status = status;
    await this.userRepository.save(user);

    // Publish event
    await this.eventPublisher.publish(
      EVENT_TYPES.USERS_USER_STATUS_CHANGED,
      {
        userId,
        organizationId: null, // Admin action is null context
        oldStatus,
        newStatus: status,
        reason: 'Platform Admin Override',
        statusChangedAt: new Date().toISOString(),
        changedBy: adminId,
      },
      UserStatusChangedDto
    );

    return this.findById(userId);
  }

  // ==================== HELPERS ====================

  /**
   * Internal role lookup for mapping.
   * Directly accesses repository to avoid dependency on tenant RbacService.
   */
  private async findRoleById(roleId: string): Promise<RoleResponseDto | null> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) return null;

    // Use a simplified mapper for RoleResponseDto since we don't need user counts here usually
    // Or we can implement a basic one.
    return {
      id: role.id,
      organizationId: role.organizationId,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      userCount: 0, // Not calculating this for list view performance
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  // ==================== MAPPERS ====================
  // Copied/Adapted from ProfilesService to ensure isolation.
  // We do NOT want to import mappers from the tenant service to avoid circular deps.

  private mapToUserSummaryDto(user: UserEntity): UserSummaryDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
    };
  }

  private async mapToUserDetailDto(user: UserEntity): Promise<UserDetailDto> {
    const memberships: UserMembershipDto[] = await Promise.all(
      (user.memberships || []).map(async (m) => {
        const role = await this.findRoleById(m.roleId);
        
        // If role not found (data integrity issue), return a placeholder or throw
        if (!role) {
            this.logger.warn(`Role ${m.roleId} not found for user ${user.id}`);
        }

        return {
          organizationId: m.organizationId,
          organizationName: m.organizationName,
          role: role!, // Type assertion as we expect role to exist
          joinedAt: m.createdAt,
        };
      })
    );

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      memberships,
      emails: (user.emails || []).map(this.mapToEmailResponseDto),
      phoneNumbers: (user.phoneNumbers || []).map(this.mapToPhoneNumberResponseDto),
      addresses: (user.addresses || []).map(this.mapToAddressResponseDto),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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

  private mapToPhoneNumberResponseDto(phone: UserPhoneNumberEntity): PhoneNumberResponseDto {
    return {
      id: phone.id,
      phoneNumber: phone.phoneNumber,
      isPrimary: phone.isPrimary,
      category: phone.category,
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
}
