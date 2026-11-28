import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportJob } from '../entities/import-job.entity';
import { CreateImportDto } from '../dto/create-import.dto';
import { QueryImportsDto } from '../dto/import-job-response.dto';
import {
  ImportJobResponseDto,
  PaginatedImportJobResponseDto,
} from '../dto/import-job-response.dto';
import { ImportJobNotFoundException } from '../errors';
import { ImportJobStatus } from '@verichron/enums';
import { ImportsProcessor } from './imports.processor';
import { RequestContext } from '../../core';
import * as fs from 'fs/promises';
import * as path from 'path';

import { v4 as uuidv4 } from 'uuid';
import { FileInspectionResponseDto } from '../dto/inspect-import.dto';

/**
 * Service responsible for import job orchestration and lifecycle management.
 *
 * Core Responsibilities:
 * - Accept file uploads and create import job records
 * - Store files in local filesystem (or GCS in production)
 * - Trigger async processing via processor service
 * - Query import job status and history
 * - Manage import job lifecycle
 *
 * Design Pattern:
 * - This service handles HTTP requests and job management
 * - ImportsProcessor handles the actual CSV processing logic
 * - Clean separation of concerns for testability
 *
 * MVP Implementation:
 * - Synchronous processing for simplicity
 * - Local filesystem storage
 * - Can be made async with Bull queue later
 */
@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');
  private readonly tempDir = path.join(process.cwd(), 'uploads', 'temp');

  constructor(
    @InjectRepository(ImportJob)
    private readonly importJobRepository: Repository<ImportJob>,
    private readonly importsProcessor: ImportsProcessor,
    private readonly requestContext: RequestContext,
  ) {
    // Ensure uploads directory exists
    this.ensureUploadsDirectory();
  }

  /**
   * Inspect a file and return headers and preview rows.
   */
  async inspectFile(
    file: Express.Multer.File,
  ): Promise<FileInspectionResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    this.logger.log(`Inspecting file for organization ${organizationId}`, {
      fileName: file.originalname,
      fileSize: file.size,
    });

    const inspection = await this.importsProcessor.inspectFile(file.buffer, file.originalname);

    // Save to temp location for later full processing
    const tempFileId = uuidv4();
    await this.saveTempFile(organizationId, tempFileId, file);

    return {
      tempFileId,
      headers: inspection.headers,
      previewRows: inspection.previewRows,
    };
  }

  /**
   * Create a new import job and begin processing.
   *
   * Flow:
   * 1. Save uploaded file to filesystem
   * 2. Create ImportJob record with PENDING status
   * 3. Trigger processing (sync for MVP, can be async via queue)
   * 4. Return job details immediately (processing continues in background)
   *
   * @param createImportDto - Import metadata
   * @param file - Uploaded CSV file (from Multer)
   * @returns Created import job
   */
  async create(
    createImportDto: CreateImportDto,
    file?: Express.Multer.File,
  ): Promise<ImportJobResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Creating import job for organization ${organizationId}`, {
      portfolioName: createImportDto.portfolioName,
      fileName: file?.originalname || createImportDto.tempFileId,
      tempFileId: createImportDto.tempFileId,
    });

    // Create import job record
    const importJob = this.importJobRepository.create({
      organizationId,
      portfolioName: createImportDto.portfolioName,
      fileLocation: '', // Will be set after file is finalized
      status: ImportJobStatus.PENDING,
      totalRows: null,
      processedRows: 0,
      errorMessage: null,
      portfolioId: null,
    });

    const savedJob = await this.importJobRepository.save(importJob);

    let fileLocation: string;

    if (createImportDto.tempFileId) {
      // Use existing temp file
      const tempPath = path.join(this.tempDir, organizationId, `${createImportDto.tempFileId}.csv`);
      
      try {
        await fs.access(tempPath);
      } catch (err) {
        throw new Error(`Temporary file not found: ${createImportDto.tempFileId}`);
      }

      // Move to permanent location
      const finalDir = path.join(this.uploadsDir, organizationId);
      await fs.mkdir(finalDir, { recursive: true });
      fileLocation = path.join(finalDir, `${savedJob.id}.csv`);
      await fs.rename(tempPath, fileLocation);
    } else if (file) {
      // Save new uploaded file
      fileLocation = await this.saveFile(organizationId, savedJob.id, file);
    } else {
      throw new Error('Either a file or a tempFileId must be provided');
    }

    // Update job with file location
    savedJob.fileLocation = fileLocation;
    await this.importJobRepository.save(savedJob);

    this.logger.log(`Import job created successfully`, {
      importJobId: savedJob.id,
      organizationId,
      fileLocation,
    });

    // Trigger processing (synchronous for MVP)
    this.processImportAsync(savedJob.id, organizationId, userId, createImportDto);

    return ImportJobResponseDto.fromEntity(savedJob);
  }

  /**
   * Get all import jobs for an organization with filters.
   *
   * @param query - Query filters and pagination
   * @returns Paginated list of import jobs
   */
  async findAll(
    query: QueryImportsDto,
  ): Promise<PaginatedImportJobResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    this.logger.log(`Querying import jobs for organization ${organizationId}`, {
      filters: query,
    });

    const queryBuilder = this.importJobRepository
      .createQueryBuilder('import_job')
      .where('import_job.organization_id = :organizationId', { organizationId });

    // Apply filters
    if (query.status) {
      queryBuilder.andWhere('import_job.status = :status', { status: query.status });
    }

    // Apply sorting
    const order = query.order === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy('import_job.created_at', order);

    // Apply pagination
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    queryBuilder.skip(skip).take(pageSize);

    // Execute query with count
    const [jobs, total] = await queryBuilder.getManyAndCount();

    this.logger.log(`Found ${total} import jobs (page ${page})`, {
      organizationId,
      total,
      page,
      pageSize,
    });

    return {
      data: jobs.map((job) => ImportJobResponseDto.fromEntity(job)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single import job by ID.
   *
   * @param id - Import job ID
   * @returns Import job details
   * @throws ImportJobNotFoundException if not found
   */
  async findOne(id: string): Promise<ImportJobResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    this.logger.log(`Fetching import job ${id}`, { organizationId });

    const importJob = await this.importJobRepository.findOne({
      where: { id, organizationId },
    });

    if (!importJob) {
      throw new ImportJobNotFoundException(id);
    }

    return ImportJobResponseDto.fromEntity(importJob);
  }

  /**
   * Trigger async processing of an import job.
   *
   * For MVP: Runs synchronously but in a separate async context (fire-and-forget)
   * For Production: Add to Bull queue for proper async processing
   *
   * @param importJobId - Import job ID to process
   * @param organizationId - Organization ID
   * @param userId - User ID for audit
   * @param createImportDto - Import metadata
   */
  private async processImportAsync(
    importJobId: string,
    organizationId: string,
    userId: string,
    createImportDto: CreateImportDto,
  ): Promise<void> {
    try {
      await this.importsProcessor.processImport(
        importJobId,
        organizationId,
        userId,
        createImportDto,
      );
    } catch (error) {
      this.logger.error('Import processing failed', {
        importJobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Error is already handled in processor, just log here
    }
  }

  /**
   * Save uploaded file to filesystem.
   *
   * File path structure: /uploads/{organizationId}/{importJobId}.csv
   *
   * @param organizationId - Organization ID
   * @param importJobId - Import job ID
   * @param file - Uploaded file
   * @returns File path
   */
  private async saveFile(
    organizationId: string,
    importJobId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const orgDir = path.join(this.uploadsDir, organizationId);

    // Ensure organization directory exists
    await fs.mkdir(orgDir, { recursive: true });

    // Save file with import job ID as filename
    const filePath = path.join(orgDir, `${importJobId}.csv`);
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`File saved successfully`, {
      organizationId,
      importJobId,
      filePath,
      fileSize: file.size,
    });

    return filePath;
  }

  /**
   * Save temporary file for inspection.
   */
  private async saveTempFile(
    organizationId: string,
    tempFileId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const orgTempDir = path.join(this.tempDir, organizationId);
    await fs.mkdir(orgTempDir, { recursive: true });

    const filePath = path.join(orgTempDir, `${tempFileId}.csv`);
    await fs.writeFile(filePath, file.buffer);

    return filePath;
  }

  /**
   * Ensure uploads directory exists on startup.
   */
  private async ensureUploadsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
      this.logger.log(`Uploads directories ready: ${this.uploadsDir}, ${this.tempDir}`);
    } catch (error) {
      this.logger.error('Failed to create uploads directory', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
