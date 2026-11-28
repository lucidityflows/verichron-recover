import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import { PortfoliosService } from './portfolios.service';
import { Portfolio } from './entities/portfolio.entity';
import { UserPortfolioPermission } from './entities/user-portfolio-permission.entity';
import { Debt } from '../debts/entities/debt.entity';
import { EventPublisher } from '@verichron/event-publisher';
import { RequestContext } from '../core';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { PortfolioStatus  } from '@verichron/enums';
import { EVENT_TYPES } from '@verichron/events';
import {
  PortfolioCreatedDto,
} from '../events/event-dto/portfolios/portfolio-created.dto';
import {
  PortfolioUpdatedDto,
} from '../events/event-dto/portfolios/portfolio-updated.dto';
import {
  PortfolioStatusChangedDto,
} from '../events/event-dto/portfolios/portfolio-status-changed.dto';
import {
  PortfolioUserAccessGrantedDto,
} from '../events/event-dto/portfolios/portfolio-user-access-granted.dto';
import {
  PortfolioUserAccessRevokedDto,
} from '../events/event-dto/portfolios/portfolio-user-access-revoked.dto';
import {
  PortfolioSoldDto
} from '../events/event-dto/portfolios/portfolio-sold.dto';

// Mock the non-exported helper function at the module level
jest.mock('./portfolios.service', () => {
  const originalModule = jest.requireActual('./portfolios.service');
  return {
    ...originalModule,
    isValidPortfolioStatusTransition: jest.fn().mockReturnValue(true), // Mock implementation
  };
});

describe('PortfoliosService', () => {
  let service: PortfoliosService;
  let portfolioRepository: jest.Mocked<Repository<Portfolio>>;
  let permissionRepository: jest.Mocked<Repository<UserPortfolioPermission>>;
  let debtRepository: jest.Mocked<Repository<Debt>>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let requestContext: jest.Mocked<RequestContext>;

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        PortfoliosService,
        {
          provide: getRepositoryToken(Portfolio),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserPortfolioPermission),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Debt),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            // Mock DataSource if needed for transactions
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: RequestContext,
          useValue: {
            getOrgId: jest.fn(),
            getUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PortfoliosService>(PortfoliosService);
    portfolioRepository = module.get(getRepositoryToken(Portfolio));
    permissionRepository = module.get(getRepositoryToken(UserPortfolioPermission));
    debtRepository = module.get(getRepositoryToken(Debt));
    eventPublisher = module.get(EventPublisher);
    requestContext = module.get(RequestContext);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a portfolio, publish an event, and return the portfolio response', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const createDto: CreatePortfolioDto = {
        name: 'Test Portfolio',
        purchaseDate: '2023-10-01',
        purchasePrice: 10000,
        totalPrincipal: 20000,
        source: 'Test Bank',
        status: PortfolioStatus.PROVISIONING,
      };

      const mockPortfolio = {
        id: 'new-portfolio-id',
        organizationId: orgId,
        name: createDto.name,
        purchaseDate: new Date(createDto.purchaseDate),
        purchasePrice: createDto.purchasePrice.toFixed(2),
        totalPrincipal: createDto.totalPrincipal.toFixed(2),
        source: createDto.source,
        status: createDto.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Portfolio;

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      portfolioRepository.create.mockReturnValue(mockPortfolio);
      portfolioRepository.save.mockResolvedValue(mockPortfolio);

      const result = await service.create(createDto);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();
      expect(portfolioRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: orgId,
        name: createDto.name,
        status: createDto.status,
      }));
      expect(portfolioRepository.save).toHaveBeenCalledWith(mockPortfolio);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_PORTFOLIO_CREATED,
        expect.objectContaining({
          portfolioId: 'new-portfolio-id',
          organizationId: 'test-org-id',
          name: 'Test Portfolio',
          createdBy: 'test-user-id',
        }),
        PortfolioCreatedDto,
      );
      expect(result).toBeDefined();
      expect(result.id).toEqual(mockPortfolio.id);
      expect(result.name).toEqual(createDto.name);
      expect(result.debtCount).toEqual(0);
      expect(result.totalCurrentBalance).toEqual('0.00');
    });

    it('should throw an error if organizationId is missing from context', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);
      const createDto: CreatePortfolioDto = {
        name: 'Test Portfolio',
        purchaseDate: '2023-10-01',
        purchasePrice: 10000,
        totalPrincipal: 20000,
        source: 'Test Bank',
      };
      await expect(service.create(createDto)).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is missing from context', async () => {
      requestContext.getOrgId.mockReturnValue('test-org-id');
      requestContext.getUserId.mockReturnValue(undefined);
      const createDto: CreatePortfolioDto = {
        name: 'Test Portfolio',
        purchaseDate: '2023-10-01',
        purchasePrice: 10000,
        totalPrincipal: 20000,
        source: 'Test Bank',
      };
      await expect(service.create(createDto)).rejects.toThrow('User context is required');
    });
  });

  describe('findAll', () => {
    const orgId = 'test-org-id';
    const mockPortfolios = [
      { id: 'portfolio-1', name: 'Portfolio A' },
      { id: 'portfolio-2', name: 'Portfolio B' },
    ] as Portfolio[];

    const mockRawResults = {
      entities: mockPortfolios,
      raw: [
        { debtCount: '10', totalCurrentBalance: '5000.00' },
        { debtCount: '5', totalCurrentBalance: '2500.00' },
      ],
    };

    let mockQueryBuilder: any;
    let mockCountQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawAndEntities: jest.fn().mockResolvedValue(mockRawResults),
      };

      mockCountQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };

      (portfolioRepository.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(mockQueryBuilder) // For the main data query
        .mockReturnValueOnce(mockCountQueryBuilder); // For the count query
    });

    it('should return a paginated list of portfolios with aggregated metrics', async () => {
      const query = { page: 1, pageSize: 10 };

      const result = await service.findAll(orgId, query);

      expect(portfolioRepository.createQueryBuilder).toHaveBeenCalledWith('portfolio');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('portfolio.organizationId = :organizationId', { organizationId: orgId });
      expect(mockCountQueryBuilder.where).toHaveBeenCalledWith('portfolio.organizationId = :organizationId', { organizationId: orgId });
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.getRawAndEntities).toHaveBeenCalled();
      expect(mockCountQueryBuilder.getCount).toHaveBeenCalled();
      
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].debtCount).toBe(10);
      expect(result.data[0].totalCurrentBalance).toBe('5000.00');
      expect(result.data[1].debtCount).toBe(5);
      expect(result.data[1].totalCurrentBalance).toBe('2500.00');
    });

    it('should apply filters for status and search', async () => {
      const query = { status: [PortfolioStatus.ACTIVE], search: 'Test' };

      await service.findAll(orgId, query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('portfolio.status IN (:...statuses)', { statuses: query.status });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('(portfolio.name ILIKE :search OR portfolio.source ILIKE :search)', { search: `%${query.search}%` });
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith('portfolio.status IN (:...statuses)', { statuses: query.status });
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith('(portfolio.name ILIKE :search OR portfolio.source ILIKE :search)', { search: `%${query.search}%` });
    });
  });

  describe('findOne', () => {
    const orgId = 'test-org-id';
    const portfolioId = 'test-portfolio-id';
    const mockPortfolio = { id: portfolioId, name: 'Test Portfolio' } as Portfolio;
    const mockMetrics = { debtCount: '5', totalCurrentBalance: '12345.67' };

    beforeEach(() => {
      const mockMetricsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockMetrics),
      };
      (debtRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockMetricsQueryBuilder);
    });

    it('should return a single portfolio with its metrics', async () => {
      portfolioRepository.findOne.mockResolvedValue(mockPortfolio);

      const result = await service.findOne(orgId, portfolioId);

      expect(portfolioRepository.findOne).toHaveBeenCalledWith({ where: { id: portfolioId, organizationId: orgId } });
      expect(debtRepository.createQueryBuilder).toHaveBeenCalledWith('debts');
      expect(result.id).toEqual(portfolioId);
      expect(result.debtCount).toEqual(5);
      expect(result.totalCurrentBalance).toEqual('12345.67');
    });

    it('should throw PortfolioNotFoundException if portfolio is not found', async () => {
      portfolioRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(orgId, portfolioId)).rejects.toThrow('Portfolio with ID \'test-portfolio-id\' not found or you do not have access to it.');
    });
  });

  describe('update', () => {
    const orgId = 'test-org-id';
    const userId = 'test-user-id';
    const portfolioId = 'test-portfolio-id';
    const mockPortfolio = { id: portfolioId, name: 'Old Name', status: PortfolioStatus.ACTIVE } as Portfolio;
    const mockMetrics = { debtCount: '5', totalCurrentBalance: '12345.67' };

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      portfolioRepository.findOne.mockResolvedValue(mockPortfolio);
      portfolioRepository.save.mockImplementation(async (p: DeepPartial<Portfolio>) => ({
        id: p.id || 'mock-portfolio-id', // Ensure id is always present
        organizationId: p.organizationId || 'mock-org-id',
        name: p.name || 'Mock Portfolio',
        status: p.status || PortfolioStatus.ACTIVE,
        purchaseDate: p.purchaseDate || new Date(),
        purchasePrice: p.purchasePrice || '0.00',
        totalPrincipal: p.totalPrincipal || '0.00',
        source: p.source || 'Mock Source',
        createdAt: p.createdAt || new Date(),
        updatedAt: new Date(),
        userPermissions: p.userPermissions || [],
        ...p, // Spread to allow specific test values to override
      }) as Portfolio);

      const mockMetricsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockMetrics),
      };
      (debtRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockMetricsQueryBuilder);
    });

    it('should update a portfolio and publish events', async () => {
      const updateDto = { name: 'New Name', status: PortfolioStatus.CLOSED };
      
      // Since the mock is module-level, we need to configure it for this specific test
      const { isValidPortfolioStatusTransition } = jest.requireActual('./portfolios.service');

      const result = await service.update(portfolioId, updateDto);

      expect(portfolioRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name', status: 'CLOSED' }));
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_PORTFOLIO_UPDATED,
        expect.objectContaining({
          portfolioId: 'test-portfolio-id',
          organizationId: 'test-org-id',
          updatedBy: 'test-user-id',
        }),
        PortfolioUpdatedDto,
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_PORTFOLIO_STATUS_CHANGED,
        expect.objectContaining({
          portfolioId: 'test-portfolio-id',
          organizationId: 'test-org-id',
          newStatus: 'CLOSED',
          updatedBy: 'test-user-id',
        }),
        PortfolioStatusChangedDto,
      );
      expect(result.name).toEqual('New Name');
    });

    it('should throw PortfolioNotFoundException if portfolio is not found', async () => {
      portfolioRepository.findOne.mockResolvedValue(null);
      await expect(service.update(portfolioId, {})).rejects.toThrow('Portfolio with ID \'test-portfolio-id\' not found or you do not have access to it.');
    });

    it('should throw InvalidPortfolioStatusTransitionException for invalid transitions', async () => {
      portfolioRepository.findOne.mockResolvedValue({ ...mockPortfolio, status: PortfolioStatus.ACTIVE });
      const updateDto = { status: PortfolioStatus.PROVISIONING }; // Invalid transition from ACTIVE
      
      // Get the mocked function and configure its behavior for this test
      const { isValidPortfolioStatusTransition } = require('./portfolios.service');
      isValidPortfolioStatusTransition.mockReturnValueOnce(false);
      
      await expect(service.update(portfolioId, updateDto)).rejects.toThrow("Invalid status transition from 'ACTIVE' to 'PROVISIONING'. This transition is not allowed by the portfolio lifecycle state machine.");
    });
  });

  describe('remove', () => {
    const orgId = 'test-org-id';
    const userId = 'test-user-id';
    const portfolioId = 'test-portfolio-id';

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
    });

    it('should archive a portfolio and publish an event', async () => {
      const mockPortfolio = { id: portfolioId, status: PortfolioStatus.ACTIVE } as Portfolio;
      portfolioRepository.findOne.mockResolvedValue(mockPortfolio);
      portfolioRepository.save.mockImplementation(async (p: DeepPartial<Portfolio>) => ({ ...p, updatedAt: new Date() }) as Portfolio);
      
      const { isValidPortfolioStatusTransition } = require('./portfolios.service');
      isValidPortfolioStatusTransition.mockReturnValueOnce(true);

      await service.remove(portfolioId);

      expect(portfolioRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: PortfolioStatus.CLOSED }));
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_PORTFOLIO_STATUS_CHANGED,
        expect.objectContaining({
          portfolioId: 'test-portfolio-id',
          newStatus: PortfolioStatus.CLOSED,
        }),
        PortfolioStatusChangedDto,
      );
    });
  });

  describe('assignUser', () => {
    const orgId = 'test-org-id';
    const portfolioId = 'test-portfolio-id';
    const assignDto = { userId: 'user-to-assign' };
    const mockPortfolio = { id: portfolioId } as Portfolio;

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      portfolioRepository.findOne.mockResolvedValue(mockPortfolio);
    });

    it('should assign a user and publish an event', async () => {
      permissionRepository.findOne.mockResolvedValue(null);
      permissionRepository.create.mockImplementation((dto: any) => ({ ...dto, createdAt: new Date() }));
      permissionRepository.save.mockResolvedValue({} as UserPortfolioPermission);
      
      await service.assignUser(portfolioId, assignDto);

      expect(permissionRepository.save).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_PORTFOLIO_USER_ACCESS_GRANTED,
        expect.objectContaining({
          portfolioId: 'test-portfolio-id',
          organizationId: 'test-org-id',
          userId: 'user-to-assign',
        }),
        PortfolioUserAccessGrantedDto,
      );
    });

    it('should throw UserAlreadyAssignedException if user is already assigned', async () => {
      permissionRepository.findOne.mockResolvedValue({} as UserPortfolioPermission);
      await expect(service.assignUser(portfolioId, assignDto)).rejects.toThrow('User \'user-to-assign\' already has access to portfolio \'test-portfolio-id\'. Cannot assign duplicate access.');
    });
  });

  describe('revokeUser', () => {
    const orgId = 'test-org-id';
    const portfolioId = 'test-portfolio-id';
    const userId = 'user-to-revoke';
    const mockPortfolio = { id: portfolioId } as Portfolio;

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      portfolioRepository.findOne.mockResolvedValue(mockPortfolio);
    });

    it('should revoke user access and publish an event', async () => {
      const mockPermission = { id: 'perm-id' } as UserPortfolioPermission;
      permissionRepository.findOne.mockResolvedValue(mockPermission);

      await service.revokeUser(portfolioId, userId);

      expect(permissionRepository.remove).toHaveBeenCalledWith(mockPermission);
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_PORTFOLIO_USER_ACCESS_REVOKED,
        expect.objectContaining({
          portfolioId: 'test-portfolio-id',
          organizationId: 'test-org-id',
          userId: 'user-to-revoke',
        }),
        PortfolioUserAccessRevokedDto,
      );
    });

    it('should throw UserNotAssignedException if user is not assigned', async () => {
      permissionRepository.findOne.mockResolvedValue(null);
      await expect(service.revokeUser(portfolioId, userId)).rejects.toThrow('User \'user-to-revoke\' does not have access to portfolio \'test-portfolio-id\'. Cannot revoke non-existent access.');
    });
  });

  describe('listUsers', () => {
    it('should list users with access to a portfolio', async () => {
      const orgId = 'test-org-id';
      const portfolioId = 'test-portfolio-id';
      requestContext.getOrgId.mockReturnValue(orgId);
      portfolioRepository.findOne.mockResolvedValue({ id: portfolioId } as Portfolio);
      permissionRepository.find.mockResolvedValue([{ userId: 'user-1', createdAt: new Date() }] as UserPortfolioPermission[]);

      const result = await service.listUsers(portfolioId);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toEqual('user-1');
    });
  });

  describe('transfer', () => {
    const orgId = 'test-org-id';
    const portfolioId = 'test-portfolio-id';

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue('test-user-id');
      const mockMetricsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ debtCount: '0', totalCurrentBalance: '0' }),
      };
      (debtRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockMetricsQueryBuilder);
    });

    it('should transfer a portfolio and publish an event', async () => {
      const mockPortfolio = { id: portfolioId, organizationId: orgId, status: PortfolioStatus.ACTIVE } as Portfolio;
      portfolioRepository.findOne.mockResolvedValue(mockPortfolio);
      portfolioRepository.save.mockImplementation(async (p: DeepPartial<Portfolio>) => ({ ...p, updatedAt: new Date() }) as Portfolio);

      const transferDto = { newOrganizationId: 'new-org-id' };
      await service.transfer(portfolioId, transferDto);

      expect(portfolioRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'new-org-id',
        status: PortfolioStatus.SOLD,
      }));
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_PORTFOLIO_SOLD,
        expect.objectContaining({
          portfolioId: 'test-portfolio-id',
          previousOrganizationId: 'test-org-id',
          newOrganizationId: 'new-org-id',
          soldBy: 'test-user-id',
        }),
        PortfolioSoldDto,
      );
    });
  });

  describe('checkUserAccess', () => {
    it('should return true if a permission record exists', async () => {
      permissionRepository.findOne.mockResolvedValue({} as UserPortfolioPermission);
      const result = await service.checkUserAccess('user-id', 'portfolio-id');
      expect(result).toBe(true);
    });

    it('should return false if no permission record exists', async () => {
      permissionRepository.findOne.mockResolvedValue(null);
      const result = await service.checkUserAccess('user-id', 'portfolio-id');
      expect(result).toBe(false);
    });
  });
});
