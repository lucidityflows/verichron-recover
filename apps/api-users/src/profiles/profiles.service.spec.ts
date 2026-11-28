import { type RoleEntity } from '../rbac/entities/role.entity';

/**
 * @system-rule R-U-PROF-001, R-U-PROF-002, R-U-PROF-003
 * @description Unit tests for the ProfilesService.
 *
 * ## What This Test Proves:
 * - The user invitation flow correctly handles new and existing users.
 * - The user activation flow correctly validates invitation tokens and their expiration.
 * - The user update logic correctly publishes events when a user's profile or status changes.
 *
 * ## What This Test Does NOT Prove:
 * - All edge cases for address, email, and phone number management.
 * - Race conditions during user creation or updates.
 */
// src/profiles/profiles.service.spec.ts
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository, DataSource } from 'typeorm';
import { ProfilesService } from './profiles.service';
import {
  UserEntity,
  UserMembershipEntity,
  UserAddressEntity,
  UserEmailEntity,
  UserPhoneNumberEntity,
} from './entities';
import { EventPublisher } from '@verichron/event-publisher';
import { RbacService } from '../rbac/rbac.service';
import {
  UserNotFoundException,
  UserAlreadyExistsException,
  InvalidInvitationTokenException,
  InvitationExpiredException,
} from './errors';
import { UserStatus, AddressCategory } from '@verichron/enums';
import { EVENT_TYPES } from '@verichron/events';
import { UserCreatedDto, UserActivatedDto, UserProfileUpdatedDto, UserStatusChangedDto } from '../events/event-dto';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let userRepository: Repository<UserEntity>;
  let membershipRepository: Repository<UserMembershipEntity>;
  let addressRepository: Repository<UserAddressEntity>;
  let eventPublisher: EventPublisher;
  let rbacService: RbacService;
  let dataSource: DataSource;

  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    middleName: 'Jameson',
    suffix: "",
    passwordHash: 'hashed-password',
    status: UserStatus.ACTIVE,
    invitationToken: null,
    invitationExpiresAt: new Date(),
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    memberships: [],
    addresses: [],
    emails: [],
    phoneNumbers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  

  const mockRole: RoleEntity = {
    id: 'role-789',
    organizationId: 'org-456',
    name: 'Test Role',
    description: 'A test role',
    isSystemRole: false,
    rolePermissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPlatformRole: () => false,
  };

  const mockMembership: UserMembershipEntity = {
    id: 'membership-123', // Add this line
    userId: 'user-123',
    organizationId: 'org-456',
    roleId: 'role-789',
    organizationName: 'Test Org',
    user: mockUser,
    role: mockRole,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPlatformMembership: () => false,
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              innerJoinAndSelect: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(UserMembershipEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
          },
        {
          provide: getRepositoryToken(UserAddressEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserEmailEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserPhoneNumberEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
                find: jest.fn(),
                findOne: jest.fn(),
              },
            }),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: RbacService,
          useValue: {
            findRoleById: jest.fn(),
            findOrCreateSystemRole: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    userRepository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    membershipRepository = module.get<Repository<UserMembershipEntity>>(
      getRepositoryToken(UserMembershipEntity),
    );
    addressRepository = module.get<Repository<UserAddressEntity>>(
      getRepositoryToken(UserAddressEntity),
    );
    eventPublisher = module.get<EventPublisher>(EventPublisher);
    rbacService = module.get<RbacService>(RbacService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('findById', () => {
    it('should return user details', async () => {
      const userWithRelations = {
        ...mockUser,
        memberships: [mockMembership],
        addresses: [],
        emails: [],
        phoneNumbers: [],
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithRelations);
      jest.spyOn(rbacService, 'findRoleById').mockResolvedValue({
        id: 'role-789',
        name: 'Test Role',
        description: 'Test role description',
        organizationId: 'org-456',
        isSystemRole: false,
        userCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.findById('user-123', 'org-456');

      expect(result.id).toBe('user-123');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.memberships).toHaveLength(1);
      expect(result.memberships[0].organizationId).toBe('org-456');
    });

    it('should throw UserNotFoundException when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findById('nonexistent', 'org-456')).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('should throw UserNotFoundException when user not in organization', async () => {
      const userWithoutMembership = {
        ...mockUser,
        memberships: [],
      };

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue(userWithoutMembership);

      await expect(service.findById('user-123', 'wrong-org')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('inviteUser', () => {
    const inviteDto = {
      email: 'new.user@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      roleId: 'role-789',
    };

    it('should create user and send invitation', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);

      // const dataSource = service['dataSource']; // Removed in favor of local variable
      const queryRunner = await dataSource.createQueryRunner();
      jest.spyOn(queryRunner.manager, 'save').mockResolvedValue(mockUser);
      jest.spyOn(membershipRepository, 'create').mockReturnValue(mockMembership);

      // Mock findById for the return value
      jest.spyOn(service, 'findById').mockResolvedValue({
        id: mockUser.id,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
        status: mockUser.status,
        memberships: [
          {
            organizationId: 'org-456',
            organizationName: 'Test Org',
            role: {
              id: 'role-789',
              name: 'Test Role',
            } as any,
            joinedAt: new Date(),
          },
        ],
        emails: [],
        phoneNumbers: [],
        addresses: [],
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      } as any);

      const result = await service.inviteUser(inviteDto, 'org-456', 'admin-123');

      expect(result.email).toBe('john.doe@example.com');
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_USER_CREATED,
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          roleId: 'role-789',
        }),
        UserCreatedDto,
      );
    });

    it('should throw UserAlreadyExistsException when email exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(
        service.inviteUser(inviteDto, 'org-456', 'admin-123'),
      ).rejects.toThrow(UserAlreadyExistsException);
    });
  });

  describe('activateUser', () => {
    const activateDto = {
      invitationToken: 'valid-token-123',
      password: 'SecureP@ssw0rd',
      passwordConfirmation: 'SecureP@ssw0rd',
    };

    it('should activate user account', async () => {
      const pendingUser = {
        ...mockUser,
        status: UserStatus.PENDING,
        invitationToken: 'valid-token-123',
        invitationExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        memberships: [mockMembership],
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(pendingUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...pendingUser,
        status: UserStatus.ACTIVE,
        passwordHash: 'hashed-password',
        invitationToken: null,
        invitationExpiresAt: null,
      });

      jest.spyOn(service, 'findById').mockResolvedValue({
        id: pendingUser.id,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        email: pendingUser.email,
        status: UserStatus.ACTIVE,
        memberships: [],
        emails: [],
        phoneNumbers: [],
        addresses: [],
        createdAt: pendingUser.createdAt,
        updatedAt: pendingUser.updatedAt,
      } as any);

      const result = await service.activateUser(activateDto);

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_USER_ACTIVATED,
        expect.objectContaining({
          userId: mockUser.id,
        }),
        UserActivatedDto,
      );
    });

    it('should throw InvalidInvitationTokenException for invalid token', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.activateUser(activateDto)).rejects.toThrow(
        InvalidInvitationTokenException,
      );
    });

    it('should throw InvitationExpiredException for expired token', async () => {
      const expiredUser = {
        ...mockUser,
        status: UserStatus.PENDING,
        invitationToken: 'valid-token-123',
        invitationExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(expiredUser);

      await expect(service.activateUser(activateDto)).rejects.toThrow(
        InvitationExpiredException,
      );
    });
  });

  describe('updateUser', () => {
    const updateDto = {
      firstName: 'Johnny',
      lastName: 'Doe',
    };

    it('should update user profile', async () => {
      const userWithMembership = {
        ...mockUser,
        memberships: [mockMembership],
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithMembership);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...userWithMembership,
        firstName: 'Johnny',
      });

      jest.spyOn(service, 'findById').mockResolvedValue({
        id: mockUser.id,
        firstName: 'Johnny',
        lastName: mockUser.lastName,
        email: mockUser.email,
        status: mockUser.status,
        memberships: [],
        emails: [],
        phoneNumbers: [],
        addresses: [],
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      } as any);

      const result = await service.updateUser(
        'user-123',
        updateDto,
        'org-456',
        'admin-123',
      );

      expect(result.firstName).toBe('Johnny');
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_USER_PROFILE_UPDATED,
        expect.objectContaining({
          userId: mockUser.id,
          updatedFields: expect.arrayContaining(['firstName', 'lastName']),
        }),
        UserProfileUpdatedDto,
      );
    });

    it('should publish status changed event when status changes', async () => {
      const userWithMembership = {
        ...mockUser,
        memberships: [mockMembership],
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithMembership);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...userWithMembership,
        status: UserStatus.SUSPENDED,
      });

      jest.spyOn(service, 'findById').mockResolvedValue({
        id: mockUser.id,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
        status: UserStatus.SUSPENDED,
        memberships: [],
        emails: [],
        phoneNumbers: [],
        addresses: [],
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      } as any);

      await service.updateUser(
        'user-123',
        { status: UserStatus.SUSPENDED },
        'org-456',
        'admin-123',
      );

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_USER_STATUS_CHANGED,
        expect.objectContaining({
          userId: mockUser.id,
          oldStatus: UserStatus.ACTIVE,
          newStatus: UserStatus.SUSPENDED,
        }),
        UserStatusChangedDto,
      );
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user', async () => {
      const userWithMembership = {
        ...mockUser,
        memberships: [mockMembership],
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(userWithMembership);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        ...userWithMembership,
        status: UserStatus.INACTIVE,
      });

      await service.deleteUser('user-123', 'org-456', 'admin-123');

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.INACTIVE,
        }),
      );

      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_USER_STATUS_CHANGED,
        expect.objectContaining({
          userId: mockUser.id,
          oldStatus: UserStatus.ACTIVE,
          newStatus: UserStatus.INACTIVE,
          reason: 'User deleted',
        }),
        UserStatusChangedDto,
      );
    });
  });

  describe('addAddress', () => {
    const addressDto = {
      street1: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
      isPrimary: true,
      category: AddressCategory.RESIDENCE_PRIMARY,
    };

    it('should add address to user', async () => {
      jest
        .spyOn(membershipRepository, 'findOne')
        .mockResolvedValue(mockMembership);
      jest.spyOn(addressRepository, 'update').mockResolvedValue({} as any);

      const newAddress: UserAddressEntity = {
        id: 'addr-123',
        userId: 'user-123',
        ...addressDto,
        addressCategory: addressDto.category || ('RESIDENCE_PRIMARY' as AddressCategory),
        user: mockUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(addressRepository, 'create').mockReturnValue(newAddress);
      jest.spyOn(addressRepository, 'save').mockResolvedValue(newAddress);

      const result = await service.addAddress('user-123', addressDto, 'org-456');

      expect(result.street1).toBe('123 Main St');
      expect(result.isPrimary).toBe(true);
      expect(addressRepository.update).toHaveBeenCalledWith(
        { userId: 'user-123', isPrimary: true },
        { isPrimary: false },
      );
    });
  });

  describe('provisionInitialAdmin', () => {
    const provisionData = {
      organizationId: 'org-new',
      organizationName: 'New Organization',
      email: 'admin@neworg.com',
      firstName: 'Admin',
      lastName: 'User',
    };

    it('should create admin user for new organization', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(rbacService, 'findOrCreateSystemRole').mockResolvedValue({
        id: 'admin-role-id',
        name: 'ORGANIZATION_ADMIN',
      } as any);

      // const dataSource = service['dataSource']; // Removed in favor of local variable
      const queryRunner = await dataSource.createQueryRunner();
      const savedUser = { ...mockUser, email: provisionData.email, firstName: provisionData.firstName, lastName: provisionData.lastName };
      jest.spyOn(queryRunner.manager, 'save').mockResolvedValue(savedUser);
      jest
        .spyOn(membershipRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(membershipRepository, 'create')
        .mockReturnValue(mockMembership);

      const result = await service.provisionInitialAdmin(provisionData);

      expect(result).toBeDefined();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.USERS_USER_CREATED,
        expect.objectContaining({
          email: provisionData.email,
          organizationId: provisionData.organizationId,
        }),
        UserCreatedDto,
      );
    });

    it('should be idempotent and not fail if user exists', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(membershipRepository, 'findOne')
        .mockResolvedValue(mockMembership);
      jest.spyOn(rbacService, 'findOrCreateSystemRole').mockResolvedValue({
        id: 'admin-role-id',
        name: 'ORGANIZATION_ADMIN',
      } as any);

      // const dataSource = service['dataSource']; // Removed in favor of local variable
      const queryRunner = await dataSource.createQueryRunner();

      const result = await service.provisionInitialAdmin(provisionData);

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };

      jest
        .spyOn(userRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      const result = await service.findAll('org-456', {
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(userRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder);

      await service.findAll('org-456', {
        page: 1,
        pageSize: 20,
        status: UserStatus.ACTIVE,
        search: 'john',
        roleId: 'role-789',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :status',
        { status: UserStatus.ACTIVE },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%john%' }),
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'membership.roleId = :roleId',
        { roleId: 'role-789' },
      );
    });
  });
});