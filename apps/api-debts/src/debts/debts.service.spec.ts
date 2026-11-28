import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { DebtsService } from './debts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { DebtDebtor } from './entities/debt-debtor.entity';
import { UserPortfolioPermission } from '../portfolios/entities/user-portfolio-permission.entity';
import { EventPublisher } from '@verichron/event-publisher';
import { DebtIndexService } from './redis-read-model/debt-index.service';
import { RequestContext } from '../core';
import { EVENT_TYPES } from '@verichron/events'; // Import necessary types and functions
import {
  DebtCreatedDto,
  DebtUpdatedDto,
  DebtStatusChangedDto
} from '../events/event-dto/debts';
import { DebtNotFoundException, InvalidStatusTransitionException, PortfolioAccessDeniedException } from './errors';
import { DebtStatus, DebtCategory, isValidStatusTransition, DebtSortField, SortOrder} from '@verichron/enums';

jest.mock('@verichron/enums', () => ({
  ...jest.requireActual('@verichron/enums'),
  isValidStatusTransition: jest.fn(),
}));

describe('DebtsService', () => {
  let service: DebtsService;
  let debtRepository: jest.Mocked<Repository<Debt>>;
  let debtDebtorRepository: jest.Mocked<Repository<DebtDebtor>>;
  let userPortfolioPermissionRepository: jest.Mocked<Repository<UserPortfolioPermission>>;
  let dataSource: jest.Mocked<DataSource>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let debtIndexService: jest.Mocked<DebtIndexService>;
  let requestContext: jest.Mocked<RequestContext>;

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DebtsService,
        {
          provide: getRepositoryToken(Debt),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              innerJoin: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
              getMany: jest.fn(),
              getCount: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(DebtDebtor),
          useValue: {
            create: jest.fn((dto) => ({
              id: 'mock-debtor-link-id-' + Math.random(), // Generate unique ID for each creation
              ...dto,
              createdAt: new Date(),
            })),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserPortfolioPermission),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
              },
            })),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: DebtIndexService,
          useValue: {
            buildDebtorIndex: jest.fn(),
            getDebtorDebtsInOrg: jest.fn(),
            getDebtSummaries: jest.fn(),
          },
        },
        {
          provide: RequestContext,
          useValue: {
            getOrgId: jest.fn(),
            getUserId: jest.fn(),
            getPermissions: jest.fn(),
            getUserType: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DebtsService>(DebtsService);
    debtRepository = module.get(getRepositoryToken(Debt));
    debtDebtorRepository = module.get(getRepositoryToken(DebtDebtor));
    userPortfolioPermissionRepository = module.get(getRepositoryToken(UserPortfolioPermission));
    dataSource = module.get(DataSource);
    eventPublisher = module.get(EventPublisher);
    debtIndexService = module.get(DebtIndexService);
    requestContext = module.get(RequestContext);

    // Reset mocks for each test
    (isValidStatusTransition as jest.Mock).mockClear();
    (isValidStatusTransition as jest.Mock).mockReturnValue(true); // Default to valid transition
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of debts with filters and authorization', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const query = {
        page: 1,
        pageSize: 10,
        orderBy: DebtSortField.CREATED_AT,
        order: SortOrder.DESC,
        status: [DebtStatus.ACTIVE] as DebtStatus[],
        portfolioId: 'test-portfolio-id',
        minBalance: 100,
        maxBalance: 1000,
        search: 'test-search',
        debtorProfileId: 'test-debtor-profile-id',
      };

      const mockDebts = [
        { id: 'debt1', organizationId: orgId, portfolioId: 'test-portfolio-id', currentBalance: '500.00', createdAt: new Date(), originalDebtDate: new Date(), updatedAt: new Date() },
        { id: 'debt2', organizationId: orgId, portfolioId: 'test-portfolio-id', currentBalance: '600.00', createdAt: new Date(), originalDebtDate: new Date(), updatedAt: new Date() },
      ] as unknown as Debt[];
      const mockTotal = 2;

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(mockTotal),
        getMany: jest.fn().mockResolvedValue(mockDebts),
      };
      (debtRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      // Mock the countQueryBuilder part
      const mockCountQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(mockTotal),
      };
      // Need to mock the second createQueryBuilder call for the count
      (debtRepository.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(mockQueryBuilder) // For the main query
        .mockReturnValueOnce(mockCountQueryBuilder); // For the count query


      const result = await service.findAll(query);

      // Verify request context calls
      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();

      // Verify main query builder calls
      expect(debtRepository.createQueryBuilder).toHaveBeenCalledWith('debts');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'debts.id',
        'debts.organizationId',
        'debts.portfolioId',
        'debts.originalCreditorName',
        'debts.accountNumber',
        'debts.principalAmount',
        'debts.interestAmount',
        'debts.feesAmount',
        'debts.currentBalance',
        'debts.status',
        'debts.originalDebtDate',
        'debts.lastPaymentDate',
        'debts.notes',
        'debts.createdAt',
        'debts.updatedAt',
      ]);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('debts.debtorLinks', 'debtorLink');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('debts.organization_id = :organizationId', { organizationId: orgId });
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'user_portfolio_permission',
        'upp',
        expect.any(String), // The join condition string
        { userId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('debts.status IN (:...statuses)', { statuses: query.status });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('debts.portfolio_id = :portfolioId', { portfolioId: query.portfolioId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('debts.current_balance >= :minBalance', { minBalance: query.minBalance });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('debts.current_balance <= :maxBalance', { maxBalance: query.maxBalance });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(debts.account_number ILIKE :search OR debts.original_creditor_name ILIKE :search)',
        { search: `%${query.search}%` },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('debtorLink.debtor_profile_id = :debtorProfileId', { debtorProfileId: query.debtorProfileId });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(`debts.createdAt`, query.order);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith((query.page - 1) * query.pageSize);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(query.pageSize);
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);

      // Verify count query builder calls
      expect(mockCountQueryBuilder.leftJoin).toHaveBeenCalledWith('debts.debtorLinks', 'debtorLink');
      expect(mockCountQueryBuilder.where).toHaveBeenCalledWith('debts.organization_id = :organizationId', { organizationId: orgId });
      expect(mockCountQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'user_portfolio_permission',
        'upp',
        expect.any(String), // The join condition string
        { userId },
      );
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith('debts.status IN (:...statuses)', { statuses: query.status });
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith('debts.portfolio_id = :portfolioId', { portfolioId: query.portfolioId });
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith('debts.current_balance >= :minBalance', { minBalance: query.minBalance });
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith('debts.current_balance <= :maxBalance', { maxBalance: query.maxBalance });
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(debts.account_number ILIKE :search OR debts.original_creditor_name ILIKE :search)',
        { search: `%${query.search}%` },
      );
      expect(mockCountQueryBuilder.andWhere).toHaveBeenCalledWith('debtorLink.debtor_profile_id = :debtorProfileId', { debtorProfileId: query.debtorProfileId });
      expect(mockCountQueryBuilder.getCount).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result.data).toHaveLength(mockDebts.length);
      expect(result.total).toEqual(mockTotal);
      expect(result.page).toEqual(query.page);
      expect(result.pageSize).toEqual(query.pageSize);
      expect(result.totalPages).toEqual(Math.ceil(mockTotal / query.pageSize));
    });

    it('should throw an error if organizationId is not found', async () => {
      requestContext.getOrgId.mockReturnValue(undefined); // Simulate missing orgId

      const query = { page: 1, pageSize: 10 };

      await expect(service.findAll(query)).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is not found', async () => {
      requestContext.getOrgId.mockReturnValue('test-org-id'); // OrgId is present
      requestContext.getUserId.mockReturnValue(undefined); // Simulate missing userId

      const query = { page: 1, pageSize: 10 };

      await expect(service.findAll(query)).rejects.toThrow('User context is required');
    });
  });

  describe('create', () => {
    it('should successfully create a new debt with associated debtors and publish an event', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const createDebtDto = {
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Test Creditor',
        accountNumber: 'ACC-123',
        principalAmount: 1000.00,
        interestAmount: 50.00,
        feesAmount: 20.00,
        status: DebtStatus.IMPORTED,
        debtCategory: DebtCategory.MEDICAL,
        debtSubcategory: 'Emergency Room Visit',
        originalDebtDate: '2023-01-01',
        debtorProfileIds: ['debtor1', 'debtor2'],
        debtorIdentityId: 'identity-123',
      };

      const mockDebt = {
        id: 'new-debt-id',
        organizationId: orgId,
        currentBalance: '1070.00',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...createDebtDto,
        principalAmount: createDebtDto.principalAmount.toFixed(2), // Ensure string
        interestAmount: createDebtDto.interestAmount.toFixed(2),   // Ensure string
        feesAmount: createDebtDto.feesAmount.toFixed(2),           // Ensure string
        originalDebtDate: new Date(createDebtDto.originalDebtDate),
        debtCategory: createDebtDto.debtCategory,
        debtSubcategory: createDebtDto.debtSubcategory || null,
        notes: null,
        lastPaymentDate: null,
        debtorLinks: [], // Added missing property
        // New fields added for entity architecture
        isDisputed: false,
        disputedAt: null,
        disputeReason: null,
        firstDelinquencyDate: null,
        placementDate: null,
        chargeOffDate: null,
        lastTransactionDate: null,
        lastContactDate: null,
        statuteOfLimitationsDate: null,
        statuteOfLimitationsState: null,
        creditorId: null,
        importNotes: null,
        importBatchId: null,
      } as unknown as Debt

      // Array to store the actual DebtDebtor instances created by the service's call to debtDebtorRepository.create
      const createdDebtDebtorInstances: DebtDebtor[] = [];

      // Mock debtDebtorRepository.create to return a created instance and store it
      debtDebtorRepository.create.mockImplementation((dto) => {
        const instance = {
          id: 'mock-link-id-' + Math.random(), // Simulate unique ID generation
          createdAt: new Date(),
          ...dto,
        } as unknown as DebtDebtor;
        createdDebtDebtorInstances.push(instance);
        return instance;
      });

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      // Mock existingDebt to be null, indicating no duplicate for the first findOne call
      debtRepository.findOne.mockResolvedValueOnce(null);
      debtRepository.create.mockReturnValue(mockDebt);

      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn()
            .mockResolvedValueOnce(mockDebt) // for saving the debt
            .mockResolvedValueOnce(createdDebtDebtorInstances), // for saving debtor links
        },
      };
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);

      // Mock findOne in create method for loading with relations (second findOne call)
      debtRepository.findOne.mockResolvedValueOnce({ ...mockDebt, debtorLinks: createdDebtDebtorInstances });

      const result = await service.create(createDebtDto);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();
      expect(debtRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId, accountNumber: createDebtDto.accountNumber },
      });
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(debtRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          portfolioId: createDebtDto.portfolioId,
          accountNumber: createDebtDto.accountNumber,
          principalAmount: createDebtDto.principalAmount.toFixed(2),
          interestAmount: createDebtDto.interestAmount.toFixed(2),
          feesAmount: createDebtDto.feesAmount.toFixed(2),
          currentBalance: (createDebtDto.principalAmount + createDebtDto.interestAmount + createDebtDto.feesAmount).toFixed(2),
          status: createDebtDto.status,
          originalDebtDate: new Date(createDebtDto.originalDebtDate),
          notes: null,
          lastPaymentDate: null,
        }),
      );
      expect(queryRunner.manager.save).toHaveBeenCalledWith(Debt, mockDebt);
      expect(debtDebtorRepository.create).toHaveBeenCalledTimes(createDebtDto.debtorProfileIds.length);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(DebtDebtor, expect.arrayContaining(createdDebtDebtorInstances));
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_DEBT_CREATED,
        expect.objectContaining({
          debtId: 'new-debt-id',
          organizationId: 'test-org-id',
          amount: 1070,
          status: 'IMPORTED',
        }),
        DebtCreatedDto,
      );

      expect(result).toBeDefined();
      expect(result.id).toEqual(mockDebt.id);
      expect(result.organizationId).toEqual(orgId);
      expect(result.accountNumber).toEqual(createDebtDto.accountNumber);
      expect(result.debtorProfileIds).toEqual(createDebtDto.debtorProfileIds);
    });

    it('should throw DuplicateAccountNumberException if a debt with the same account number already exists', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const createDebtDto = {
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Test Creditor',
        accountNumber: 'ACC-123',
        principalAmount: 1000.00,
        interestAmount: 50.00,
        feesAmount: 20.00,
        status: DebtStatus.IMPORTED,
        originalDebtDate: '2023-01-01',
        debtorProfileIds: ['debtor1'],
        debtorIdentityId: 'identity-123',
      };

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue({ id: 'existing-debt' } as Debt); // Simulate existing debt

      await expect(service.create(createDebtDto)).rejects.toThrow('A debt with account number \'ACC-123\' already exists for this organization.');
      expect(debtRepository.findOne).toHaveBeenCalledWith({
        where: { organizationId: orgId, accountNumber: createDebtDto.accountNumber },
      });
      expect(dataSource.createQueryRunner().connect).not.toHaveBeenCalled(); // Should not start transaction
    });

    it('should rollback transaction and re-throw error if saving fails', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const createDebtDto = {
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Test Creditor',
        accountNumber: 'ACC-123',
        principalAmount: 1000.00,
        interestAmount: 50.00,
        feesAmount: 20.00,
        status: DebtStatus.IMPORTED,
        originalDebtDate: '2023-01-01',
        debtorProfileIds: ['debtor1'],
        debtorIdentityId: 'identity-123',
      };

      const mockError = new Error('Database error');
      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(null); // No existing debt

      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined), // Mock rollback to prevent actual error
        release: jest.fn(),
        manager: {
          save: jest.fn().mockRejectedValue(mockError), // Simulate save failure
        },
      };
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);

      await expect(service.create(createDebtDto)).rejects.toThrow(mockError);
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled(); // Should not commit
      expect(queryRunner.release).toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled(); // Should not publish event
    });

    it('should throw an error if organizationId is not found', async () => {
      requestContext.getOrgId.mockReturnValue(undefined); // Simulate missing orgId
      requestContext.getUserId.mockReturnValue('test-user-id');

      const createDebtDto: any = {}; // DTO doesn't matter for this test

      await expect(service.create(createDebtDto)).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is not found', async () => {
      requestContext.getOrgId.mockReturnValue('test-org-id');
      requestContext.getUserId.mockReturnValue(undefined); // Simulate missing userId

      const createDebtDto: any = {}; // DTO doesn't matter for this test

      await expect(service.create(createDebtDto)).rejects.toThrow('User context is required');
    });
  });

  describe('update', () => {
    it('should successfully update a debt by an admin user with debt:update permission', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Old Creditor',
        accountNumber: 'ACC-OLD',
        principalAmount: '1000.00',
        interestAmount: '50.00',
        feesAmount: '20.00',
        currentBalance: '1070.00',
        status: DebtStatus.IMPORTED,
        originalDebtDate: new Date('2023-01-01'),
        lastPaymentDate: null,
        notes: 'Initial notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Debt

      const updateDebtDto = {
        notes: 'Updated notes',
        status: DebtStatus.ACTIVE,
        interestAmount: 60.00,
        feesAmount: 25.00,
      };

      const expectedUpdatedDebt = {
        ...initialDebt,
        notes: updateDebtDto.notes,
        status: updateDebtDto.status,
        interestAmount: updateDebtDto.interestAmount.toFixed(2),
        feesAmount: updateDebtDto.feesAmount.toFixed(2),
        currentBalance: (parseFloat(initialDebt.principalAmount) + updateDebtDto.interestAmount + updateDebtDto.feesAmount).toFixed(2), // Re-calculated
        updatedAt: new Date(), // Use a real Date object
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      requestContext.getPermissions.mockReturnValue(['debt:update']); // Admin user
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({ userId, portfolioId: initialDebt.portfolioId } as UserPortfolioPermission); // Access granted
      debtRepository.save.mockResolvedValue(expectedUpdatedDebt);
      (isValidStatusTransition as jest.Mock).mockReturnValue(true);

      const result = await service.update(debtId, updateDebtDto);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();
      expect(requestContext.getPermissions).toHaveBeenCalled();
      expect(debtRepository.findOne).toHaveBeenCalledWith({
        where: { id: debtId, organizationId: orgId },
        relations: ['debtorLinks'],
      });
      expect(userPortfolioPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { userId, portfolioId: initialDebt.portfolioId },
      });
      expect(isValidStatusTransition).toHaveBeenCalledWith(DebtStatus.IMPORTED, updateDebtDto.status);
      expect(debtRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...initialDebt,
        notes: updateDebtDto.notes,
        status: updateDebtDto.status,
        interestAmount: updateDebtDto.interestAmount.toFixed(2),
        feesAmount: updateDebtDto.feesAmount.toFixed(2),
        currentBalance: expectedUpdatedDebt.currentBalance,
      }));
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_DEBT_UPDATED,
        expect.objectContaining({
          debtId: 'existing-debt-id',
          organizationId: 'test-org-id',
          updatedBy: 'test-user-id',
        }),
        DebtUpdatedDto,
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
        expect.objectContaining({
          debtId: debtId,
          organizationId: orgId,
          portfolioId: initialDebt.portfolioId,
          oldStatus: DebtStatus.IMPORTED, // Explicitly set to the initial status
          newStatus: updateDebtDto.status,
          updatedBy: userId,
        }),
        DebtStatusChangedDto,
      );

      expect(result).toBeDefined();
      expect(result.id).toEqual(debtId);
      expect(result.notes).toEqual(updateDebtDto.notes);
      expect(result.status).toEqual(updateDebtDto.status);
      expect(result.interestAmount).toEqual(updateDebtDto.interestAmount.toFixed(2));
      expect(result.feesAmount).toEqual(updateDebtDto.feesAmount.toFixed(2));
      expect(result.currentBalance).toEqual(expectedUpdatedDebt.currentBalance);
    });

    it('should successfully update only notes for a collector user with debt:update:notes permission', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Old Creditor',
        accountNumber: 'ACC-OLD',
        principalAmount: '1000.00',
        interestAmount: '50.00',
        feesAmount: '20.00',
        currentBalance: '1070.00',
        status: DebtStatus.IMPORTED,
        originalDebtDate: new Date('2023-01-01'),
        lastPaymentDate: null,
        notes: 'Initial notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Debt

      const updateDebtDto = {
        notes: 'Updated notes by collector',
        interestAmount: 60.00, // Should be ignored
        status: DebtStatus.ACTIVE, // Should be ignored without debt:update
      };

      const expectedUpdatedDebt = {
        ...initialDebt,
        notes: updateDebtDto.notes,
        updatedAt: new Date(),
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      requestContext.getPermissions.mockReturnValue(['debt:update:notes']); // Collector user
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({ userId, portfolioId: initialDebt.portfolioId } as UserPortfolioPermission);
      debtRepository.save.mockResolvedValue(expectedUpdatedDebt);
      (isValidStatusTransition as jest.Mock).mockReturnValue(true);

      const result = await service.update(debtId, updateDebtDto);

      expect(requestContext.getPermissions).toHaveBeenCalled();
      expect(debtRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...initialDebt,
        notes: updateDebtDto.notes,
        // Financial fields and status should NOT be updated by collector
        interestAmount: initialDebt.interestAmount,
        feesAmount: initialDebt.feesAmount,
        status: initialDebt.status,
      }));
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_DEBT_UPDATED,
        expect.objectContaining({
          debtId: 'existing-debt-id',
          updatedBy: 'test-user-id',
        }),
        DebtUpdatedDto,
      );
      expect(eventPublisher.publish).not.toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
        expect.anything(),
        DebtStatusChangedDto,
      ); // Status not changed

      expect(result.notes).toEqual(updateDebtDto.notes);
      expect(result.interestAmount).toEqual(initialDebt.interestAmount);
    });

    it('should throw DebtNotFoundException if debt does not exist', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'non-existent-debt-id';
      const updateDebtDto = { notes: 'Some notes' };

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(null); // Debt not found

      await expect(service.update(debtId, updateDebtDto)).rejects.toThrow('Debt with ID \'non-existent-debt-id\' not found or you do not have access to it.');
      expect(debtRepository.findOne).toHaveBeenCalledWith({
        where: { id: debtId, organizationId: orgId },
        relations: ['debtorLinks'],
      });
    });

    it('should throw PortfolioAccessDeniedException if user does not have access to the portfolio', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        status: DebtStatus.IMPORTED,
      } as unknown as Debt
      const updateDebtDto = { notes: 'Some notes' };

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue(null); // No access

      await expect(service.update(debtId, updateDebtDto)).rejects.toThrow('Access denied. You do not have permission to access debts in portfolio \'test-portfolio-id\'.');
      expect(userPortfolioPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { userId, portfolioId: initialDebt.portfolioId },
      });
    });

    it('should throw InvalidStatusTransitionException for an invalid status transition', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        status: DebtStatus.PAID_IN_FULL,
      } as unknown as Debt
      const updateDebtDto = { status: DebtStatus.ACTIVE }; // Invalid transition

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      requestContext.getPermissions.mockReturnValue(['debt:update']);
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({ userId, portfolioId: initialDebt.portfolioId } as UserPortfolioPermission);
      (isValidStatusTransition as jest.Mock).mockReturnValue(false); // Simulate invalid transition

      await expect(service.update(debtId, updateDebtDto)).rejects.toThrow(`Invalid status transition from '${initialDebt.status}' to '${updateDebtDto.status}'. This transition is not allowed by the debt lifecycle state machine.`);
      expect(isValidStatusTransition).toHaveBeenCalledWith(initialDebt.status, updateDebtDto.status);
    });

    it('should not update immutable fields like principalAmount even if provided in DTO', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Old Creditor',
        accountNumber: 'ACC-OLD',
        principalAmount: '1000.00',
        interestAmount: '50.00',
        feesAmount: '20.00',
        currentBalance: '1070.00',
        status: DebtStatus.IMPORTED,
        originalDebtDate: new Date('2023-01-01'),
        lastPaymentDate: null,
        notes: 'Initial notes',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Debt

      const updateDebtDto = {
        principalAmount: 2000.00, // Attempt to update immutable field
        originalDebtDate: '2024-01-01', // Attempt to update immutable field
        notes: 'Updated notes, immutable fields ignored',
      };

      const expectedUpdatedDebt = {
        ...initialDebt,
        notes: updateDebtDto.notes,
        updatedAt: new Date(),
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      requestContext.getPermissions.mockReturnValue(['debt:update']); // Admin user
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({ userId, portfolioId: initialDebt.portfolioId } as UserPortfolioPermission);
      debtRepository.save.mockResolvedValue(expectedUpdatedDebt);
      (isValidStatusTransition as jest.Mock).mockReturnValue(true);

      const result = await service.update(debtId, updateDebtDto);

      expect(debtRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...initialDebt,
        notes: updateDebtDto.notes,
        // Assert that immutable fields are NOT changed
        principalAmount: initialDebt.principalAmount,
        originalDebtDate: initialDebt.originalDebtDate,
      }));
      expect(result.notes).toEqual(updateDebtDto.notes);
      expect(result.principalAmount).toEqual(initialDebt.principalAmount);
      expect(new Date(result.originalDebtDate)).toEqual(initialDebt.originalDebtDate);
    });

    it('should throw an error if organizationId is not found', async () => {
      requestContext.getOrgId.mockReturnValue(undefined); // Simulate missing orgId
      requestContext.getUserId.mockReturnValue('test-user-id');

      const updateDebtDto: any = {};
      await expect(service.update('some-id', updateDebtDto)).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is not found', async () => {
      requestContext.getOrgId.mockReturnValue('test-org-id');
      requestContext.getUserId.mockReturnValue(undefined); // Simulate missing userId

      const updateDebtDto: any = {};
      await expect(service.update('some-id', updateDebtDto)).rejects.toThrow('User context is required');
    });
  });

  describe('findOne', () => {
    it('should successfully retrieve a single debt by ID with authorization', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'test-debt-id';
      const mockDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Test Creditor',
        accountNumber: 'ACC-123',
        principalAmount: '1000.00',
        interestAmount: '50.00',
        feesAmount: '20.00',
        currentBalance: '1070.00',
        status: DebtStatus.IMPORTED,
        debtCategory: DebtCategory.OTHER,
        debtSubcategory: null,
        originalDebtDate: new Date('2023-01-01'),
        lastPaymentDate: null,
        notes: 'Initial notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        debtorLinks: [],
        // New fields added for entity architecture
        isDisputed: false,
        disputedAt: null,
        disputeReason: null,
        firstDelinquencyDate: null,
        placementDate: null,
        chargeOffDate: null,
        lastTransactionDate: null,
        lastContactDate: null,
        statuteOfLimitationsDate: null,
        statuteOfLimitationsState: null,
        creditorId: null,
        importNotes: null,
        importBatchId: null,
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(mockDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({ userId, portfolioId: mockDebt.portfolioId } as UserPortfolioPermission); // Access granted

      const result = await service.findOne(debtId);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();
      expect(debtRepository.findOne).toHaveBeenCalledWith({
        where: { id: debtId, organizationId: orgId },
        relations: ['debtorLinks'],
      });
      expect(userPortfolioPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { userId, portfolioId: mockDebt.portfolioId },
      });
      expect(result).toBeDefined();
      expect(result.id).toEqual(debtId);
      expect(result.organizationId).toEqual(orgId);
    });

    it('should throw DebtNotFoundException if debt does not exist', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'non-existent-debt-id';

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(null); // Debt not found

      await expect(service.findOne(debtId)).rejects.toThrow('Debt with ID \'non-existent-debt-id\' not found or you do not have access to it.');
      expect(debtRepository.findOne).toHaveBeenCalledWith({
        where: { id: debtId, organizationId: orgId },
        relations: ['debtorLinks'],
      });
    });

    it('should throw PortfolioAccessDeniedException if user does not have access to the portfolio', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'test-debt-id';
      const mockDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(mockDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue(null); // No access

      await expect(service.findOne(debtId)).rejects.toThrow('Access denied. You do not have permission to access debts in portfolio \'test-portfolio-id\'.');
      expect(userPortfolioPermissionRepository.findOne).toHaveBeenCalledWith({
        where: { userId, portfolioId: mockDebt.portfolioId },
      });
    });

    it('should throw an error if organizationId is not found', async () => {
      requestContext.getOrgId.mockReturnValue(undefined); // Simulate missing orgId
      requestContext.getUserId.mockReturnValue('test-user-id');

      await expect(service.findOne('some-id')).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is not found', async () => {
      requestContext.getOrgId.mockReturnValue('test-org-id');
      requestContext.getUserId.mockReturnValue(undefined); // Simulate missing userId

      await expect(service.findOne('some-id')).rejects.toThrow('User context is required');
    });
  });

  describe('remove', () => {
    it('should successfully soft delete a debt by changing its status to CHARGED_OFF', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        status: DebtStatus.ACTIVE,
      } as unknown as Debt

      const updatedDebt = {
        ...initialDebt,
        status: DebtStatus.CHARGED_OFF,
        updatedAt: new Date(), // Add this line
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({ userId, portfolioId: initialDebt.portfolioId } as UserPortfolioPermission);
      (isValidStatusTransition as jest.Mock).mockReturnValue(true);
      debtRepository.save.mockResolvedValue(updatedDebt);

      const result = await service.remove(debtId);

      expect(debtRepository.findOne).toHaveBeenCalledWith({ where: { id: debtId, organizationId: orgId } });
      expect(userPortfolioPermissionRepository.findOne).toHaveBeenCalledWith({ where: { userId, portfolioId: initialDebt.portfolioId } });
      expect(isValidStatusTransition).toHaveBeenCalledWith(DebtStatus.ACTIVE, DebtStatus.CHARGED_OFF);
      expect(debtRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...initialDebt,
        status: DebtStatus.CHARGED_OFF,
      }));
      expect(eventPublisher.publish).toHaveBeenCalledWith(
        EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
        expect.objectContaining({
          debtId: 'existing-debt-id',
          newStatus: 'CHARGED_OFF',
          oldStatus: 'ACTIVE',
          updatedBy: 'test-user-id',
        }),
        DebtStatusChangedDto,
      );

    });

    it('should throw DebtNotFoundException if the debt does not exist', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'non-existent-debt-id';

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(debtId)).rejects.toThrow(DebtNotFoundException);
    });

    it('should throw PortfolioAccessDeniedException if the user lacks portfolio access', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'forbidden-portfolio',
        status: DebtStatus.ACTIVE,
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue(null); // No access

      await expect(service.remove(debtId)).rejects.toThrow(PortfolioAccessDeniedException);
    });

    it('should throw InvalidStatusTransitionException if the transition to CHARGED_OFF is not allowed', async () => {
      const orgId = 'test-org-id';
      const userId = 'test-user-id';
      const debtId = 'existing-debt-id';
      const initialDebt = {
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
        status: DebtStatus.PAID_IN_FULL, // Invalid starting status
      } as unknown as Debt

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue(initialDebt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({ userId, portfolioId: initialDebt.portfolioId } as UserPortfolioPermission);
      (isValidStatusTransition as jest.Mock).mockReturnValue(false); // Simulate invalid transition

      await expect(service.remove(debtId)).rejects.toThrow(InvalidStatusTransitionException);
    });

    it('should throw an error if organizationId is not found', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);
      requestContext.getUserId.mockReturnValue('test-user-id');

      await expect(service.remove('some-id')).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is not found', async () => {
      requestContext.getOrgId.mockReturnValue('test-org-id');
      requestContext.getUserId.mockReturnValue(undefined);

      await expect(service.remove('some-id')).rejects.toThrow('User context is required');
    });
  });

  describe('findMyDebts', () => {
    const query = { pageSize: 10, offset: 0 };

    it('should return a paginated list of debts from Redis for a debtor user', async () => {
      const orgId = 'test-org-id';
      const userId = 'debtor-user-id';
      const mockRedisResponse = {
        debts: [
          { id: 'debt1', currentBalance: 500 },
          { id: 'debt2', currentBalance: 600 },
        ],
        total: 2,
      };

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtIndexService.getDebtorDebtsInOrg.mockResolvedValue(['debt1-id', 'debt2-id']);
      debtIndexService.getDebtSummaries.mockResolvedValue([
        { debtId: 'debt1-id', amount: 500, currency: 'USD', status: DebtStatus.ACTIVE, createdAt: new Date().toISOString(), organizationId: orgId, debtorProfileId: 'debtor1' },
        { debtId: 'debt2-id', amount: 600, currency: 'USD', status: DebtStatus.ACTIVE, createdAt: new Date().toISOString(), organizationId: orgId, debtorProfileId: 'debtor1' },
      ]);

      const result = await service.findMyDebts(query.pageSize, query.offset);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();
      expect(debtIndexService.getDebtorDebtsInOrg).toHaveBeenCalledWith(userId, orgId, query.pageSize, query.offset);
      expect(debtIndexService.getDebtSummaries).toHaveBeenCalledWith(['debt1-id', 'debt2-id']);
      expect(result.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'debt1-id', currentBalance: '500' }),
        expect.objectContaining({ id: 'debt2-id', currentBalance: '600' }),
      ]));
      expect(result.total).toEqual(2);
      expect(result.page).toEqual(Math.floor(query.offset / query.pageSize) + 1);
      expect(result.pageSize).toEqual(query.pageSize);
      expect(result.totalPages).toEqual(Math.ceil(2 / query.pageSize));
    });

    it('should return an empty result when Redis has no data for the user', async () => {
      const orgId = 'test-org-id';
      const userId = 'debtor-user-id-no-debts';
      const mockRedisResponse = {
        debts: [],
        total: 0,
      };

      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtIndexService.getDebtorDebtsInOrg.mockResolvedValue([]); // Return empty array for no debts

      const result = await service.findMyDebts(query.pageSize, query.offset);

      expect(debtIndexService.getDebtorDebtsInOrg).toHaveBeenCalledWith(userId, orgId, query.pageSize, query.offset);
      expect(result.data).toEqual([]);
      expect(result.total).toEqual(0);
      expect(result.page).toEqual(Math.floor(query.offset / query.pageSize) + 1);
      expect(result.totalPages).toEqual(0);
    });

    it('should throw an error if organizationId is not found', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);
      requestContext.getUserId.mockReturnValue('debtor-user-id');

      await expect(service.findMyDebts(query.pageSize, query.offset)).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is not found', async () => {
      requestContext.getOrgId.mockReturnValue('test-org-id');
      requestContext.getUserId.mockReturnValue(undefined);

      await expect(service.findMyDebts(query.pageSize, query.offset)).rejects.toThrow('User context is required');
    });
  });
});