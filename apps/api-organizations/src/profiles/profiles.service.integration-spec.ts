import { type TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfilesService } from './profiles.service';
import {
  Organization,
  OrganizationAddress,
  OrganizationEmail,
  OrganizationPhoneNumber,
} from './entities';
import { EventPublisher } from '@verichron/event-publisher';
import { RequestContext } from '../core/services/request-context.service';
import {
  createMockRepository,
  createMockEventPublisher,
} from '../test/utils/test-helpers';
import { type CreateOrganizationDto } from './dto';
import { OrganizationType, OrganizationStatus } from '@verichron/enums';

describe('ProfilesService (Integration)', () => {
  let service: ProfilesService;
  let organizationRepository: ReturnType<typeof createMockRepository>;
  let addressRepository: ReturnType<typeof createMockRepository>;
  let emailRepository: ReturnType<typeof createMockRepository>;
  let phoneNumberRepository: ReturnType<typeof createMockRepository>;
  let eventPublisher: ReturnType<typeof createMockEventPublisher>;
  let requestContext: jest.Mocked<RequestContext>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    organizationRepository = createMockRepository();
    addressRepository = createMockRepository();
    emailRepository = createMockRepository();
    phoneNumberRepository = createMockRepository();
    eventPublisher = createMockEventPublisher();

    requestContext = {
      getUserId: jest.fn().mockReturnValue('test-user-id'),
      getUserEmail: jest.fn(),
      getUsername: jest.fn(),
      getOrgId: jest.fn(),
      getRoles: jest.fn(),
      getPermissions: jest.fn(),
      getPlatformRoles: jest.fn(),
      hasRole: jest.fn(),
      hasPermission: jest.fn(),
      hasPlatformRole: jest.fn(),
      isAuthenticated: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
    } as any; // Cast to any for now, to avoid deep typing issues with RequestContext mock

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
        {
          provide: getRepositoryToken(OrganizationAddress),
          useValue: addressRepository,
        },
        {
          provide: getRepositoryToken(OrganizationEmail),
          useValue: emailRepository,
        },
        {
          provide: getRepositoryToken(OrganizationPhoneNumber),
          useValue: phoneNumberRepository,
        },
        {
          provide: EventPublisher,
          useValue: eventPublisher,
        },
        {
          provide: RequestContext,
          useValue: requestContext,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);

    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create organization without publishing OrganizationCreated event', async () => {
      // NOTE: createOrganization creates an org shell only (no admin user).
      // For full tenant onboarding with admin provisioning, use OnboardingService.
      // See ONBOARDING_PROTOCOLS.md for details.

      const createDto: CreateOrganizationDto = {
        name: 'New Test Org',
        displayName: 'New Test Display',
        organizationType: OrganizationType.COLLECTION_AGENCY,
        taxId: '11-2223334',
      };

      const mockSavedOrg = new Organization();
      mockSavedOrg.id = mockOrgId;
      mockSavedOrg.name = createDto.name;
      mockSavedOrg.displayName = createDto.displayName;
      mockSavedOrg.organizationType = createDto.organizationType;
      mockSavedOrg.status = OrganizationStatus.PROVISIONING;
      mockSavedOrg.createdAt = new Date();
      mockSavedOrg.updatedAt = new Date();

      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockReturnValue(mockSavedOrg);
      organizationRepository.save.mockResolvedValue(mockSavedOrg);

      const result = await service.createOrganization(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrgId);
      expect(result.name).toBe(createDto.name);

      // Should NOT publish OrganizationCreated event (that's for onboarding only)
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should not publish an event if organization creation fails', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'Failing Org',
        displayName: 'Failing Org Display',
        organizationType: OrganizationType.COLLECTION_AGENCY,
        taxId: '11-2223334',
      };

      organizationRepository.findOne.mockResolvedValue(null);
      organizationRepository.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.createOrganization(createDto)).rejects.toThrow('Database error');

      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
