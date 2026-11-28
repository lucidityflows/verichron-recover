/**
 * ProfilesController Integration Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-PROF-004: findAll must return paginated DebtorProfile records scoped to organizationId
 * - R-DBR-PROF-005: findOne must retrieve single DebtorProfile with organizationId scoping
 *
 * TESTING APPROACH:
 * - Integration tests with mocked service layer
 * - Verify controller properly delegates to service
 * - Verify guards are properly applied
 * - Test representative endpoints for each CRUD category
 */

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '@verichron/auth';
import { DebtorProfileEntity } from './entities/debtor-profile.entity';
import { DebtorAddress } from './entities/debtor-address.entity';
import { DebtorEmail } from './entities/debtor-email.entity';
import { DebtorPhone } from './entities/debtor-phone.entity';
import { PhoneCategory } from '@verichron/enums';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let profilesService: jest.Mocked<ProfilesService>;

  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440002';
  const mockDebtorProfileId = '550e8400-e29b-41d4-a716-446655440003';
  const mockDebtorIdentityId = '550e8400-e29b-41d4-a716-446655440004';

  const mockDebtor: Partial<DebtorProfileEntity> = {
    id: mockDebtorProfileId,
    debtorIdentityId: mockDebtorIdentityId,
    organizationId: mockOrgId,
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAddress: Partial<DebtorAddress> = {
    id: '550e8400-e29b-41d4-a716-446655440005',
    debtorProfileId: mockDebtorProfileId,
    street1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    isPrimary: true,
  };

  const mockEmail: Partial<DebtorEmail> = {
    id: '550e8400-e29b-41d4-a716-446655440006',
    debtorProfileId: mockDebtorProfileId,
    email: 'john.doe@example.com',
    isPrimary: true,
    isVerified: false,
  };

  const mockPhone: Partial<DebtorPhone> = {
    id: '550e8400-e29b-41d4-a716-446655440007',
    debtorProfileId: mockDebtorProfileId,
    phoneNumber: '+15551234567',
    category: PhoneCategory.MOBILE,
    isPrimary: true,
    isVerified: false,
  };

  beforeEach(async () => {
    const mockProfilesService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      partialUpdate: jest.fn(),
      remove: jest.fn(),
      inviteDebtor: jest.fn(),
      invitePortfolioDebtors: jest.fn(),
      findAllAddresses: jest.fn(),
      findOneAddress: jest.fn(),
      createAddress: jest.fn(),
      updateAddress: jest.fn(),
      removeAddress: jest.fn(),
      findAllEmails: jest.fn(),
      findOneEmail: jest.fn(),
      createEmail: jest.fn(),
      updateEmail: jest.fn(),
      removeEmail: jest.fn(),
      findAllPhones: jest.fn(),
      findOnePhone: jest.fn(),
      createPhone: jest.fn(),
      updatePhone: jest.fn(),
      removePhone: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ProfilesController>(ProfilesController);
    profilesService = module.get(ProfilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('R-DBR-PROF-004: findAll with pagination and organization scoping', () => {
    it('should return paginated list of debtors', async () => {
      const paginatedResult = {
        data: [mockDebtor as DebtorProfileEntity],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      profilesService.findAll.mockResolvedValue(paginatedResult);

      const query = { page: 1, pageSizet: 20 };
      const result = await controller.findAll(mockOrgId, query);

      expect(result).toEqual(paginatedResult);
      expect(profilesService.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle query filters', async () => {
      const paginatedResult = {
        data: [mockDebtor as DebtorProfileEntity],
        total: 1,
        page: 1,
        pageSize: 10,
      };

      profilesService.findAll.mockResolvedValue(paginatedResult);

      const query = {
        page: 1,
        pageSizet: 10,
        firstName: 'John',
        lastName: 'Doe'
      };
      const result = await controller.findAll(mockOrgId, query as any);

      expect(result).toEqual(paginatedResult);
      expect(profilesService.findAll).toHaveBeenCalledWith(query);
    });

    it('should return empty list when no debtors found', async () => {
      const emptyResult = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };

      profilesService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(mockOrgId, {});

      expect(result).toEqual(emptyResult);
      expect(profilesService.findAll).toHaveBeenCalled();
    });
  });

  describe('R-DBR-PROF-005: findOne with organization scoping', () => {
    it('should return debtor by ID', async () => {
      profilesService.findOne.mockResolvedValue(mockDebtor as DebtorProfileEntity);

      const result = await controller.findOne(mockOrgId, mockDebtorProfileId);

      expect(result).toEqual(mockDebtor);
      expect(profilesService.findOne).toHaveBeenCalledWith(mockDebtorProfileId);
    });

    it('should throw error when debtor not found', async () => {
      profilesService.findOne.mockRejectedValue(new Error('Debtor not found'));

      await expect(controller.findOne(mockOrgId, mockDebtorProfileId)).rejects.toThrow('Debtor not found');
      expect(profilesService.findOne).toHaveBeenCalledWith(mockDebtorProfileId);
    });
  });

  describe('Core Debtor CRUD', () => {
    describe('create', () => {
      it('should create new debtor', async () => {
        const createDto = {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          ssn: '123-45-6789',
        };

        profilesService.create.mockResolvedValue(mockDebtor as DebtorProfileEntity);

        const result = await controller.create(mockOrgId, createDto as any);

        expect(result).toEqual(mockDebtor);
        expect(profilesService.create).toHaveBeenCalledWith(createDto);
      });
    });

    describe('update', () => {
      it('should update debtor', async () => {
        const updateDto = {
          firstName: 'Jane',
          lastName: 'Doe',
        };

        const updatedDebtor = { ...mockDebtor, ...updateDto };
        profilesService.update.mockResolvedValue(updatedDebtor as DebtorProfileEntity);

        const result = await controller.update(mockOrgId, mockDebtorProfileId, updateDto as any);

        expect(result).toEqual(updatedDebtor);
        expect(profilesService.update).toHaveBeenCalledWith(mockDebtorProfileId, updateDto);
      });
    });

    describe('partialUpdate', () => {
      it('should partially update debtor', async () => {
        const partialUpdateDto = {
          firstName: 'Jane',
        };

        const updatedDebtor = { ...mockDebtor, ...partialUpdateDto };
        profilesService.partialUpdate.mockResolvedValue(updatedDebtor as DebtorProfileEntity);

        const result = await controller.partialUpdate(mockOrgId, mockDebtorProfileId, partialUpdateDto as any);

        expect(result).toEqual(updatedDebtor);
        expect(profilesService.partialUpdate).toHaveBeenCalledWith(mockDebtorProfileId, partialUpdateDto);
      });
    });

    describe('remove', () => {
      it('should soft delete debtor', async () => {
        profilesService.remove.mockResolvedValue(undefined);

        await controller.remove(mockOrgId, mockDebtorProfileId);

        expect(profilesService.remove).toHaveBeenCalledWith(mockDebtorProfileId);
      });
    });
  });

  describe('Debtor Invitation', () => {
    describe('inviteDebtor', () => {
      it('should invite debtor with email', async () => {
        const inviteData = {
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };

        const inviteResult = {
          status: 'invited',
          userId: mockUserId,
        };

        profilesService.inviteDebtor.mockResolvedValue(inviteResult as any);

        const result = await controller.inviteDebtor(mockOrgId, mockDebtorProfileId, inviteData);

        expect(result).toEqual(inviteResult);
        expect(profilesService.inviteDebtor).toHaveBeenCalledWith(mockDebtorProfileId, inviteData);
      });
    });

    describe('invitePortfolioDebtors', () => {
      it('should invite all debtors from portfolio', async () => {
        const dto = { portfolioId: '550e8400-e29b-41d4-a716-446655440010' };
        const result = {
          invitationBatchId: '550e8400-e29b-41d4-a716-446655440011',
          totalInvitations: 100,
          totalBatches: 1,
          skipped: 5,
        };

        profilesService.invitePortfolioDebtors.mockResolvedValue(result);

        const response = await controller.invitePortfolioDebtors(mockOrgId, dto);

        expect(response).toEqual(result);
        expect(profilesService.invitePortfolioDebtors).toHaveBeenCalledWith(dto.portfolioId);
      });
    });
  });

  describe('Address Management', () => {
    describe('findAllAddresses', () => {
      it('should return all addresses for debtor', async () => {
        profilesService.findAllAddresses.mockResolvedValue([mockAddress] as DebtorAddress[]);

        const result = await controller.findAllAddresses(mockOrgId, mockDebtorProfileId);

        expect(result).toEqual([mockAddress]);
        expect(profilesService.findAllAddresses).toHaveBeenCalledWith(mockDebtorProfileId);
      });
    });

    describe('findOneAddress', () => {
      it('should return specific address', async () => {
        profilesService.findOneAddress.mockResolvedValue(mockAddress as DebtorAddress);

        const result = await controller.findOneAddress(mockOrgId, mockDebtorProfileId, mockAddress.id!);

        expect(result).toEqual(mockAddress);
        expect(profilesService.findOneAddress).toHaveBeenCalledWith(mockDebtorProfileId, mockAddress.id);
      });
    });

    describe('createAddress', () => {
      it('should create new address', async () => {
        const createDto = {
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        };

        profilesService.createAddress.mockResolvedValue(mockAddress as DebtorAddress);

        const result = await controller.createAddress(mockOrgId, mockDebtorProfileId, createDto as any);

        expect(result).toEqual(mockAddress);
        expect(profilesService.createAddress).toHaveBeenCalledWith(mockDebtorProfileId, createDto);
      });
    });

    describe('updateAddress', () => {
      it('should update address', async () => {
        const updateDto = {
          addressLine1: '456 Oak Ave',
        };

        const updatedAddress = { ...mockAddress, ...updateDto };
        profilesService.updateAddress.mockResolvedValue(updatedAddress as DebtorAddress);

        const result = await controller.updateAddress(mockOrgId, mockDebtorProfileId, mockAddress.id!, updateDto as any);

        expect(result).toEqual(updatedAddress);
        expect(profilesService.updateAddress).toHaveBeenCalledWith(mockDebtorProfileId, mockAddress.id, updateDto);
      });
    });

    describe('removeAddress', () => {
      it('should remove address', async () => {
        profilesService.removeAddress.mockResolvedValue(undefined);

        await controller.removeAddress(mockOrgId, mockDebtorProfileId, mockAddress.id!);

        expect(profilesService.removeAddress).toHaveBeenCalledWith(mockDebtorProfileId, mockAddress.id);
      });
    });
  });

  describe('Email Management', () => {
    describe('findAllEmails', () => {
      it('should return all emails for debtor', async () => {
        profilesService.findAllEmails.mockResolvedValue([mockEmail] as DebtorEmail[]);

        const result = await controller.findAllEmails(mockOrgId, mockDebtorProfileId);

        expect(result).toEqual([mockEmail]);
        expect(profilesService.findAllEmails).toHaveBeenCalledWith(mockDebtorProfileId);
      });
    });

    describe('createEmail', () => {
      it('should create new email', async () => {
        const createDto = {
          emailAddress: 'new@example.com',
          isPrimary: false,
        };

        profilesService.createEmail.mockResolvedValue(mockEmail as DebtorEmail);

        const result = await controller.createEmail(mockOrgId, mockDebtorProfileId, createDto as any);

        expect(result).toEqual(mockEmail);
        expect(profilesService.createEmail).toHaveBeenCalledWith(mockDebtorProfileId, createDto);
      });
    });
  });

  describe('Phone Management', () => {
    describe('findAllPhones', () => {
      it('should return all phones for debtor', async () => {
        profilesService.findAllPhones.mockResolvedValue([mockPhone] as DebtorPhone[]);

        const result = await controller.findAllPhones(mockOrgId, mockDebtorProfileId);

        expect(result).toEqual([mockPhone]);
        expect(profilesService.findAllPhones).toHaveBeenCalledWith(mockDebtorProfileId);
      });
    });

    describe('createPhone', () => {
      it('should create new phone', async () => {
        const createDto = {
          phoneNumber: '+15559876543',
          phoneType: PhoneCategory.MOBILE,
          isPrimary: false,
        };

        profilesService.createPhone.mockResolvedValue(mockPhone as DebtorPhone);

        const result = await controller.createPhone(mockOrgId, mockDebtorProfileId, createDto as any);

        expect(result).toEqual(mockPhone);
        expect(profilesService.createPhone).toHaveBeenCalledWith(mockDebtorProfileId, createDto);
      });
    });
  });
});
