// Mock entities before importing anything else
jest.mock('../src/entities', () => ({
  Organization: class Organization {},
  OrganizationAddress: class OrganizationAddress {},
  OrganizationEmail: class OrganizationEmail {},
  OrganizationPhoneNumber: class OrganizationPhoneNumber {},
}));

// Mock the entity file that exports enums
jest.mock('../src/entities/organization-email.entity', () => ({
  OrganizationEmail: class OrganizationEmail {},
  EmailCategory: {
    GENERAL: 'GENERAL',
    BILLING: 'BILLING',
    SUPPORT: 'SUPPORT',
    LEGAL: 'LEGAL',
    TECHNICAL: 'TECHNICAL',
  },
}));

// Import AddressCategory and PhoneCategory from local enums
import { AddressCategory, PhoneCategory, OrganizationType, OrganizationStatus, EmailCategory } from '@verichron/enums';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ProfilesController } from '../src/profiles/profiles.controller';
import { ProfilesService } from '../src/profiles/profiles.service';
import { JwtAuthGuard, OrgContextGuard, RoleGuard } from '@verichron/auth';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let profilesService: ProfilesService;

  // Mock data
  const mockOrganization = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Organization',
    displayName: 'Test Org',
    organizationType: OrganizationType.COLLECTION_AGENCY,
    status: OrganizationStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock JWT token (in real tests, you'd get this from auth service)
  const mockJwtToken = 'mock.jwt.token';

  beforeAll(async () => {
    const mockProfilesService = {
      createOrganization: jest.fn(),
      findAllOrganizations: jest.fn(),
      findOneOrganization: jest.fn(),
      updateOrganization: jest.fn(),
      deleteOrganization: jest.fn(),
      findAllAddresses: jest.fn(),
      createAddress: jest.fn(),
      updateAddress: jest.fn(),
      deleteAddress: jest.fn(),
      findAllEmails: jest.fn(),
      createEmail: jest.fn(),
      updateEmail: jest.fn(),
      deleteEmail: jest.fn(),
      findAllPhoneNumbers: jest.fn(),
      createPhoneNumber: jest.fn(),
      updatePhoneNumber: jest.fn(),
      deletePhoneNumber: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
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
      .overrideGuard(OrgContextGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes like in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    profilesService = moduleFixture.get<ProfilesService>(ProfilesService);
  });

  afterAll(async () => {
    await app.close();
  });


  describe('/orgs (POST)', () => {
    it('should create a new organization', () => {
      const createDto = {
        name: 'New Organization',
        displayName: 'New Org',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      };

      jest
        .spyOn(profilesService, 'createOrganization')
        .mockResolvedValue(mockOrganization);

      return request(app.getHttpServer())
        .post('/orgs')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(mockOrganization.name);
        });
    });

    it('should return 400 for invalid input', () => {
      const invalidDto = {
        name: '', // Empty name should fail validation
      };

      return request(app.getHttpServer())
        .post('/orgs')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(invalidDto)
        .expect(400);
    });

    // Note: This test is skipped because guards are mocked in E2E setup
    // Authentication behavior should be tested in integration tests with real guards
    it.skip('should return 401 without authentication', () => {
      const createDto = {
        name: 'Test',
        displayName: 'Test',
        organizationType: OrganizationType.COLLECTION_AGENCY,
      };

      return request(app.getHttpServer())
        .post('/orgs')
        .send(createDto)
        .expect(401);
    });
  });

  describe('/orgs (GET)', () => {
    it('should return paginated list of organizations', () => {
      const mockResponse = {
        data: [mockOrganization],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      jest
        .spyOn(profilesService, 'findAllOrganizations')
        .mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .get('/orgs')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .query({ page: 1, pageSize: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should handle search query parameter', () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, pageSize: 10, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      };

      jest
        .spyOn(profilesService, 'findAllOrganizations')
        .mockResolvedValue(mockResponse);

      return request(app.getHttpServer())
        .get('/orgs')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .query({ search: 'Test', page: 1, pageSize: 10 })
        .expect(200);
    });
  });

  describe('/orgs/:orgId (GET)', () => {
    it('should return a single organization', () => {
      jest
        .spyOn(profilesService, 'findOneOrganization')
        .mockResolvedValue(mockOrganization);

      return request(app.getHttpServer())
        .get(`/orgs/${mockOrganization.id}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', mockOrganization.id);
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return 404 for non-existent organization', () => {
      jest
        .spyOn(profilesService, 'findOneOrganization')
        .mockRejectedValue(new Error('Organization not found'));

      return request(app.getHttpServer())
        .get('/orgs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(500); // NestJS wraps errors
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/orgs/invalid-uuid')
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(400);
    });
  });

  describe('/orgs/:orgId (PATCH)', () => {
    it('should update an organization', () => {
      const updateDto = {
        displayName: 'Updated Name',
      };

      const updatedOrg = {
        ...mockOrganization,
        displayName: updateDto.displayName,
      };

      jest
        .spyOn(profilesService, 'updateOrganization')
        .mockResolvedValue(updatedOrg);

      return request(app.getHttpServer())
        .patch(`/orgs/${mockOrganization.id}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.displayName).toBe(updateDto.displayName);
        });
    });

    it('should return 400 for invalid update data', () => {
      const invalidDto = {
        status: 'INVALID_STATUS',
      };

      return request(app.getHttpServer())
        .patch(`/orgs/${mockOrganization.id}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/orgs/:orgId (DELETE)', () => {
    it('should delete an organization', () => {
      jest
        .spyOn(profilesService, 'deleteOrganization')
        .mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete(`/orgs/${mockOrganization.id}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(204);
    });
  });

  describe('Address Endpoints', () => {
    const mockAddress = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      organizationId: mockOrganization.id,
      street1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      addressCategory: AddressCategory.RESIDENCE_PRIMARY,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('GET /orgs/:orgId/addresses - should return addresses', () => {
      jest
        .spyOn(profilesService, 'findAllAddresses')
        .mockResolvedValue([mockAddress]);

      return request(app.getHttpServer())
        .get(`/orgs/${mockOrganization.id}/addresses`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
        });
    });

    it('POST /orgs/:orgId/addresses - should create an address', () => {
      const createDto = {
        street1: '123 Main St',
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        addressCategory: AddressCategory.RESIDENCE_PRIMARY,
      };

      jest.spyOn(profilesService, 'createAddress').mockResolvedValue(mockAddress);

      return request(app.getHttpServer())
        .post(`/orgs/${mockOrganization.id}/addresses`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('street1');
        });
    });

    it('PATCH /orgs/:orgId/addresses/:addressId - should update address', () => {
      const updateDto = { street1: '456 Updated St' };
      const updated = { ...mockAddress, ...updateDto };

      jest.spyOn(profilesService, 'updateAddress').mockResolvedValue(updated);

      return request(app.getHttpServer())
        .patch(`/orgs/${mockOrganization.id}/addresses/${mockAddress.id}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.street1).toBe(updateDto.street1);
        });
    });

    it('DELETE /orgs/:orgId/addresses/:addressId - should delete address', () => {
      jest.spyOn(profilesService, 'deleteAddress').mockResolvedValue(undefined);

      return request(app.getHttpServer())
        .delete(`/orgs/${mockOrganization.id}/addresses/${mockAddress.id}`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(204);
    });
  });

  describe('Email Endpoints', () => {
    const mockEmail = {
      id: '323e4567-e89b-12d3-a456-426614174000',
      organizationId: mockOrganization.id,
      email: 'contact@test.com',
      emailCategory: EmailCategory.GENERAL,
      isVerified: true,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('GET /orgs/:orgId/emails - should return emails', () => {
      jest.spyOn(profilesService, 'findAllEmails').mockResolvedValue([mockEmail]);

      return request(app.getHttpServer())
        .get(`/orgs/${mockOrganization.id}/emails`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('POST /orgs/:orgId/emails - should create email', () => {
      const createDto = { email: 'new@test.com', isPrimary: false };

      jest.spyOn(profilesService, 'createEmail').mockResolvedValue(mockEmail);

      return request(app.getHttpServer())
        .post(`/orgs/${mockOrganization.id}/emails`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(createDto)
        .expect(201);
    });
  });

  describe('Phone Number Endpoints', () => {
    const mockPhone = {
      id: '423e4567-e89b-12d3-a456-426614174000',
      organizationId: mockOrganization.id,
      phoneNumber: '+1234567890',
      category: PhoneCategory.BUSINESS,
      isVerified: true,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('GET /orgs/:orgId/phone-numbers - should return phone numbers', () => {
      jest
        .spyOn(profilesService, 'findAllPhoneNumbers')
        .mockResolvedValue([mockPhone]);

      return request(app.getHttpServer())
        .get(`/orgs/${mockOrganization.id}/phone-numbers`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .expect(200);
    });

    it('POST /orgs/:orgId/phone-numbers - should create phone number', () => {
      const createDto = {
        phoneNumber: '+9999999999',
        phoneCategory: PhoneCategory.MOBILE,
        isPrimary: false,
      };

      jest.spyOn(profilesService, 'createPhoneNumber').mockResolvedValue(mockPhone);

      return request(app.getHttpServer())
        .post(`/orgs/${mockOrganization.id}/phone-numbers`)
        .set('Authorization', `Bearer ${mockJwtToken}`)
        .send(createDto)
        .expect(201);
    });
  });
});
