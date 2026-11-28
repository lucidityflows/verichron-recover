import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { PermissionsGuard, JwtAuthGuard, OrgContextGuard, RoleGuard } from '@verichron/auth';
import { PortfolioStatus } from '@verichron/enums';

describe('PortfoliosController', () => {
  let app: INestApplication;
  let portfoliosService: jest.Mocked<PortfoliosService>;

  const organizationId = '123e4567-e89b-42d3-a456-426614174000';

  const mockPortfoliosService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignUser: jest.fn(),
    revokeUser: jest.fn(),
    listUsers: jest.fn(),
    transfer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [PortfoliosController],
      providers: [
        {
          provide: PortfoliosService,
          useValue: mockPortfoliosService,
        },
        Reflector,
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(OrgContextGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(RoleGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard)
    .useValue({ canActivate: () => true })
    .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    portfoliosService = module.get(PortfoliosService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('should be defined', () => {
    const controller = app.get<PortfoliosController>(PortfoliosController);
    expect(controller).toBeDefined();
  });

  describe('POST /portfolios', () => {
    it('should call create service method and return the created portfolio', async () => {
      const createDto: CreatePortfolioDto = {
        name: 'Test Portfolio',
        purchaseDate: '2023-10-01',
        purchasePrice: 10000,
        totalPrincipal: 20000,
        source: 'Test Bank',
        status: PortfolioStatus.PROVISIONING,
      };

      const expectedResponse: PortfolioResponseDto = {
        id: 'new-portfolio-id',
        organizationId: 'test-org-id',
        name: createDto.name,
        purchaseDate: createDto.purchaseDate,
        purchasePrice: createDto.purchasePrice.toFixed(2),
        totalPrincipal: createDto.totalPrincipal.toFixed(2),
        source: createDto.source,
        status: createDto.status!,
        primaryDebtCategory: null,
        portfolioTags: [],
        businessDescription: null,
        debtCount: 0,
        totalCurrentBalance: '0.00',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      portfoliosService.create.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/debts/portfolios/orgs/${organizationId}`)
        .send(createDto)
        .expect(HttpStatus.CREATED);

      expect(portfoliosService.create).toHaveBeenCalledWith(createDto);
      expect(response.body).toEqual(expectedResponse);
    });

    it('should return 400 for invalid data', async () => {
        const invalidDto = { name: '' }; // Missing required fields

        await request(app.getHttpServer())
          .post(`/debts/portfolios/orgs/${organizationId}`)
          .send(invalidDto)
          .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /portfolios', () => {
    it('should call findAll service method and return paginated portfolios', async () => {
      const query = { page: 1, pageSize: 10 };
      portfoliosService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });

      await request(app.getHttpServer())
        .get(`/debts/portfolios/orgs/${organizationId}`)
        .query(query)
        .expect(HttpStatus.OK);

      expect(portfoliosService.findAll).toHaveBeenCalledWith(organizationId, expect.objectContaining(query));
    });
  });

  describe('GET /portfolios/:id', () => {
    const portfolioId = '123e4567-e89b-42d3-a456-426614174000';
    it('should call findOne service method and return a single portfolio', async () => {
      portfoliosService.findOne.mockResolvedValue({} as PortfolioResponseDto);
      await request(app.getHttpServer())
        .get(`/debts/portfolios/orgs/${organizationId}/${portfolioId}`)
        .expect(HttpStatus.OK);
      expect(portfoliosService.findOne).toHaveBeenCalledWith(organizationId, portfolioId);
    });

    it('should return 400 for an invalid UUID', async () => {
        await request(app.getHttpServer())
          .get(`/debts/portfolios/orgs/${organizationId}/invalid-uuid`)
          .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /portfolios/:id', () => {
    const portfolioId = '123e4567-e89b-42d3-a456-426614174000';
    const updateDto = { name: 'New Name' };
    it('should call update service method and return the updated portfolio', async () => {
      portfoliosService.update.mockResolvedValue({} as PortfolioResponseDto);
      await request(app.getHttpServer())
        .patch(`/debts/portfolios/orgs/${organizationId}/${portfolioId}`)
        .send(updateDto)
        .expect(HttpStatus.OK);
      expect(portfoliosService.update).toHaveBeenCalledWith(portfolioId, updateDto);
    });
  });

  describe('DELETE /portfolios/:id', () => {
    const portfolioId = '123e4567-e89b-42d3-a456-426614174000';
    it('should call remove service method and return NO_CONTENT', async () => {
      portfoliosService.remove.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete(`/debts/portfolios/orgs/${organizationId}/${portfolioId}`)
        .expect(HttpStatus.NO_CONTENT);
      expect(portfoliosService.remove).toHaveBeenCalledWith(portfolioId);
    });
  });

  describe('POST /portfolios/:id/users', () => {
    const portfolioId = '123e4567-e89b-42d3-a456-426614174000';
    const assignDto = {
      userId: '123e4567-e89b-42d3-a456-426614174001'
    };
    it('should call assignUser service method', async () => {
      portfoliosService.assignUser.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .post(`/debts/portfolios/orgs/${organizationId}/${portfolioId}/users`)
        .send(assignDto)
        .expect(HttpStatus.CREATED);
      expect(portfoliosService.assignUser).toHaveBeenCalledWith(portfolioId, expect.objectContaining(assignDto));
    });
  });

  describe('DELETE /portfolios/:id/users/:userId', () => {
    const portfolioId = '123e4567-e89b-42d3-a456-426614174000';
    const userId = '123e4567-e89b-42d3-a456-426614174001';
    it('should call revokeUser service method', async () => {
      portfoliosService.revokeUser.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .delete(`/debts/portfolios/orgs/${organizationId}/${portfolioId}/users/${userId}`)
        .expect(HttpStatus.NO_CONTENT);
      expect(portfoliosService.revokeUser).toHaveBeenCalledWith(portfolioId, userId);
    });
  });

  describe('GET /portfolios/:id/users', () => {
    const portfolioId = '123e4567-e89b-42d3-a456-426614174000';
    it('should call listUsers service method', async () => {
      portfoliosService.listUsers.mockResolvedValue([]);
      await request(app.getHttpServer())
        .get(`/debts/portfolios/orgs/${organizationId}/${portfolioId}/users`)
        .expect(HttpStatus.OK);
      expect(portfoliosService.listUsers).toHaveBeenCalledWith(portfolioId);
    });
  });

  describe('POST /portfolios/:id/transfer', () => {
    const portfolioId = '123e4567-e89b-42d3-a456-426614174000';
    const transferDto = {
      newOrganizationId: '123e4567-e89b-42d3-a456-426614174002'
    };
    it('should call transfer service method', async () => {
      portfoliosService.transfer.mockResolvedValue({} as PortfolioResponseDto);
      await request(app.getHttpServer())
        .post(`/debts/portfolios/orgs/${organizationId}/${portfolioId}/transfer`)
        .send(transferDto)
        .expect(HttpStatus.OK);
      expect(portfoliosService.transfer).toHaveBeenCalledWith(portfolioId, expect.objectContaining(transferDto));
    });
  });
});
