import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ProfilesService } from '../src/profiles/profiles.service';
import { EventPublisher } from '@verichron/event-publisher';
import { RequestContext } from '../src/core/services/request-context.service';
import { testDatabaseConfig } from './test-database.config';
import { OrganizationType, OrganizationStatus, AddressCategory, PhoneCategory } from '@verichron/enums';
import { OrganizationNotFoundException } from '../src/core/exceptions';
import { Organization, OrganizationAddress, OrganizationEmail, OrganizationPhoneNumber } from '../src/profiles/entities';

describe('ProfilesService Integration Tests', () => {
  let module: TestingModule;
  let service: ProfilesService;
  let dataSource: DataSource;

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockRequestContext = {
    getUserId: jest.fn().mockReturnValue('test-user-id'),
    getUser: jest.fn(),
    setUser: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        // forRoot loads all entities via glob pattern in testDatabaseConfig
        TypeOrmModule.forRoot(testDatabaseConfig),
        // forFeature registers the repositories for injection
        TypeOrmModule.forFeature([
          Organization,
          OrganizationAddress,
          OrganizationEmail,
          OrganizationPhoneNumber,
        ]),
      ],
      providers: [
        ProfilesService,
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
        {
          provide: RequestContext,
          useValue: mockRequestContext,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clear all tables before each test
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Organization CRUD Operations', () => {
    let orgId: string;

    describe('createOrganization', () => {
      it('should create and persist an organization to the database', async () => {
        const createDto = {
          name: 'Test Collection Agency',
          displayName: 'Test Agency',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        };

        const result = await service.createOrganization(createDto);
        orgId = result.id;

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.name).toBe(createDto.name);
        expect(result.displayName).toBe(createDto.displayName);
        expect(result.organizationType).toBe(createDto.organizationType);
        expect(result.status).toBe(OrganizationStatus.ACTIVE);

        // Verify it was actually saved to database
        const repository = dataSource.getRepository('Organization');
        const saved = await repository.findOne({ where: { id: result.id } });
        expect(saved).toBeDefined();
        expect(saved!.name).toBe(createDto.name);
      });

      it('should throw error when creating organization with duplicate name', async () => {
        const createDto = {
          name: 'Duplicate Agency',
          displayName: 'Duplicate',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        };

        await service.createOrganization(createDto);

        await expect(service.createOrganization(createDto)).rejects.toThrow(
          'Organization already exists',
        );
      });

      it('should create organization with optional fields', async () => {
        const createDto = {
          name: 'Full Featured Agency',
          displayName: 'Full Featured',
          organizationType: OrganizationType.COLLECTION_AGENCY,
          parentOrganizationId: undefined,
          taxId: '12-3456789',
          settings: {
            branding: {
              primary_color_hex: '#1E40AF',
            },
          },
        };

        const result = await service.createOrganization(createDto);

        expect(result.taxId).toBe(createDto.taxId);
        expect(result.settings).toEqual(createDto.settings);
      });
    });

    describe('findOneOrganization', () => {
      it('should retrieve an organization from database', async () => {
        const created = await service.createOrganization({
          name: 'Find Test Agency',
          displayName: 'Find Test',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });

        const found = await service.findOneOrganization(created.id);

        expect(found).toBeDefined();
        expect(found.id).toBe(created.id);
        expect(found.name).toBe(created.name);
      });

      it('should throw OrganizationNotFoundException for non-existent org', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';

        await expect(service.findOneOrganization(fakeId)).rejects.toThrow(
          OrganizationNotFoundException,
        );
      });
    });

    describe('updateOrganization', () => {
      it('should update and persist organization changes', async () => {
        const created = await service.createOrganization({
          name: 'Update Test Agency',
          displayName: 'Original Name',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });

        const updateDto = {
          displayName: 'Updated Name',
          status: OrganizationStatus.SUSPENDED,
        };

        const updated = await service.updateOrganization(
          created.id,
          updateDto,
        );

        expect(updated.displayName).toBe(updateDto.displayName);
        expect(updated.status).toBe(updateDto.status);

        // Verify changes persisted
        const repository = dataSource.getRepository('Organization');
        const persisted = await repository.findOne({
          where: { id: created.id },
        });
        expect(persisted!.displayName).toBe(updateDto.displayName);
        expect(persisted!.status).toBe(updateDto.status);
      });

      it('should publish OrganizationUpdated event when updating', async () => {
        const created = await service.createOrganization({
          name: 'Event Test Agency',
          displayName: 'Event Test',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });

        await service.updateOrganization(created.id, {
          displayName: 'Updated',
        });

        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('OrganizationUpdated'),
          expect.any(String),
          expect.objectContaining({
            organizationId: created.id,
          }),
        );
      });
    });

    describe('deleteOrganization', () => {
      it('should soft delete organization by setting status to INACTIVE', async () => {
        const created = await service.createOrganization({
          name: 'Delete Test Agency',
          displayName: 'Delete Test',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });

        await service.deleteOrganization(created.id);

        const repository = dataSource.getRepository('Organization');
        const deleted = await repository.findOne({
          where: { id: created.id },
        });

        expect(deleted).toBeDefined();
        expect(deleted!.status).toBe(OrganizationStatus.INACTIVE);
      });
    });

    describe('findAllOrganizations', () => {
      it('should return paginated results from database', async () => {
        // Create multiple organizations
        await service.createOrganization({
          name: 'Agency 1',
          displayName: 'First',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });
        await service.createOrganization({
          name: 'Agency 2',
          displayName: 'Second',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });
        await service.createOrganization({
          name: 'Agency 3',
          displayName: 'Third',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });

        const result = await service.findAllOrganizations({
          page: 1,
          pageSize: 2,
        }, orgId);

        expect(result.data).toHaveLength(2);
        expect(result.meta.total).toBe(3);
        expect(result.meta.totalPages).toBe(2);
      });

      it('should filter organizations by search term', async () => {
        await service.createOrganization({
          name: 'ABC Collection Agency',
          displayName: 'ABC',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });
        await service.createOrganization({
          name: 'XYZ Financial',
          displayName: 'XYZ',
          organizationType: OrganizationType.COLLECTION_AGENCY,
        });

        const result = await service.findAllOrganizations({
          page: 1,
          pageSize: 10,
          search: 'ABC',
        }, orgId);

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toContain('ABC');
      });
    });
  });

  describe('Address CRUD Operations', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await service.createOrganization({
        name: 'Address Test Org',
        displayName: 'Address Test',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      });
      orgId = org.id;
    });

    it('should create and persist an address', async () => {
      const createDto = {
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        addressCategory: AddressCategory.HEADQUARTERS,
        isPrimary: true,
      };

      const result = await service.createAddress(orgId, createDto);

      expect(result.id).toBeDefined();
      expect(result.organizationId).toBe(orgId);
      expect(result.street1).toBe(createDto.street1);
      expect(result.country).toBe('US'); // Default value

      // Verify persistence
      const repository = dataSource.getRepository('OrganizationAddress');
      const saved = await repository.findOne({ where: { id: result.id } });
      expect(saved).toBeDefined();
    });

    it('should retrieve all addresses for an organization', async () => {
      await service.createAddress(orgId, {
        street1: '123 Main St',
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        addressCategory: AddressCategory.HEADQUARTERS,
        isPrimary: true,
      });
      await service.createAddress(orgId, {
        street1: '456 Park Ave',
        city: 'NYC',
        state: 'NY',
        postalCode: '10002',
        country: 'US',
        addressCategory: AddressCategory.BRANCH,
        isPrimary: false,
      });

      const result = await service.findAllAddresses(orgId);

      expect(result).toHaveLength(2);
      expect(result[0].isPrimary).toBe(true); // Primary first
    });

    it('should update an address', async () => {
      const created = await service.createAddress(orgId, {
        street1: '123 Main St',
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        addressCategory: AddressCategory.HEADQUARTERS,
      });

      const updated = await service.updateAddress(orgId, created.id, {
        street1: '789 Updated St',
      });

      expect(updated.street1).toBe('789 Updated St');
      expect(updated.city).toBe('NYC'); // Unchanged

      // Verify persistence
      const repository = dataSource.getRepository('OrganizationAddress');
      const persisted = await repository.findOne({
        where: { id: created.id },
      });
      expect(persisted!.street1).toBe('789 Updated St');
    });

    it('should delete an address', async () => {
      const created = await service.createAddress(orgId, {
        street1: '123 Main St',
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        addressCategory: AddressCategory.HEADQUARTERS,
      });

      await service.deleteAddress(orgId, created.id);

      const repository = dataSource.getRepository('OrganizationAddress');
      const deleted = await repository.findOne({ where: { id: created.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Email CRUD Operations', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await service.createOrganization({
        name: 'Email Test Org',
        displayName: 'Email Test',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      });
      orgId = org.id;
    });

    it('should create and persist an email', async () => {
      const createDto = {
        email: 'contact@test.com',
        isPrimary: true,
      };

      const result = await service.createEmail(orgId, createDto);

      expect(result.id).toBeDefined();
      expect(result.organizationId).toBe(orgId);
      expect(result.email).toBe(createDto.email);

      // Verify persistence
      const repository = dataSource.getRepository('OrganizationEmail');
      const saved = await repository.findOne({ where: { id: result.id } });
      expect(saved).toBeDefined();
    });

    it('should retrieve all emails for an organization ordered by isPrimary', async () => {
      await service.createEmail(orgId, {
        email: 'secondary@test.com',
        isPrimary: false,
      });
      await service.createEmail(orgId, {
        email: 'primary@test.com',
        isPrimary: true,
      });

      const result = await service.findAllEmails(orgId);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('primary@test.com'); // Primary first
    });
  });

  describe('Phone Number CRUD Operations', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await service.createOrganization({
        name: 'Phone Test Org',
        displayName: 'Phone Test',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      });
      orgId = org.id;
    });

    it('should create and persist a phone number', async () => {
      const createDto = {
        phoneNumber: '+1234567890',
        category: PhoneCategory.BUSINESS,
        isPrimary: true,
      };

      const result = await service.createPhoneNumber(orgId, createDto);

      expect(result.id).toBeDefined();
      expect(result.organizationId).toBe(orgId);
      expect(result.phoneNumber).toBe(createDto.phoneNumber);

      // Verify persistence
      const repository = dataSource.getRepository('OrganizationPhoneNumber');
      const saved = await repository.findOne({ where: { id: result.id } });
      expect(saved).toBeDefined();
    });

    it('should retrieve all phone numbers for an organization', async () => {
      await service.createPhoneNumber(orgId, {
        phoneNumber: '+1111111111',
        category: PhoneCategory.BUSINESS,
        isPrimary: true,
      });
      await service.createPhoneNumber(orgId, {
        phoneNumber: '+2222222222',
        category: PhoneCategory.MOBILE,
        isPrimary: false,
      });

      const result = await service.findAllPhoneNumbers(orgId);

      expect(result).toHaveLength(2);
      expect(result[0].isPrimary).toBe(true); // Primary first
    });
  });

  describe('Database Transactions and Constraints', () => {
    it('should enforce unique organization names', async () => {
      const createDto = {
        name: 'Unique Test',
        displayName: 'Unique',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      };

      await service.createOrganization(createDto);

      // Second creation should fail
      await expect(service.createOrganization(createDto)).rejects.toThrow();
    });

    it('should cascade operations correctly', async () => {
      const org = await service.createOrganization({
        name: 'Cascade Test',
        displayName: 'Cascade',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      });

      // Create related entities
      await service.createAddress(org.id, {
        street1: '123 Main St',
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        addressCategory: AddressCategory.HEADQUARTERS,
      });
      await service.createEmail(org.id, { email: 'test@test.com' });

      // Verify all created
      const addresses = await service.findAllAddresses(org.id);
      const emails = await service.findAllEmails(org.id);

      expect(addresses).toHaveLength(1);
      expect(emails).toHaveLength(1);
    });
  });
});
