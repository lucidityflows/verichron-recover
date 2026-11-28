// Mock uuid before importing anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
  validate: jest.fn(() => true),
}));

// Mock path module
jest.mock('path', () => ({
  default: {
    join: jest.fn((...args) => args.join('/')),
  },
  join: jest.fn((...args) => args.join('/')),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
}));

// Mock process.cwd
const originalCwd = process.cwd;
process.cwd = jest.fn(() => '/app');

import { Repository } from "typeorm";
import { ImportJob } from "../entities/import-job.entity";
import { ImportsService } from "./imports.service";
import { ImportsProcessor } from "./imports.processor";
import { RequestContext } from "../../core/services/request-context.service";
import { TestingModule } from "@nestjs/testing";
import { createSilentTestingModule } from "@verichron/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { CreateImportDto } from "../dto/create-import.dto";
import { ImportJobStatus, SortOrder } from "@verichron/enums";
import { ImportJobNotFoundException } from "../errors";
import * as fs from 'fs/promises'; 



// Mock app-root-path to prevent TypeORM initialization issues
jest.mock('app-root-path', () => ({
  path: '/mock/project/root', // Provide a mock path
  resolve: jest.fn((p) => `/mock/project/root/${p}`), // Mock resolve if needed
  // Add other methods if TypeORM calls them
}));

// Mock app-root-path to prevent TypeORM initialization issues
jest.mock('app-root-path', () => ({
  path: '/mock/project/root', // Provide a mock path
  resolve: jest.fn((p) => `/mock/project/root/${p}`), // Mock resolve if needed
  // Add other methods if TypeORM calls them
}));

describe('ImportsService', () => {
  let service: ImportsService;
  let importJobRepository: jest.Mocked<Repository<ImportJob>>;
  let importsProcessor: jest.Mocked<ImportsProcessor>;
  let requestContext: jest.Mocked<RequestContext>;
  let mockMulterFile: Express.Multer.File;

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        ImportsService,
        {
          provide: getRepositoryToken(ImportJob),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({ // Mocking the entire chain for query builder
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(), // This is the method we want to mock further down
            }),
          },
        },
        {
          provide: ImportsProcessor,
          useValue: {
            processImport: jest.fn(),
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

    service = module.get<ImportsService>(ImportsService);
    importJobRepository = module.get(getRepositoryToken(ImportJob));
    importsProcessor = module.get(ImportsProcessor);
    requestContext = module.get(RequestContext);

    mockMulterFile = {
      fieldname: 'file',
      originalname: 'test.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: 1024,
      destination: '',
      filename: '',
      path: '',
      buffer: Buffer.from('header1,header2\nvalue1,value2'),
      stream: {} as any, // Added to satisfy Express.Multer.File interface
    };

    // Ensure ensureUploadsDirectory doesn't fail tests
    jest.spyOn(service as any, 'ensureUploadsDirectory').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const orgId = 'test-org-id';
    const userId = 'test-user-id';
    const createDto: CreateImportDto = {
      portfolioName: 'My Portfolio',
      purchaseDate: '2023-01-01', // Added dummy value
      purchasePrice: 1000.00,    // Added dummy value
      source: 'External System', // Added dummy value
    };

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(userId);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined); // Ensure directory creation success
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined); // Ensure file write success
      jest.spyOn(service as any, 'processImportAsync').mockResolvedValue(undefined); // Mock for create tests
    });

    it('should create an import job, save the file, and trigger processing', async () => {
      const mockImportJob: ImportJob = {
        id: 'job-id-1',
        organizationId: orgId,
        portfolioName: createDto.portfolioName,
        fileLocation: '',
        status: ImportJobStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalRows: 10,
        processedRows: 0,
        errorMessage: "There was an error",
        portfolioId: "test-portfolio-id",
        metadata: {}

      };
      importJobRepository.create.mockReturnValue(mockImportJob);
      importJobRepository.save.mockResolvedValue(mockImportJob);

      // Spy on the private saveFile method
      const saveFileSpy = jest.spyOn(service as any, 'saveFile').mockResolvedValue('uploads/test-org-id/job-id-1.csv');

      const result = await service.create(createDto, mockMulterFile);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(requestContext.getUserId).toHaveBeenCalled();
      expect(importJobRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: orgId,
        portfolioName: createDto.portfolioName,
        status: ImportJobStatus.PENDING,
      }));
      expect(importJobRepository.save).toHaveBeenCalledTimes(2); // Initial save + update with fileLocation
      expect(saveFileSpy).toHaveBeenCalledWith(orgId, mockImportJob.id, mockMulterFile);
      expect(service['processImportAsync']).toHaveBeenCalledWith(
        mockImportJob.id,
        orgId,
        userId,
        createDto,
      );
      expect(result.id).toEqual(mockImportJob.id);
      expect(result.status).toEqual(ImportJobStatus.PENDING);
    });

    it('should throw an error if orgId is missing', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);
      await expect(service.create(createDto, mockMulterFile)).rejects.toThrow('Organization context is required');
    });

    it('should throw an error if userId is missing', async () => {
      requestContext.getOrgId.mockReturnValue(orgId);
      requestContext.getUserId.mockReturnValue(undefined);
      await expect(service.create(createDto, mockMulterFile)).rejects.toThrow('User context is required');
    });
  });

  describe('findAll', () => {
    const orgId = 'test-org-id';
    const query = { page: 1, pageSize: 10, status: ImportJobStatus.COMPLETED, order: SortOrder.DESC };
    const mockImportJobs = [
      { id: 'job1', organizationId: orgId, status: ImportJobStatus.COMPLETED, createdAt: new Date(), updatedAt: new Date() },
      { id: 'job2', organizationId: orgId, status: ImportJobStatus.COMPLETED, createdAt: new Date(), updatedAt: new Date() },
    ] as ImportJob[];

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
      (importJobRepository.createQueryBuilder().getManyAndCount as jest.Mock).mockResolvedValue([mockImportJobs, 2]);
    });

    it('should return a paginated list of import jobs', async () => {
      const result = await service.findAll(query);

      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(importJobRepository.createQueryBuilder).toHaveBeenCalledWith('import_job');
      expect(importJobRepository.createQueryBuilder().where).toHaveBeenCalledWith('import_job.organization_id = :organizationId', { organizationId: orgId });
      expect(importJobRepository.createQueryBuilder().andWhere).toHaveBeenCalledWith('import_job.status = :status', { status: query.status });
      expect(importJobRepository.createQueryBuilder().orderBy).toHaveBeenCalledWith('import_job.created_at', 'DESC');
      expect(importJobRepository.createQueryBuilder().skip).toHaveBeenCalledWith(0);
      expect(importJobRepository.createQueryBuilder().take).toHaveBeenCalledWith(10);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should throw an error if orgId is missing', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);
      await expect(service.findAll(query)).rejects.toThrow('Organization context is required');
    });
  });

  describe('findOne', () => {
    const orgId = 'test-org-id';
    const jobId = 'job-id-1';
    const mockImportJob = { id: jobId, organizationId: orgId, createdAt: new Date(), updatedAt: new Date() } as ImportJob;

    beforeEach(() => {
      requestContext.getOrgId.mockReturnValue(orgId);
    });

    it('should return a single import job', async () => {
      importJobRepository.findOne.mockResolvedValue(mockImportJob);
      const result = await service.findOne(jobId);
      expect(requestContext.getOrgId).toHaveBeenCalled();
      expect(importJobRepository.findOne).toHaveBeenCalledWith({ where: { id: jobId, organizationId: orgId } });
      expect(result.id).toEqual(jobId);
    });

    it('should throw ImportJobNotFoundException if not found', async () => {
      importJobRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(jobId)).rejects.toThrow(ImportJobNotFoundException);
    });

    it('should throw an error if orgId is missing', async () => {
      requestContext.getOrgId.mockReturnValue(undefined);
      await expect(service.findOne(jobId)).rejects.toThrow('Organization context is required');
    });
  });

  describe('saveFile', () => {
    const orgId = 'test-org-id';
    const jobId = 'job-id-1';
    const expectedFilePath = '/app/uploads/test-org-id/job-id-1.csv';

    it('should save the file to the correct location and create org directory', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const filePath = await service['saveFile'](orgId, jobId, mockMulterFile);

      expect(fs.mkdir).toHaveBeenCalledWith('/app/uploads/test-org-id', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(expectedFilePath, mockMulterFile.buffer);
      expect(filePath).toEqual(expectedFilePath);
    });

    it('should throw an error if file saving fails', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write error'));
      await expect(service['saveFile'](orgId, jobId, mockMulterFile)).rejects.toThrow('Write error');
    });
  });

  describe('processImportAsync', () => {
    const jobId = 'job-id-1';
    const orgId = 'test-org-id';
    const userId = 'user-id-1';
    const createDto: CreateImportDto = { 
      portfolioName: 'My Portfolio',
      purchaseDate: new Date().toISOString(),
      purchasePrice: 5000,
      source: "Fake Debt Seller"

    };

    it('should call ImportsProcessor.processImport', async () => {
      await service['processImportAsync'](jobId, orgId, userId, createDto);
      expect(importsProcessor.processImport).toHaveBeenCalledWith(jobId, orgId, userId, createDto);
    });

    it('should log an error if ImportsProcessor.processImport fails', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
      importsProcessor.processImport.mockRejectedValue(new Error('Processor error'));

      await service['processImportAsync'](jobId, orgId, userId, createDto);

      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Import processing failed'), expect.any(Object));
      loggerErrorSpy.mockRestore();
    });
  });

  describe('ensureUploadsDirectory', () => {
    beforeEach(() => {
      // Restore the spy so the actual method runs
      jest.restoreAllMocks();
    });

    it('should create the uploads directory if it does not exist', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      const loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});

      await service['ensureUploadsDirectory']();

      expect(fs.mkdir).toHaveBeenCalledWith('/app/uploads', { recursive: true });
      expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('Uploads directories ready'));
      loggerLogSpy.mockRestore();
    });

    it('should log an error if directory creation fails', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
      (fs.mkdir as jest.Mock).mockRejectedValue(new Error('Directory creation failed'));

      await service['ensureUploadsDirectory']();

      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to create uploads directory', expect.any(Object));
      loggerErrorSpy.mockRestore();
    });
  })
});