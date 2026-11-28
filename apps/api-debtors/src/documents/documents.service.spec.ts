/**
 * DocumentsService Unit Tests
 *
 * SYSTEM RULES VALIDATED:
 * - R-DBR-DOC-001: DocumentsService must manage debtor documents with GCS integration
 *
 * This includes:
 * - Organization-scoped access verification
 * - File type and size validation
 * - GCS upload/download operations
 * - Document metadata management
 * - Event publishing for document lifecycle
 * - Soft deletion (archiving)
 *
 * TESTING APPROACH:
 * - Unit tests in complete isolation
 * - All external dependencies (Repository, Services, GCS Bucket, EventPublisher, RequestContext) are mocked
 * - Tests focus on access control, file validation, GCS operations, and event publishing
 */

// Mock uuid before imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => '550e8400-e29b-41d4-a716-446655440004'),
}));

import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { DebtorDocumentType } from '@verichron/enums';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { RequestContext } from '../core/services/request-context.service';
import {
  DocumentUploadedDto,
  DocumentUpdatedDto,
  DocumentArchivedDto,
} from '../events/event-dto';
import {
  DocumentNotFoundException,
  InvalidDocumentTypeException,
  DocumentTooLargeException,
  DocumentUploadFailedException,
} from './errors';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepository: jest.Mocked<Repository<Document>>;
  let profilesService: jest.Mocked<ProfilesService>;
  let requestContext: jest.Mocked<RequestContext>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockOrgId = '550e8400-e29b-41d4-a716-446655440001';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440002';
  const mockDebtorProfileId = '550e8400-e29b-41d4-a716-446655440003';
  const mockDebtorIdentityId = '550e8400-e29b-41d4-a716-446655440005';
  const mockDocumentId = '550e8400-e29b-41d4-a716-446655440004';

  const mockDocument: any = {
    id: mockDocumentId,
    debtorProfileId: mockDebtorProfileId,
    organizationId: mockOrgId,
    documentType: DebtorDocumentType.IDENTITY_DOCUMENT,
    originalFilename: 'passport.pdf',
    storedFilename: `${mockDocumentId}-passport.pdf`,
    storagePath: `${mockOrgId}/${mockDebtorProfileId}/${mockDocumentId}-passport.pdf`,
    bucketName: 'verichron-debtors-documents',
    mimeType: 'application/pdf',
    fileSize: 1024000,
    description: 'Passport copy',
    metadata: {},
    tags: ['identity'],
    expiresAt: null,
    uploadedBy: mockUserId,
    isVerified: false,
    isArchived: false,
    verifiedBy: null,
    verifiedAt: null,
    archivedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFile: any = {
    fieldname: 'file',
    originalname: 'passport.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024000,
    buffer: Buffer.from('fake file content'),
  };

  const mockBucket: any = {
    file: jest.fn().mockReturnValue({
      createWriteStream: jest.fn().mockReturnValue({
        on: jest.fn(),
        end: jest.fn(),
      }),
      delete: jest.fn().mockResolvedValue(''),
      getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url']),
    }),
  };

  beforeEach(async () => {
    const mockDocumentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProfilesService = {
      findOne: jest.fn(),
    };

    const mockRequestContext = {
      getOrgId: jest.fn(),
      getUserId: jest.fn(),
    };

    const mockEventPublisher = {
      publish: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocumentRepository,
        },
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
        {
          provide: RequestContext,
          useValue: mockRequestContext,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    documentRepository = module.get(getRepositoryToken(Document));
    profilesService = module.get(ProfilesService);
    requestContext = module.get(RequestContext);
    eventPublisher = module.get(EventPublisher);

    // Set up default mocks
    requestContext.getOrgId.mockReturnValue(mockOrgId);
    requestContext.getUserId.mockReturnValue(mockUserId);

    // Mock the GCS bucket (private property)
    (service as any).bucket = mockBucket;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('R-DBR-DOC-001: Managing debtor documents with GCS integration', () => {
    describe('findAll with filtering and pagination', () => {
      it('should find all documents for a debtor with organization scoping', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[mockDocument], 1]),
        };

        documentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.findAll(mockDebtorProfileId, {});

        expect(result).toEqual({
          data: [mockDocument],
          total: 1,
          page: 1,
          pageSize: 20,
        });
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'document.debtorProfileId = :debtorId',
          { debtorId: mockDebtorProfileId },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'document.organizationId = :organizationId',
          { organizationId: mockOrgId },
        );
      });

      it('should filter out archived documents by default', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        documentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await service.findAll(mockDebtorProfileId, {});

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'document.isArchived = :isArchived',
          { isArchived: false },
        );
      });

      it('should apply document type filter', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        documentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await service.findAll(mockDebtorProfileId, { documentType: DebtorDocumentType.IDENTITY_DOCUMENT });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'document.documentType = :documentType',
          { documentType: DebtorDocumentType.IDENTITY_DOCUMENT },
        );
      });

      it('should apply pagination', async () => {
        const mockQueryBuilder = {
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        documentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        await service.findAll(mockDebtorProfileId, { page: 2, pageSize: 10 });

        expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      });
    });

    describe('findOne with access controls', () => {
      it('should find document by ID within organization', async () => {
        documentRepository.findOne.mockResolvedValue(mockDocument);

        const result = await service.findOne(mockDocumentId, mockDebtorProfileId);

        expect(result).toEqual(mockDocument);
        expect(documentRepository.findOne).toHaveBeenCalledWith({
          where: {
            id: mockDocumentId,
            debtorProfileId: mockDebtorProfileId,
            organizationId: mockOrgId,
          },
        });
      });

      it('should throw DocumentNotFoundException if not found', async () => {
        documentRepository.findOne.mockResolvedValue(null);

        await expect(
          service.findOne(mockDocumentId, mockDebtorProfileId),
        ).rejects.toThrow(DocumentNotFoundException);
      });
    });

    describe('upload with file validation and GCS integration', () => {
      it('should upload file to GCS and create metadata record', async () => {
        const uploadDto = {
          documentType: DebtorDocumentType.IDENTITY_DOCUMENT,
          description: 'Passport copy',
          tags: ['identity'],
        };

        // Mock the blob stream
        const mockBlobStream: any = {
          on: jest.fn((event: string, handler: () => void) => {
            if (event === 'finish') {
              setTimeout(handler, 0);
            }
            return mockBlobStream;
          }),
          end: jest.fn(),
        };

        const mockBlob = {
          createWriteStream: jest.fn().mockReturnValue(mockBlobStream),
        };

        mockBucket.file.mockReturnValue(mockBlob);

        documentRepository.create.mockReturnValue(mockDocument);
        documentRepository.save.mockResolvedValue(mockDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.upload(mockDebtorProfileId, mockFile, uploadDto);

        expect(result).toEqual(mockDocument);
        expect(mockBlob.createWriteStream).toHaveBeenCalled();
        expect(documentRepository.save).toHaveBeenCalled();
      });

      it('should validate file MIME type', async () => {
        const invalidFile = { ...mockFile, mimetype: 'application/exe' };
        const uploadDto = { documentType: DebtorDocumentType.IDENTITY_DOCUMENT };

        await expect(
          service.upload(mockDebtorProfileId, invalidFile, uploadDto),
        ).rejects.toThrow(InvalidDocumentTypeException);
      });

      it('should validate file size', async () => {
        const largeFile = { ...mockFile, size: 20 * 1024 * 1024 }; // 20MB
        const uploadDto = { documentType: DebtorDocumentType.IDENTITY_DOCUMENT };

        await expect(
          service.upload(mockDebtorProfileId, largeFile, uploadDto),
        ).rejects.toThrow(DocumentTooLargeException);
      });

      it('should publish DocumentUploaded event', async () => {
        const uploadDto = {
          documentType: DebtorDocumentType.IDENTITY_DOCUMENT,
        };

        const mockBlobStream: any = {
          on: jest.fn((event: string, handler: () => void) => {
            if (event === 'finish') {
              setTimeout(handler, 0);
            }
            return mockBlobStream;
          }),
          end: jest.fn(),
        };

        const mockBlob = {
          createWriteStream: jest.fn().mockReturnValue(mockBlobStream),
        };

        mockBucket.file.mockReturnValue(mockBlob);

        documentRepository.create.mockReturnValue(mockDocument);
        documentRepository.save.mockResolvedValue(mockDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.upload(mockDebtorProfileId, mockFile, uploadDto);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_UPLOADED,
          expect.objectContaining({
            documentId: mockDocumentId,
            debtorId: mockDebtorIdentityId,
            organizationId: mockOrgId,
            documentType: DebtorDocumentType.IDENTITY_DOCUMENT,
          }),
          DocumentUploadedDto,
        );
      });

      it('should clean up GCS file on save failure', async () => {
        const uploadDto = { documentType: DebtorDocumentType.IDENTITY_DOCUMENT };

        const mockBlobStream: any = {
          on: jest.fn((event: string, handler: () => void) => {
            if (event === 'finish') {
              setTimeout(handler, 0);
            }
            return mockBlobStream;
          }),
          end: jest.fn(),
        };

        const mockBlob = {
          createWriteStream: jest.fn().mockReturnValue(mockBlobStream),
        };

        const mockDeleteFile = {
          delete: jest.fn().mockResolvedValue(''),
        };

        mockBucket.file.mockReturnValueOnce(mockBlob).mockReturnValueOnce(mockDeleteFile);

        documentRepository.create.mockReturnValue(mockDocument);
        documentRepository.save.mockRejectedValue(new Error('Database error'));

        await expect(
          service.upload(mockDebtorProfileId, mockFile, uploadDto),
        ).rejects.toThrow('Database error');

        expect(mockDeleteFile.delete).toHaveBeenCalled();
      });
    });

    describe('update with metadata management', () => {
      it('should update document metadata', async () => {
        const updateDto = {
          description: 'Updated description',
          tags: ['updated'],
        };

        const updatedDocument = { ...mockDocument, ...updateDto };

        documentRepository.findOne.mockResolvedValue(mockDocument);
        documentRepository.save.mockResolvedValue(updatedDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.update(mockDocumentId, mockDebtorProfileId, updateDto);

        expect(result.description).toBe('Updated description');
        expect(documentRepository.save).toHaveBeenCalled();
      });

      it('should verify organization access before updating', async () => {
        const updateDto = { description: 'Updated' };

        documentRepository.findOne.mockResolvedValue(mockDocument);
        documentRepository.save.mockResolvedValue(mockDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.update(mockDocumentId, mockDebtorProfileId, updateDto);

        expect(documentRepository.findOne).toHaveBeenCalledWith({
          where: {
            id: mockDocumentId,
            debtorProfileId: mockDebtorProfileId,
            organizationId: mockOrgId,
          },
        });
      });

      it('should set verification fields when isVerified is true', async () => {
        const updateDto = { isVerified: true };

        const verifiedDocument = {
          ...mockDocument,
          isVerified: true,
          verifiedBy: mockUserId,
          verifiedAt: expect.any(Date),
        };

        documentRepository.findOne.mockResolvedValue(mockDocument);
        documentRepository.save.mockResolvedValue(verifiedDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.update(mockDocumentId, mockDebtorProfileId, updateDto);

        expect(result.isVerified).toBe(true);
        expect(result.verifiedBy).toBe(mockUserId);
        expect(result.verifiedAt).toBeDefined();
      });

      it('should publish DocumentUpdated event', async () => {
        const updateDto = { description: 'Updated' };

        documentRepository.findOne.mockResolvedValue(mockDocument);
        documentRepository.save.mockResolvedValue(mockDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.update(mockDocumentId, mockDebtorProfileId, updateDto);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_UPDATED,
          expect.objectContaining({
            documentId: mockDocumentId,
            debtorId: mockDebtorIdentityId,
            organizationId: mockOrgId,
            updatedBy: mockUserId,
            updatedFields: expect.any(Array),
          }),
          DocumentUpdatedDto,
        );
      });
    });

    describe('archive (soft delete)', () => {
      it('should archive document', async () => {
        const archivedDocument = {
          ...mockDocument,
          isArchived: true,
          archivedAt: new Date(),
        };

        documentRepository.findOne.mockResolvedValue(mockDocument);
        documentRepository.save.mockResolvedValue(archivedDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        const result = await service.archive(mockDocumentId, mockDebtorProfileId);

        expect(result.isArchived).toBe(true);
        expect(result.archivedAt).toBeDefined();
      });

      it('should publish DocumentArchived event', async () => {
        const archivedDocument = {
          ...mockDocument,
          isArchived: true,
          archivedAt: new Date('2024-01-02'),
        };

        documentRepository.findOne.mockResolvedValue(mockDocument);
        documentRepository.save.mockResolvedValue(archivedDocument);
        profilesService.findOne.mockResolvedValue({ id: mockDebtorProfileId, debtorIdentityId: mockDebtorIdentityId } as any);
        eventPublisher.publish.mockResolvedValue('');

        await service.archive(mockDocumentId, mockDebtorProfileId);

        expect(eventPublisher.publish).toHaveBeenCalledWith(
          EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_ARCHIVED,
          expect.objectContaining({
            documentId: mockDocumentId,
            debtorId: mockDebtorIdentityId,
            organizationId: mockOrgId,
            archivedBy: mockUserId,
          }),
          DocumentArchivedDto,
        );
      });
    });

    describe('generateSignedUrl for secure downloads', () => {
      it('should generate signed URL for document download', async () => {
        const mockFile = {
          getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url']),
        };

        mockBucket.file.mockReturnValue(mockFile);
        documentRepository.findOne.mockResolvedValue(mockDocument);

        const result = await service.generateSignedUrl(mockDocumentId, mockDebtorProfileId, 60);

        expect(result).toBe('https://storage.googleapis.com/signed-url');
        expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
          version: 'v4',
          action: 'read',
          expires: expect.any(Number),
        });
      });

      it('should verify organization access before generating URL', async () => {
        const mockFile = {
          getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url']),
        };

        mockBucket.file.mockReturnValue(mockFile);
        documentRepository.findOne.mockResolvedValue(mockDocument);

        await service.generateSignedUrl(mockDocumentId, mockDebtorProfileId);

        expect(documentRepository.findOne).toHaveBeenCalledWith({
          where: {
            id: mockDocumentId,
            debtorProfileId: mockDebtorProfileId,
            organizationId: mockOrgId,
          },
        });
      });
    });

    describe('getStorageUsage', () => {
      it('should calculate total storage used by debtor', async () => {
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '5120000' }),
        };

        documentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.getStorageUsage(mockDebtorProfileId);

        expect(result).toBe(5120000);
        expect(mockQueryBuilder.where).toHaveBeenCalledWith(
          'document.debtorProfileId = :debtorId',
          { debtorId: mockDebtorProfileId },
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'document.organizationId = :organizationId',
          { organizationId: mockOrgId },
        );
      });

      it('should exclude archived documents from storage calculation', async () => {
        const mockQueryBuilder = {
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: null }),
        };

        documentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

        const result = await service.getStorageUsage(mockDebtorProfileId);

        expect(result).toBe(0);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'document.isArchived = :isArchived',
          { isArchived: false },
        );
      });
    });
  });
});
