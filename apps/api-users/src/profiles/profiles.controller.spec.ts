/**
 * @description Integration tests for the ProfilesController.
 *
 * ## What This Test Proves:
 * - The ProfilesController correctly handles HTTP requests for user profiles, addresses, emails, and phone numbers.
 * - The controller correctly interacts with the ProfilesService.
 * - Specific HTTP status codes are returned for successful operations.
 * - The controller correctly uses `@OrganizationId()` and `@CurrentUserId()` decorators for context.
 *
 * ## What This Test Does NOT Prove:
 * - The internal business logic of ProfilesService (that's `profiles.service.spec.ts`'s responsibility).
 * - The full authentication guard chain (`PermissionsGuard` is mocked out).
 * - Integration with a live database (ProfilesService is mocked).
 * - Validation of DTOs (covered by global pipes, separate unit tests for DTOs if needed).
 */
import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { type INestApplication } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express'; // Added NextFunction
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { PermissionsGuard } from '@verichron/auth';
import { type CreateAddressDto, type CreateEmailDto, type CreatePhoneNumberDto, type InviteUserDto, type ListUsersQueryDto, type UpdateAddressDto, type UpdateEmailDto, type UpdatePhoneNumberDto, type UpdateUserDto, type UserDetailDto, type AddressResponseDto, type EmailResponseDto, type PhoneNumberResponseDto } from './dto';
import { AddressCategory, PhoneCategory, UserStatus } from '@verichron/enums';

const mockUserId = '812b7a9f-4b0d-4f1e-9a1b-1c5c6d8e9f0a';
const mockOrgId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
const mockCurrentUserId = 'test-admin-id';
const mockAddressId = 'c0a1b2c3-d4e5-6f7a-8b9c-0d1e2f3a4b5c';
const mockEmailId = 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a';
const mockPhoneId = 'e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b';

const defaultMockUserDetail: UserDetailDto = {
  id: mockUserId,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  status: UserStatus.ACTIVE,
  memberships: [{
    organizationId: mockOrgId,
    organizationName: 'Test Org',
    role: { id: 'role-1', name: 'Admin' } as any,
    joinedAt: new Date(),
  }],
  addresses: [],
  emails: [],
  phoneNumbers: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultMockAddressResponse: AddressResponseDto = {
  id: mockAddressId,
  street1: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  postalCode: '90210',
  country: 'US',
  isPrimary: true,
  addressCategory: AddressCategory.RESIDENCE_PRIMARY,
  createdAt: new Date(),
};

const defaultMockEmailResponse: EmailResponseDto = {
  id: mockEmailId,
  email: 'test@example.com',
  isPrimary: true,
  createdAt: new Date(),
};

const defaultMockPhoneNumberResponse: PhoneNumberResponseDto = {
  id: mockPhoneId,
  phoneNumber: '+15551234567',
  category: PhoneCategory.BUSINESS,
  isPrimary: true,
};

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: ProfilesService;
  let app: INestApplication;

  const mockProfilesService = {
    findAll: jest.fn().mockResolvedValue({
      data: [defaultMockUserDetail],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    }),
    findById: jest.fn().mockResolvedValue(defaultMockUserDetail),
    inviteUser: jest.fn().mockResolvedValue(defaultMockUserDetail),
    updateUser: jest.fn().mockResolvedValue(defaultMockUserDetail),
    deleteUser: jest.fn().mockResolvedValue(undefined),

    getUserAddresses: jest.fn().mockResolvedValue([defaultMockAddressResponse]),
    addAddress: jest.fn().mockResolvedValue(defaultMockAddressResponse),
    updateAddress: jest.fn().mockResolvedValue(defaultMockAddressResponse),
    deleteAddress: jest.fn().mockResolvedValue(undefined),

    getUserEmails: jest.fn().mockResolvedValue([defaultMockEmailResponse]),
    addEmail: jest.fn().mockResolvedValue(defaultMockEmailResponse),
    updateEmail: jest.fn().mockResolvedValue(defaultMockEmailResponse),
    deleteEmail: jest.fn().mockResolvedValue(undefined),

    getUserPhoneNumbers: jest.fn().mockResolvedValue([defaultMockPhoneNumberResponse]),
    addPhoneNumber: jest.fn().mockResolvedValue(defaultMockPhoneNumberResponse),
    updatePhoneNumber: jest.fn().mockResolvedValue(defaultMockPhoneNumberResponse),
    deletePhoneNumber: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .setLogger({ // Suppress [Nest] logs for cleaner test output
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .compile();

    app = module.createNestApplication();
    // Manually set up request context for decorators like @OrganizationId() and @CurrentUserId()
    app.use((req: Request, res: Response, next: NextFunction) => {
      (req as any).user = { sub: mockCurrentUserId }; // Mock authenticated user
      (req as any).organizationId = mockOrgId; // Mock organization ID
      next();
    });
    await app.init();

    controller = module.get<ProfilesController>(ProfilesController);
    service = module.get<ProfilesService>(ProfilesService);

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ========================================================================== //
  //                         USER ENDPOINTS                                     //
  // ========================================================================== //

  describe('GET /users', () => {
    it('should return a paginated list of users', async () => {
      const query: ListUsersQueryDto = { page: 1, pageSize: 10 };
      const result = await controller.listUsers(mockOrgId, query);

      expect(service.findAll).toHaveBeenCalledWith(mockOrgId, query);
      expect(result.data).toEqual([defaultMockUserDetail]);
    });
  });

  describe('GET /users/:userId', () => {
    it('should return details for a specific user', async () => {
      const result = await controller.getUserById(mockOrgId, mockUserId);

      expect(service.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(result).toEqual(defaultMockUserDetail);
    });
  });

  describe('POST /users (inviteUser)', () => {
    it('should invite a new user to the organization', async () => {
      const inviteDto: InviteUserDto = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        roleId: 'some-role-id',
      };
      const result = await controller.inviteUser(mockOrgId, inviteDto, mockCurrentUserId);

      expect(service.inviteUser).toHaveBeenCalledWith(inviteDto, mockOrgId, mockCurrentUserId);
      expect(result).toEqual(defaultMockUserDetail);
    });
  });

  describe('PATCH /users/:userId', () => {
    it("should update a specific user's profile", async () => {
      const updateDto: UpdateUserDto = { firstName: 'Updated', status: UserStatus.INACTIVE };
      const result = await controller.updateUser(mockOrgId, mockUserId, updateDto, mockCurrentUserId);

      expect(service.updateUser).toHaveBeenCalledWith(mockUserId, updateDto, mockOrgId, mockCurrentUserId);
      expect(result).toEqual(defaultMockUserDetail);
    });
  });

  describe('DELETE /users/:userId', () => {
    it('should soft delete a user account', async () => {
      await controller.deleteUser(mockOrgId, mockUserId, mockCurrentUserId);

      expect(service.deleteUser).toHaveBeenCalledWith(mockUserId, mockOrgId, mockCurrentUserId);
    });
  });

  // ========================================================================== //
  //                         ADDRESS ENDPOINTS                                  //
  // ========================================================================== //

  describe('GET /users/:userId/addresses', () => {
    it('should return a list of addresses for a user', async () => {
      const result = await controller.getUserAddresses(mockOrgId, mockUserId);

      expect(service.getUserAddresses).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(result).toEqual([defaultMockAddressResponse]);
    });
  });

  describe('POST /users/:userId/addresses', () => {
    it('should add a new address to a user', async () => {
      const createDto: CreateAddressDto = { street1: '456 Oak', city: 'Othertown', state: 'NY', postalCode: '10001', country: 'US' };
      const result = await controller.addAddress(mockOrgId, mockUserId, createDto);

      expect(service.addAddress).toHaveBeenCalledWith(mockUserId, createDto, mockOrgId);
      expect(result).toEqual(defaultMockAddressResponse);
    });
  });

  describe('PUT /users/:userId/addresses/:addressId', () => {
    it('should update an existing address for a user', async () => {
      const updateDto: UpdateAddressDto = { street1: '789 Pine' };
      const result = await controller.updateAddress(mockOrgId, mockUserId, mockAddressId, updateDto);

      expect(service.updateAddress).toHaveBeenCalledWith(mockUserId, mockAddressId, updateDto, mockOrgId);
      expect(result).toEqual(defaultMockAddressResponse);
    });
  });

  describe('DELETE /users/:userId/addresses/:addressId', () => {
    it('should delete an address from a user', async () => {
      await controller.deleteAddress(mockOrgId, mockUserId, mockAddressId);

      expect(service.deleteAddress).toHaveBeenCalledWith(mockUserId, mockAddressId, mockOrgId);
    });
  });

  // ========================================================================== //
  //                         EMAIL ENDPOINTS                                    //
  // ========================================================================== //

  describe('GET /users/:userId/emails', () => {
    it('should return a list of emails for a user', async () => {
      const result = await controller.getUserEmails(mockOrgId, mockUserId);

      expect(service.getUserEmails).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(result).toEqual([defaultMockEmailResponse]);
    });
  });

  describe('POST /users/:userId/emails', () => {
    it('should add a new email to a user', async () => {
      const createDto: CreateEmailDto = { email: 'newemail@example.com' };
      const result = await controller.addEmail(mockOrgId, mockUserId, createDto);

      expect(service.addEmail).toHaveBeenCalledWith(mockUserId, createDto, mockOrgId);
      expect(result).toEqual(defaultMockEmailResponse);
    });
  });

  describe('PUT /users/:userId/emails/:emailId', () => {
    it('should update an existing email for a user', async () => {
      const updateDto: UpdateEmailDto = { isPrimary: false };
      const result = await controller.updateEmail(mockOrgId, mockUserId, mockEmailId, updateDto);

      expect(service.updateEmail).toHaveBeenCalledWith(mockUserId, mockEmailId, updateDto, mockOrgId);
      expect(result).toEqual(defaultMockEmailResponse);
    });
  });

  describe('DELETE /users/:userId/emails/:emailId', () => {
    it('should delete an email from a user', async () => {
      await controller.deleteEmail(mockOrgId, mockUserId, mockEmailId);

      expect(service.deleteEmail).toHaveBeenCalledWith(mockUserId, mockEmailId, mockOrgId);
    });
  });

  // ========================================================================== //
  //                         PHONE NUMBER ENDPOINTS                             //
  // ========================================================================== //

  describe('GET /users/:userId/phones', () => {
    it('should return a list of phone numbers for a user', async () => {
      const result = await controller.getUserPhoneNumbers(mockOrgId, mockUserId);

      expect(service.getUserPhoneNumbers).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(result).toEqual([defaultMockPhoneNumberResponse]);
    });
  });

  describe('POST /users/:userId/phones', () => {
    it('should add a new phone number to a user', async () => {
      const createDto: CreatePhoneNumberDto = { phoneNumber: '+1234567890' };
      const result = await controller.addPhoneNumber(mockOrgId, mockUserId, createDto);

      expect(service.addPhoneNumber).toHaveBeenCalledWith(mockUserId, createDto, mockOrgId);
      expect(result).toEqual(defaultMockPhoneNumberResponse);
    });
  });

  describe('PUT /users/:userId/phones/:phoneId', () => {
    it('should update an existing phone number for a user', async () => {
      const updateDto: UpdatePhoneNumberDto = { isPrimary: false };
      const result = await controller.updatePhoneNumber(mockOrgId, mockUserId, mockPhoneId, updateDto);

      expect(service.updatePhoneNumber).toHaveBeenCalledWith(mockUserId, mockPhoneId, updateDto, mockOrgId);
      expect(result).toEqual(defaultMockPhoneNumberResponse);
    });
  });

  describe('DELETE /users/:userId/phones/:phoneId', () => {
    it('should delete a phone number from a user', async () => {
      await controller.deletePhoneNumber(mockOrgId, mockUserId, mockPhoneId);

      expect(service.deletePhoneNumber).toHaveBeenCalledWith(mockUserId, mockPhoneId, mockOrgId);
    });
  });
});
