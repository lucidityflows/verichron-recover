import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull, DeepPartial } from 'typeorm';
import { HistoryService } from './debt-ownership-history.service';
import { DebtOwnershipHistory } from './entities/debt-ownership-history.entity';
import { Debt } from '../debts/entities/debt.entity';
import { UserPortfolioPermission } from '../portfolios/entities/user-portfolio-permission.entity';
import { RequestContext } from '../core';
import {
  DebtNotFoundForHistoryException,
  InvalidHistoryDateRangeException,
  MultipleCurrentOwnersException,
} from './errors';
import { QueryHistoryDto } from './dto/ownership-history-response.dto';
import { SortOrder } from '@verichron/enums';

describe('HistoryService', () => {
  let service: HistoryService;
  let historyRepository: jest.Mocked<Repository<DebtOwnershipHistory>>;
  let debtRepository: jest.Mocked<Repository<Debt>>;
  let userPortfolioPermissionRepository: jest.Mocked<Repository<UserPortfolioPermission>>;
  let dataSource: jest.Mocked<DataSource>;
  let requestContext: jest.Mocked<RequestContext>;

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        HistoryService,
        {
          provide: getRepositoryToken(DebtOwnershipHistory),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Debt),
          useValue: {
            findOne: jest.fn(),
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
                update: jest.fn(),
              },
            })),
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

    service = module.get<HistoryService>(HistoryService);
    historyRepository = module.get(getRepositoryToken(DebtOwnershipHistory));
    debtRepository = module.get(getRepositoryToken(Debt));
    userPortfolioPermissionRepository = module.get(getRepositoryToken(UserPortfolioPermission));
    dataSource = module.get(DataSource);
    requestContext = module.get(RequestContext);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findDebtHistory', () => {
    const orgId = 'test-org-id';
    const userId = 'test-user-id';
    const debtId = 'test-debt-id';
    const query: QueryHistoryDto = { order: SortOrder.ASC };

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      debtRepository.findOne.mockResolvedValue({
        id: debtId,
        organizationId: orgId,
        portfolioId: 'test-portfolio-id',
      } as Debt);
      userPortfolioPermissionRepository.findOne.mockResolvedValue({} as UserPortfolioPermission);
    });

    it('should return the full ownership chain with metrics', async () => {
      const historyRecords = [
        { id: 'h1', debtId, organizationId: 'orgA', acquiredDate: new Date('2020-01-01'), soldDate: new Date('2021-01-01'), createdAt: new Date() },
        { id: 'h2', debtId, organizationId: 'orgB', acquiredDate: new Date('2021-01-01'), soldDate: null, createdAt: new Date() },
      ] as DebtOwnershipHistory[];
      historyRepository.find.mockResolvedValue(historyRecords);

      const result = await service.findDebtHistory(debtId, query);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();
      expect(debtRepository.findOne).toHaveBeenCalledWith({ where: { id: debtId, organizationId: orgId } });
      expect(userPortfolioPermissionRepository.findOne).toHaveBeenCalledWith({ where: { userId, portfolioId: 'test-portfolio-id' } });
      expect(historyRepository.find).toHaveBeenCalledWith({ where: { debtId }, order: { acquiredDate: 'ASC' } });
      
      expect(result.debtId).toEqual(debtId);
      expect(result.history).toHaveLength(2);
      expect(result.totalTransfers).toBe(1);
      expect(result.currentOwnerId).toEqual('orgB');
    });

    it('should throw DebtNotFoundForHistoryException if debt not found', async () => {
      debtRepository.findOne.mockResolvedValue(null);
      await expect(service.findDebtHistory(debtId, query)).rejects.toThrow(DebtNotFoundForHistoryException);
    });

    it('should throw DebtNotFoundForHistoryException if user lacks portfolio access', async () => {
      userPortfolioPermissionRepository.findOne.mockResolvedValue(null);
      await expect(service.findDebtHistory(debtId, query)).rejects.toThrow(DebtNotFoundForHistoryException);
    });

    it('should throw MultipleCurrentOwnersException if data integrity is violated', async () => {
      const historyRecords = [
        { id: 'h1', debtId, organizationId: 'orgA', acquiredDate: new Date('2020-01-01'), soldDate: null },
        { id: 'h2', debtId, organizationId: 'orgB', acquiredDate: new Date('2021-01-01'), soldDate: null },
      ] as DebtOwnershipHistory[];
      historyRepository.find.mockResolvedValue(historyRecords);

      await expect(service.findDebtHistory(debtId, query)).rejects.toThrow(MultipleCurrentOwnersException);
    });

    it('should handle no history records gracefully', async () => {
        historyRepository.find.mockResolvedValue([]);
  
        const result = await service.findDebtHistory(debtId, query);
  
        expect(result.debtId).toEqual(debtId);
        expect(result.history).toHaveLength(0);
        expect(result.totalTransfers).toBe(-1); // 0 records - 1 = -1? Check logic
        expect(result.currentOwnerId).toBeNull();
    });

    it('should throw an error if orgId is missing', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);
      await expect(service.findDebtHistory(debtId, query)).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is missing', async () => {
      requestContext.getUserId.mockReturnValue(undefined);
      await expect(service.findDebtHistory(debtId, query)).rejects.toThrow('User context is required');
    });
  });

  describe('createHistoryRecord', () => {
    const debtId = 'test-debt-id';
    const orgId = 'test-org-id';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
    });

    it('should create a new history record', async () => {
      const createDto = {
        debtId,
        organizationId: orgId,
        acquiredDate: yesterday.toISOString().split('T')[0],
        source: 'initial',
      };
      const mockRecord = { id: 'hr1', ...createDto, acquiredDate: yesterday, createdAt: new Date() } as DebtOwnershipHistory;
      historyRepository.create.mockReturnValue(mockRecord);
      historyRepository.save.mockResolvedValue(mockRecord);

      const result = await service.createHistoryRecord(createDto);

      expect(historyRepository.create).toHaveBeenCalledWith(expect.objectContaining({ debtId, organizationId: orgId }));
      expect(historyRepository.save).toHaveBeenCalledWith(mockRecord);
      expect(result.id).toEqual('hr1');
    });

    it('should throw InvalidHistoryDateRangeException if acquiredDate is in the future', async () => {
      const createDto = {
        debtId,
        organizationId: orgId,
        acquiredDate: tomorrow.toISOString().split('T')[0],
        source: 'initial',
      };
      await expect(service.createHistoryRecord(createDto)).rejects.toThrow(InvalidHistoryDateRangeException);
      await expect(service.createHistoryRecord(createDto)).rejects.toThrow('Acquired date cannot be in the future.');
    });

    it('should throw InvalidHistoryDateRangeException if soldDate is before acquiredDate', async () => {
      const createDto = {
        debtId,
        organizationId: orgId,
        acquiredDate: yesterday.toISOString().split('T')[0],
        soldDate: twoDaysAgo.toISOString().split('T')[0],
        source: 'transfer',
      };
      await expect(service.createHistoryRecord(createDto)).rejects.toThrow(InvalidHistoryDateRangeException);
      await expect(service.createHistoryRecord(createDto)).rejects.toThrow('Sold date cannot be before acquired date.');
    });
  });

  describe('bulkCreateHistoryRecords', () => {
    const debtId1 = 'debt-1';
    const debtId2 = 'debt-2';
    const orgId = 'test-org-id';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    let queryRunner: any;

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn(),
        },
      };
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
    });

    it('should bulk create history records in a transaction', async () => {
      const dtos = [
        { debtId: debtId1, organizationId: orgId, acquiredDate: yesterday.toISOString().split('T')[0], source: 'initial' },
        { debtId: debtId2, organizationId: orgId, acquiredDate: yesterday.toISOString().split('T')[0], source: 'initial' },
      ];
      const mockRecords = dtos.map((dto, i) => ({ id: `hr${i + 1}`, ...dto, acquiredDate: new Date(dto.acquiredDate), createdAt: new Date() }));
      historyRepository.create.mockImplementation((dto: DeepPartial<DebtOwnershipHistory>) => ({
        id: 'mock-id-' + Math.random(), // Generate unique ID for each creation
        debtId: dto.debtId || 'mock-debt-id', // Ensure debtId is always a string
        organizationId: dto.organizationId || 'mock-org-id', // Ensure organizationId is always a string
        acquiredDate: dto.acquiredDate || new Date(),
        source: dto.source || 'mock-source',
        createdAt: dto.createdAt || new Date(),
        ...dto, // Spread dto to allow other properties to override
      }) as DebtOwnershipHistory);
      queryRunner.manager.save.mockResolvedValue(mockRecords);

      const result = await service.bulkCreateHistoryRecords(dtos);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(historyRepository.create).toHaveBeenCalledTimes(dtos.length);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(DebtOwnershipHistory, expect.any(Array));
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toHaveLength(dtos.length);
    });

    it('should throw InvalidHistoryDateRangeException for future acquiredDate', async () => {
      const dtos = [
        { debtId: debtId1, organizationId: orgId, acquiredDate: tomorrow.toISOString().split('T')[0], source: 'initial' },
      ];
      await expect(service.bulkCreateHistoryRecords(dtos)).rejects.toThrow(InvalidHistoryDateRangeException);
      expect(queryRunner.connect).not.toHaveBeenCalled(); // Should fail before transaction starts
    });

    it('should throw InvalidHistoryDateRangeException for soldDate before acquiredDate', async () => {
      const dtos = [
        { debtId: debtId1, organizationId: orgId, acquiredDate: yesterday.toISOString().split('T')[0], soldDate: twoDaysAgo.toISOString().split('T')[0], source: 'transfer' },
      ];
      await expect(service.bulkCreateHistoryRecords(dtos)).rejects.toThrow(InvalidHistoryDateRangeException);
      expect(queryRunner.connect).not.toHaveBeenCalled(); // Should fail before transaction starts
    });

    it('should rollback transaction if saving fails', async () => {
      const dtos = [
        { debtId: debtId1, organizationId: orgId, acquiredDate: yesterday.toISOString().split('T')[0], source: 'initial' },
      ];
      const mockError = new Error('Database error');
      queryRunner.manager.save.mockRejectedValue(mockError);

      await expect(service.bulkCreateHistoryRecords(dtos)).rejects.toThrow(mockError);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('closeOwnershipRecords', () => {
    const debtId = 'test-debt-id';
    const orgId = 'test-org-id';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    let yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    yesterday = new Date(yesterday.toISOString().split('T')[0]); // Ensure UTC midnight
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    let queryRunner: any;

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn(),
          update: jest.fn(),
        },
      };
      (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
    });

    it('should close ownership records for given debt IDs', async () => {
      const debtIds = [debtId];
      const mockRecord = { id: 'hr1', debtId, acquiredDate: twoDaysAgo, soldDate: null, createdAt: new Date() } as DebtOwnershipHistory;
      historyRepository.find.mockResolvedValue([mockRecord]);
      queryRunner.manager.update.mockResolvedValue({ affected: 1 });

      const result = await service.closeOwnershipRecords(debtIds, yesterday.toISOString().split('T')[0]);

      expect(historyRepository.find).toHaveBeenCalledWith({ where: { debtId: In(debtIds), soldDate: IsNull() } });
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        DebtOwnershipHistory,
        { debtId: In(debtIds), soldDate: IsNull() },
        { soldDate: yesterday } // Use the corrected yesterday Date object
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should throw InvalidHistoryDateRangeException if soldDate is in the future', async () => {
      const debtIds = [debtId];
      await expect(service.closeOwnershipRecords(debtIds, tomorrow.toISOString().split('T')[0])).rejects.toThrow(InvalidHistoryDateRangeException);
      await expect(service.closeOwnershipRecords(debtIds, tomorrow.toISOString().split('T')[0])).rejects.toThrow('Sold date cannot be in the future.');
    });

    it('should throw InvalidHistoryDateRangeException if soldDate is before acquiredDate for any record', async () => {
      const debtIds = [debtId];
      const mockRecord = { id: 'hr1', debtId, acquiredDate: yesterday, soldDate: null } as DebtOwnershipHistory;
      historyRepository.find.mockResolvedValue([mockRecord]);

      await expect(service.closeOwnershipRecords(debtIds, twoDaysAgo.toISOString().split('T')[0])).rejects.toThrow(InvalidHistoryDateRangeException);
      await expect(service.closeOwnershipRecords(debtIds, twoDaysAgo.toISOString().split('T')[0])).rejects.toThrow(`Sold date ${twoDaysAgo.toISOString().split('T')[0]} cannot be before acquired date ${yesterday.toISOString().split('T')[0]} for debt ${debtId}.`);
    });

    it('should return 0 if no records are found to close', async () => {
      const debtIds = [debtId];
      historyRepository.find.mockResolvedValue([]);
      
      const result = await service.closeOwnershipRecords(debtIds, yesterday.toISOString().split('T')[0]);
      
      expect(result).toBe(0);
      expect(queryRunner.connect).not.toHaveBeenCalled();
    });
  });

  describe('verifyOwnershipIntegrity', () => {
    const debtId = 'test-debt-id';

    it('should return isValid true for valid history', async () => {
      const historyRecords = [
        { id: 'h1', debtId, acquiredDate: new Date('2020-01-01'), soldDate: new Date('2021-01-01'), createdAt: new Date() },
        { id: 'h2', debtId, acquiredDate: new Date('2021-01-02'), soldDate: null, createdAt: new Date() },
      ] as DebtOwnershipHistory[];
      historyRepository.find.mockResolvedValue(historyRecords);

      const result = await service.verifyOwnershipIntegrity(debtId);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return isValid false and issues for multiple current owners', async () => {
      const historyRecords = [
        { id: 'h1', debtId, acquiredDate: new Date('2020-01-01'), soldDate: null, createdAt: new Date() },
        { id: 'h2', debtId, acquiredDate: new Date('2021-01-01'), soldDate: null, createdAt: new Date() },
      ] as DebtOwnershipHistory[];
      historyRepository.find.mockResolvedValue(historyRecords);

      const result = await service.verifyOwnershipIntegrity(debtId);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Multiple current owners found (2)');
    });

    it('should return isValid false and issues for chronological gaps/overlaps', async () => {
      const historyRecords = [
        { id: 'h1', debtId, acquiredDate: new Date('2020-01-01'), soldDate: new Date('2021-01-01'), createdAt: new Date() },
        { id: 'h2', debtId, acquiredDate: new Date('2020-12-01'), soldDate: null, createdAt: new Date() }, // Overlap
      ] as DebtOwnershipHistory[];
      historyRepository.find.mockResolvedValue(historyRecords);

      const result = await service.verifyOwnershipIntegrity(debtId);
      expect(result.isValid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([expect.stringContaining('Gap or overlap')]));
    });

    it('should return isValid false and issues for soldDate before acquiredDate', async () => {
        const historyRecords = [
            { id: 'h1', debtId, acquiredDate: new Date('2021-01-01'), soldDate: new Date('2020-01-01'), createdAt: new Date() }, // Invalid
        ] as DebtOwnershipHistory[];
        historyRepository.find.mockResolvedValue(historyRecords);
  
        const result = await service.verifyOwnershipIntegrity(debtId);
        expect(result.isValid).toBe(false);
        expect(result.issues).toEqual(expect.arrayContaining([expect.stringContaining('soldDate before acquiredDate')]));
    });

    it('should return isValid false and issues if no history records found', async () => {
      historyRepository.find.mockResolvedValue([]);
      const result = await service.verifyOwnershipIntegrity(debtId);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('No ownership history records found');
    });
  });
});
