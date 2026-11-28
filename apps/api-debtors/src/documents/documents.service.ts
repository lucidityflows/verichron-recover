import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import { Storage, Bucket } from '@google-cloud/storage';

// Type definition for uploaded file (matches Multer.File interface)
interface UploadedFileType {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

import { Document } from './entities/document.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { ProfilesService } from '../profiles/profiles.service';
import {
  DocumentNotFoundException,
  InvalidDocumentTypeException,
  DocumentUploadFailedException,
  DocumentTooLargeException,
} from './errors';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '../core/services/request-context.service';
import { EventPublisher } from '@verichron/event-publisher'; // Added import
import { EVENT_TYPES } from '@verichron/events'; // Added import
import {
  DocumentUploadedDto,
  DocumentUpdatedDto,
  DocumentArchivedDto,
} from '../events/event-dto'; // Added import

/**
 * Documents Service
 * 
 * Manages debtor-specific documents with Google Cloud Storage integration.
 * 
 * Key features:
 * - File upload to GCS with unique naming
 * - Signed URL generation for secure downloads
 * - Document metadata management
 * - Access control verification
 * - File type and size validation
 * 
 * GCS Structure:
 * gs://{bucket}/{organizationId}/{debtorId}/{documentId}-{filename}
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly bucket: any; // Bucket from @google-cloud/storage
  private readonly storage: any; // Add this line

  private readonly bucketName: string;
  private readonly maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes: string[] = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly profilesService: ProfilesService,
    private readonly requestContext: RequestContext,
    private readonly eventPublisher: EventPublisher, // Added EventPublisher
  ) {
    // Initialize GCS client
    this.bucketName =
      process.env.DEBTORS_DOCUMENTS_BUCKET || 'verichron-debtors-documents';

    // TODO: Install @google-cloud/storage package
    // this.storage = new Storage({
    //   projectId: process.env.GCP_PROJECT_ID,
    // });
    // this.bucket = this.storage.bucket(this.bucketName);

    // Temporary placeholder until @google-cloud/storage is installed
    this.storage = null;
    this.bucket = null;

    this.logger.log(`Initialized with GCS bucket: ${this.bucketName}`);
  }  /**
   * Find all documents for a debtor with filtering and pagination
   */
  async findAll(
    debtorId: string,
    query: QueryDocumentsDto,
  ): Promise<{ data: Document[]; total: number; page: number; pageSize: number }> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const {
      documentType,
      isVerified,
      includeArchived = false,
      uploadedAfter,
      uploadedBefore,
      expiresAfter,
      expiresBefore,
      sortBy = 'createdAt',
      sortDirection = 'DESC',
      page = 1,
      pageSize = 20,
    } = query;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .where('document.debtorProfileId = :debtorId', { debtorId })
      .andWhere('document.organizationId = :organizationId', {
        organizationId,
      });

    // Filter by archived status
    if (!includeArchived) {
      queryBuilder.andWhere('document.isArchived = :isArchived', {
        isArchived: false,
      });
    }

    // Apply filters
    if (documentType) {
      queryBuilder.andWhere('document.documentType = :documentType', {
        documentType,
      });
    }

    if (typeof isVerified === 'boolean') {
      queryBuilder.andWhere('document.isVerified = :isVerified', {
        isVerified,
      });
    }

    if (uploadedAfter) {
      queryBuilder.andWhere('document.createdAt >= :uploadedAfter', {
        uploadedAfter: new Date(uploadedAfter),
      });
    }

    if (uploadedBefore) {
      queryBuilder.andWhere('document.createdAt <= :uploadedBefore', {
        uploadedBefore: new Date(uploadedBefore),
      });
    }

    if (expiresAfter) {
      queryBuilder.andWhere('document.expiresAt >= :expiresAfter', {
        expiresAfter: new Date(expiresAfter),
      });
    }

    if (expiresBefore) {
      queryBuilder.andWhere('document.expiresAt <= :expiresBefore', {
        expiresBefore: new Date(expiresBefore),
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`document.${sortBy}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    this.logger.log(
      `Found ${data.length} of ${total} documents for debtor ${debtorId}`,
    );

    return { data, total, page, pageSize };
  }

  /**
   * Find one document by ID
   */
  async findOne(
    documentId: string,
    debtorId: string,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, debtorProfileId: debtorId, organizationId },
    });

    if (!document) {
      throw new DocumentNotFoundException(documentId);
    }

    return document;
  }

  /**
   * Upload a document to GCS and create metadata record
   *
   * @param debtorId - Debtor UUID
   * @param file - Uploaded file from multer
   * @param uploadDto - Document metadata
   * @returns Created document record
   */
  async upload(
    debtorId: string,
    file: UploadedFileType,
    uploadDto: UploadDocumentDto,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new InvalidDocumentTypeException(
        file.mimetype,
        this.allowedMimeTypes,
      );
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new DocumentTooLargeException(file.size, this.maxFileSize);
    }

    // Generate unique document ID and filename
    const documentId = uuidv4();
    const fileExtension = file.originalname.split('.').pop();
    const storedFilename = `${documentId}-${file.originalname}`;
    const storagePath = `${organizationId}/${debtorId}/${storedFilename}`;

    try {
      // Upload file to GCS
      const blob = this.bucket.file(storagePath);
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.mimetype,
          metadata: {
            debtorProfileId: debtorId,
            organizationId,
            uploadedBy: userId,
            documentType: uploadDto.documentType,
          },
        },
      });

      await new Promise((resolve, reject) => {
        blobStream.on('error', (error: Error) => {
          this.logger.error(`GCS upload error: ${error.message}`, error.stack);
          reject(
            new DocumentUploadFailedException(file.originalname, error.message),
          );
        });

        blobStream.on('finish', resolve);

        blobStream.end(file.buffer);
      });

      this.logger.log(`File uploaded to GCS: ${storagePath}`);

      // Create document metadata record
      const document = this.documentRepository.create({
        debtorProfileId: debtorId,
        organizationId,
        documentType: uploadDto.documentType,
        originalFilename: file.originalname,
        storedFilename,
        storagePath,
        bucketName: this.bucketName,
        mimeType: file.mimetype,
        fileSize: file.size,
        description: uploadDto.description,
        metadata: uploadDto.metadata,
        tags: uploadDto.tags,
        expiresAt: uploadDto.expiresAt ? new Date(uploadDto.expiresAt) : undefined,
        uploadedBy: userId,
        isVerified: false,
        isArchived: false,
      });
      document.id = documentId;

      const saved = await this.documentRepository.save(document);

      this.logger.log(
        `Document metadata created for document ${documentId} by user ${userId}`,
      );

      // Fetch the profile to get debtorIdentityId for the event
      const profile = await this.profilesService.findOne(debtorId);

      // Publish DocumentUploaded event
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_UPLOADED,
        {
          documentId: saved.id,
          debtorId: profile.debtorIdentityId,
          organizationId: saved.organizationId,
          uploadedBy: saved.uploadedBy,
          uploadedAt: saved.createdAt.toISOString(),
          documentType: saved.documentType,
          filename: saved.originalFilename,
          fileSize: saved.fileSize,
          mimeType: saved.mimeType,
        },
        DocumentUploadedDto,
      );

      this.logger.log(`Published DocumentUploaded event for ${saved.id}`);

      return saved;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to upload document: ${errorMessage}`,
        errorStack,
      );

      // Attempt to clean up partial upload from GCS
      try {
        await this.bucket.file(storagePath).delete();
      } catch (cleanupError) {
        const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown error';
        this.logger.warn(
          `Failed to clean up partial upload: ${cleanupMessage}`,
        );
      }

      throw error;
    }
  }

  /**
   * Update document metadata
   * 
   * Note: This does NOT update the file itself. To replace a file, delete and re-upload.
   */
  async update(
    documentId: string,
    debtorId: string,
    updateDto: UpdateDocumentDto,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, debtorProfileId: debtorId, organizationId },
    });

    if (!document) {
      throw new DocumentNotFoundException(documentId);
    }

    // Update fields
    if (updateDto.description !== undefined) {
      document.description = updateDto.description;
    }
    if (updateDto.tags !== undefined) {
      document.tags = updateDto.tags;
    }
    if (updateDto.metadata !== undefined) {
      document.metadata = updateDto.metadata;
    }
    if (updateDto.expiresAt !== undefined) {
      document.expiresAt = updateDto.expiresAt
        ? new Date(updateDto.expiresAt)
        : undefined;
    }
    if (updateDto.isVerified !== undefined && updateDto.isVerified === true) {
      document.isVerified = true;
      document.verifiedBy = userId;
      document.verifiedAt = new Date();
    }

    const updated = await this.documentRepository.save(document);

    this.logger.log(`Document ${documentId} metadata updated`);

    // Fetch the profile to get debtorIdentityId for the event
    const profile = await this.profilesService.findOne(debtorId);

    // Publish DocumentUpdated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_UPDATED,
      {
        documentId: updated.id,
        debtorId: profile.debtorIdentityId,
        organizationId: updated.organizationId,
        updatedBy: userId,
        updatedAt: updated.updatedAt.toISOString(),
        updatedFields: Object.keys(updateDto),
      },
      DocumentUpdatedDto,
    );

    this.logger.log(`Published DocumentUpdated event for ${updated.id}`);

    return updated;
  }

  /**
   * Soft delete document (archives metadata)
   *
   * This method now calls the archive method to perform a soft delete,
   * ensuring data retention for compliance. The GCS file is NOT deleted.
   */
  async remove(
    documentId: string,
    debtorId: string,
  ): Promise<void> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }
    // Call the archive method to perform a soft delete
    await this.archive(documentId, debtorId); // organizationId is now handled internally by archive
    this.logger.log(`Document ${documentId} soft deleted (archived)`);
    // TODO: Publish DocumentDeleted event (if needed, or rely on DocumentUpdated from archive)
  }

  /**
   * Archive document (soft delete)
   */
  async archive(
    documentId: string,
    debtorId: string,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, debtorProfileId: debtorId, organizationId },
    });

    if (!document) {
      throw new DocumentNotFoundException(documentId);
    }

    document.isArchived = true;
    document.archivedAt = new Date();

    const updated = await this.documentRepository.save(document);

    this.logger.log(`Document ${documentId} archived`);

    // Fetch the profile to get debtorIdentityId for the event
    const profile = await this.profilesService.findOne(debtorId);

    // Publish DocumentArchived event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_ARCHIVED,
      {
        documentId: updated.id,
        debtorId: profile.debtorIdentityId,
        organizationId: updated.organizationId,
        archivedAt: updated.archivedAt?.toISOString() || new Date().toISOString(),
        archivedBy: userId,
      },
      DocumentArchivedDto,
    );

    this.logger.log(`Published DocumentArchived event for ${updated.id}`);

    return updated;
  }

  /**
   * Generate a signed URL for downloading a document
   * 
   * The URL is valid for 1 hour by default.
   */
  async generateSignedUrl(
    documentId: string,
    debtorId: string,
    expirationMinutes = 60,
  ): Promise<string> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId, debtorProfileId: debtorId, organizationId },
    });

    if (!document) {
      throw new DocumentNotFoundException(documentId);
    }

    try {
      const file = this.bucket.file(document.storagePath);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });

      this.logger.log(
        `Generated signed URL for document ${documentId} (expires in ${expirationMinutes} minutes)`,
      );

      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to generate signed URL: ${errorMessage}`,
        errorStack,
      );
      throw new DocumentUploadFailedException(
        document.originalFilename,
        'Failed to generate download URL',
      );
    }
  }

  /**
   * Get total storage used by a debtor (in bytes)
   */
  async getStorageUsage(
    debtorId: string,
  ): Promise<number> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const result = await this.documentRepository
      .createQueryBuilder('document')
      .select('SUM(document.fileSize)', 'total')
      .where('document.debtorProfileId = :debtorId', { debtorId })
      .andWhere('document.organizationId = :organizationId', {
        organizationId,
      })
      .andWhere('document.isArchived = :isArchived', { isArchived: false })
      .getRawOne();

    return parseInt(result.total) || 0;
  }
}