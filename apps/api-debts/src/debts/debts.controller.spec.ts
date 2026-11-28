import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { QueryDebtsDto } from './dto/query-debts.dto';
import { DebtResponseDto, PaginatedDebtResponseDto } from './dto/debt-response.dto';
import {
  HttpStatus,
  ValidationPipe,
  INestApplication, // Added
} from '@nestjs/common';
import request from 'supertest';
import { PermissionsGuard } from '@verichron/auth';
import { DebtStatus, DebtSortField, SortOrder, DebtCategory } from '@verichron/enums';

describe('DebtsController', () => {
  let app: INestApplication;
  let debtsService: jest.Mocked<DebtsService>;

  const organizationId = '123e4567-e89b-12d3-a456-426614174000';

  const mockDebtsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findMyDebts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [DebtsController],
      providers: [
        {
          provide: DebtsService,
          useValue: mockDebtsService,
        },
      ],
    })
    .overrideGuard(PermissionsGuard)
    .useValue({ canActivate: () => true }) // Mock the guard to always allow access
    .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true })); // Add this line
    await app.init();

    debtsService = module.get(DebtsService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    const controller = app.get<DebtsController>(DebtsController);
    expect(controller).toBeDefined();
  });

  describe('POST /debts', () => {
    it('should call create service method and return the created debt', async () => {
      const createDebtDto: CreateDebtDto = {
        portfolioId: '7c9e6679-7425-40de-944b-e07fc1f90ae7', // Valid UUID
        originalCreditorName: 'Test Creditor',
        accountNumber: 'ACC-123',
        principalAmount: 1000.00,
        interestAmount: 50.00,
        feesAmount: 20.00,
        status: DebtStatus.IMPORTED,
        originalDebtDate: '2023-01-01',
        debtorProfileIds: ['8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c'], // Valid UUID
        debtorIdentityId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Valid UUID
      };

      const expectedResponse: DebtResponseDto = {
        id: 'new-debt-id',
        organizationId: 'test-org-id',
        ...createDebtDto,
        principalAmount: createDebtDto.principalAmount.toFixed(2), // Converted to string, added !
        interestAmount: createDebtDto.interestAmount!.toFixed(2), // Converted to string, added !
        feesAmount: createDebtDto.feesAmount!.toFixed(2), // Converted to string, added !
        currentBalance: (createDebtDto.principalAmount + createDebtDto.interestAmount! + createDebtDto.feesAmount!).toFixed(2), // Converted to string, added !
        debtCategory: createDebtDto.debtCategory!,
        debtSubcategory: createDebtDto.debtSubcategory || null,
        lastPaymentDate: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      debtsService.create.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/debts/debts/orgs/${organizationId}`)
        .send(createDebtDto)
        .expect(HttpStatus.CREATED);

      expect(debtsService.create).toHaveBeenCalledWith(createDebtDto);
      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe('GET /debts', () => {
    it('should call findAll service method and return paginated debts', async () => {
      const query: QueryDebtsDto = { page: 1, pageSize: 10, orderBy: DebtSortField.CREATED_AT, order: SortOrder.DESC };
      const expectedResponse: PaginatedDebtResponseDto = {
        data: [],
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      };

      debtsService.findAll.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get(`/debts/debts/orgs/${organizationId}`)
        .query(query)
        .expect(HttpStatus.OK);

      expect(debtsService.findAll).toHaveBeenCalledWith(query);
      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe('GET /debts/:id', () => {
    it('should call findOne service method and return a single debt', async () => {
      const debtId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResponse: DebtResponseDto = {
        id: debtId,
        organizationId: 'test-org-id',
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
        originalDebtDate: '2023-01-01',
        debtorProfileIds: ['debtor1'],
        lastPaymentDate: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      debtsService.findOne.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get(`/debts/debts/orgs/${organizationId}/${debtId}`)
        .expect(HttpStatus.OK);

      expect(debtsService.findOne).toHaveBeenCalledWith(debtId);
      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe('PATCH /debts/:id', () => {
    it('should call update service method and return the updated debt', async () => {
      const debtId = '123e4567-e89b-12d3-a456-426614174000';
      const updateDebtDto: UpdateDebtDto = { notes: 'Updated notes' };
      const expectedResponse: DebtResponseDto = {
        id: debtId,
        organizationId: 'test-org-id',
        portfolioId: 'test-portfolio-id',
        originalCreditorName: 'Test Creditor',
        accountNumber: 'ACC-123',
        principalAmount: '1000.00',
        interestAmount: '50.00',
        feesAmount: '20.00',
        currentBalance: '1070.00',
        status: DebtStatus.ACTIVE,
        debtCategory: DebtCategory.OTHER,
        debtSubcategory: null,
        originalDebtDate: '2023-01-01',
        debtorProfileIds: ['debtor1'],
        lastPaymentDate: null,
        notes: 'Updated notes',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      debtsService.update.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .patch(`/debts/debts/orgs/${organizationId}/${debtId}`)
        .send(updateDebtDto)
        .expect(HttpStatus.OK);

      expect(debtsService.update).toHaveBeenCalledWith(debtId, updateDebtDto);
      expect(response.body).toEqual(expectedResponse);
    });
  });

  describe('DELETE /debts/:id', () => {
    it('should call remove service method and return NO_CONTENT', async () => {
      const debtId = '123e4567-e89b-12d3-a456-426614174000';
      debtsService.remove.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/debts/debts/orgs/${organizationId}/${debtId}`)
        .expect(HttpStatus.NO_CONTENT);

      expect(debtsService.remove).toHaveBeenCalledWith(debtId);
    });
  });

  describe('GET /my-debts', () => {
    it('should call findMyDebts service method and return paginated debts', async () => {
        const query = { pageSize: 50, offset: 10 };
        const expectedResponse: PaginatedDebtResponseDto = {
            data: [],
            page: 1,
            pageSize: 50,
            total: 0,
            totalPages: 0,
          };

      debtsService.findMyDebts.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get(`/debts/debts/orgs/${organizationId}/my-debts`)
        .query(query)
        .expect(HttpStatus.OK);

      // The controller has default values for pageSize and offset
      // so we need to check with the actual values passed in the query
      expect(debtsService.findMyDebts).toHaveBeenCalledWith(query.pageSize, query.offset);
      expect(response.body).toEqual(expectedResponse);
    });
  });
});
