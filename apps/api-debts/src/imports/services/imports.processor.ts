import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ImportJob } from '../entities/import-job.entity';
import { Debt } from '../../debts/entities/debt.entity';
import { DebtDebtor } from '../../debts/entities/debt-debtor.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import { DebtOwnershipHistory } from '../../history/entities/debt-ownership-history.entity';
import { CreateImportDto, CsvRow, RowValidationResult } from '../dto/create-import.dto';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES, type DebtorData } from '@verichron/events';
import { PortfolioStatus, DebtStatus, ImportJobStatus } from '@verichron/enums';
import type { IImportParser, IPortfolioImportData } from '@verichron/contracts';
import { EventPublisher } from '@verichron/event-publisher';
import { PortfolioDebtorBatchReadyDto, DebtorDataDto } from '../../events/event-dto/portfolios/portfolio-debtor-batch-ready.dto';
import { DebtorInformationReceivedDto } from '../../events/event-dto/debtors/debtor-information-received.dto';
import { PortfolioImportCompletedDto } from '../../events/event-dto/portfolios/portfolio-import-completed.dto';
import { CreditorResolutionService } from '../../creditors/creditor-resolution.service';
import {
  InvalidImportFileException,
  ImportValidationFailedException,
  ImportProcessingFailedException,
} from '../errors';
import { OwnershipHistorySourceHelper } from '../../history/dto/create-ownership-history.dto';
import { addCurrency } from '../../core';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service responsible for processing import jobs.
 *
 * Core Responsibilities:
 * - Parse and validate files using IImportParser abstraction (CSV, PDF, AI, etc.)
 * - Create portfolio with PROVISIONING status
 * - Create debts in transaction
 * - Create debt-debtor associations
 * - Create initial ownership history records
 * - Publish debtor events
 * - Update portfolio to ACTIVE on success
 * - Rollback on failure (all-or-nothing)
 *
 * Design Pattern:
 * - Parser abstraction allows swappable parsing strategies (CSV, Document AI, etc.)
 * - All database operations in single transaction
 * - Fail-fast validation before any database writes
 * - Detailed error messages for user feedback
 * - Idempotent (can retry failed imports)
 */
@Injectable()
export class ImportsProcessor {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(
    @InjectRepository(ImportJob)
    private readonly importJobRepository: Repository<ImportJob>,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    private readonly dataSource: DataSource,
    @Inject('IMPORT_PARSER')
    private readonly parser: IImportParser,
    private readonly eventPublisher: EventPublisher,
    private readonly creditorResolutionService: CreditorResolutionService,
  ) {}

  /**
   * Main processing method - orchestrates the entire import workflow.
   *
   * Steps:
   * 1. Load import job
   * 2. Parse file using IImportParser (CSV, PDF, AI, etc.)
   * 3. Validate all debts
   * 4. Start transaction
   * 5. Create portfolio
   * 6. Create debts
   * 7. Create debt-debtor associations
   * 8. Create ownership history
   * 9. Update portfolio to ACTIVE
   * 10. Commit transaction
   * 11. Publish debtor events
   * 12. Update job to COMPLETED
   *
   * On any failure: Rollback transaction, update job to FAILED with error
   *
   * @param importJobId - Import job ID
   * @param organizationId - Organization ID
   * @param userId - User ID for audit
   * @param createImportDto - Import metadata
   */
  async processImport(
    importJobId: string,
    organizationId: string,
    userId: string,
    createImportDto: CreateImportDto,
  ): Promise<void> {
    this.logger.log(`Starting import processing for job ${importJobId}`);

    try {
      // 1. Load import job
      const importJob = await this.importJobRepository.findOne({
        where: { id: importJobId },
      });

      if (!importJob) {
        throw new Error(`Import job ${importJobId} not found`);
      }

      // 2. Update status to VALIDATING
      await this.updateJobStatus(importJob, ImportJobStatus.VALIDATING);

      // 3. Parse file using parser abstraction
      const rows = await this.parseFile(importJob.fileLocation, createImportDto.columnMapping);

      // Update total rows
      importJob.totalRows = rows.length;
      await this.importJobRepository.save(importJob);

      // 4. Validate all rows
      const validation = this.validateRows(rows, organizationId);
      if (!validation.isValid) {
        throw new ImportValidationFailedException(validation.errors);
      }

      // 5. Update status to PROCESSING
      await this.updateJobStatus(importJob, ImportJobStatus.PROCESSING);

      // 6. Process in transaction
      const result = await this.processInTransaction(
        importJob,
        organizationId,
        createImportDto,
        rows,
      );

      // 7. Publish debtor events (outside transaction)
      await this.publishDebtorEvents(
        result.debtors,
        organizationId,
        result.portfolioId,
        importJob.id,
      );

      // 8. Update job to COMPLETED
      importJob.status = ImportJobStatus.COMPLETED;
      importJob.processedRows = rows.length;
      importJob.portfolioId = result.portfolioId;
      await this.importJobRepository.save(importJob);

      // 9. Publish import completed event
      await this.publishImportCompletedEvent(
        result.portfolioId,
        organizationId,
        userId,
        createImportDto,
        rows.length,
        importJob.fileLocation,
      );

      this.logger.log(`Import processing completed successfully`, {
        importJobId,
        portfolioId: result.portfolioId,
        debtsCreated: rows.length,
      });
    } catch (error) {
      this.logger.error(`Import processing failed`, {
        importJobId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'Unknown stack',
      });

      // Update job to FAILED
      const failedImportJob = await this.importJobRepository.findOne({ where: { id: importJobId } });
      if (failedImportJob) {
        await this.updateJobStatus(
          failedImportJob,
          ImportJobStatus.FAILED,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }

      throw error;
    }
  }

  /**
   * Parse file using configured parser (CSV, Document AI, etc.).
   *
   * This method:
   * 1. Reads file as Buffer
   * 2. Calls parser.parse() to get normalized IPortfolioImportData
   * 3. Converts debts to CsvRow[] format for compatibility with existing validation/processing
   *
   * @param filePath - Path to file
   * @returns Array of parsed rows in CsvRow format
   * @throws InvalidImportFileException if file cannot be parsed
   */
  private async parseFile(filePath: string, columnMapping?: Record<string, string>): Promise<CsvRow[]> {
    this.logger.log(`Parsing file: ${filePath} using ${this.parser.name}`);

    try {
      // 1. Read file as Buffer
      const fileContent = await fs.readFile(filePath);
      const filename = filePath.split('/').pop() || 'unknown';

      // 2. Call parser
      const portfolioData: IPortfolioImportData = await this.parser.parse(
        fileContent,
        filename,
        { columnMapping }
      );

      // 3. Convert IDebtImportData[] to CsvRow[]
      const rows: CsvRow[] = portfolioData.debts.map((debt, index) => ({
        accountNumber: debt.accountNumber,
        principalAmount: debt.principalAmount,
        originalCreditorName: debt.originalCreditorName,
        originalDebtDate: debt.originalDebtDate,
        interestAmount: debt.interestAmount,
        feesAmount: debt.feesAmount,
        debtorFirstName: debt.debtorFirstName,
        debtorLastName: debt.debtorLastName,
        debtorEmail: debt.debtorEmail,
        debtorPhone: debt.debtorPhone,
        debtorAddressLine1: debt.debtorAddressLine1,
        debtorAddressLine2: debt.debtorAddressLine2,
        debtorCity: debt.debtorCity,
        debtorState: debt.debtorState,
        debtorZipCode: debt.debtorZipCode,
        _rowNumber: index + 1, // 1-indexed for error reporting
      }));

      this.logger.log(`File parsed successfully`, {
        parser: this.parser.name,
        debtsFound: rows.length,
      });

      return rows;
    } catch (error) {
      this.logger.error(`File parsing failed`, {
        filePath,
        parser: this.parser.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-throw if already InvalidImportFileException
      if (error instanceof InvalidImportFileException) {
        throw error;
      }

      throw new InvalidImportFileException(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate all rows before processing.
   *
   * Validation rules:
   * - Required fields present and non-empty
   * - principalAmount > 0
   * - originalDebtDate is valid date and not in future
   * - accountNumber unique within file
   * - accountNumber doesn't already exist in database for this org
   * - If debtor info provided, firstName and lastName required
   *
   * @param rows - CSV rows
   * @param organizationId - Organization ID
   * @returns Validation result with all errors
   */
  private validateRows(
    rows: CsvRow[],
    organizationId: string,
  ): { isValid: boolean; errors: string[] } {
    this.logger.log(`Validating ${rows.length} rows`);

    const errors: string[] = [];
    const accountNumbers = new Set<string>();

    for (const row of rows) {
      const rowErrors: string[] = [];

      // Required fields
      if (!row.accountNumber) {
        rowErrors.push('accountNumber is required');
      }
      if (!row.principalAmount && row.principalAmount !== 0) {
        rowErrors.push('principalAmount is required');
      }
      if (!row.originalCreditorName) {
        rowErrors.push('originalCreditorName is required');
      }
      if (!row.originalDebtDate) {
        rowErrors.push('originalDebtDate is required');
      }

      // principalAmount validation
      if (row.principalAmount !== undefined && row.principalAmount <= 0) {
        rowErrors.push('principalAmount must be greater than 0');
      }

      // Date validation
      if (row.originalDebtDate) {
        const debtDate = new Date(row.originalDebtDate);
        if (isNaN(debtDate.getTime())) {
          rowErrors.push('originalDebtDate must be a valid date (YYYY-MM-DD)');
        } else if (debtDate > new Date()) {
          rowErrors.push('originalDebtDate cannot be in the future');
        }
      }

      // Duplicate accountNumber within file
      if (row.accountNumber) {
        if (accountNumbers.has(row.accountNumber)) {
          rowErrors.push(
            `Duplicate accountNumber '${row.accountNumber}' found in file`,
          );
        }
        accountNumbers.add(row.accountNumber);
      }

      // Debtor validation
      if (this.hasDebtorInfo(row)) {
        if (!row.debtorFirstName || !row.debtorLastName) {
          rowErrors.push(
            'If debtor information is provided, firstName and lastName are required',
          );
        }
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${row._rowNumber}: ${rowErrors.join(', ')}`);
      }
    }

    // TODO: Check for existing accountNumbers in database
    // This would require an async query, so might need to refactor this method

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Process import in a single database transaction.
   *
   * All-or-nothing: If any step fails, entire transaction is rolled back.
   *
   * @param importJob - Import job record
   * @param organizationId - Organization ID
   * @param createImportDto - Import metadata
   * @param rows - Validated CSV rows
   * @returns Result with portfolioId and debtor data
   */
  private async processInTransaction(
    importJob: ImportJob,
    organizationId: string,
    createImportDto: CreateImportDto,
    rows: CsvRow[],
  ): Promise<{ portfolioId: string; debtors: Map<string, any> }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Calculate total principal using safe arithmetic
      const principalAmounts = rows.map((row) => row.principalAmount || 0);
      const totalPrincipal = addCurrency(...principalAmounts);

      // 2. Create portfolio (PROVISIONING status)
      const portfolio = this.portfolioRepository.create({
        organizationId,
        name: createImportDto.portfolioName,
        status: PortfolioStatus.PROVISIONING,
        purchaseDate: new Date(createImportDto.purchaseDate),
        purchasePrice: createImportDto.purchasePrice.toFixed(2),
        totalPrincipal,
        source: createImportDto.source,
      });

      const savedPortfolio = await queryRunner.manager.save(Portfolio, portfolio);

      // 3. Process debtors and generate UUIDs
      const debtorMap = this.processDebtors(rows);

      // 4. Create debts
      const debts: Debt[] = [];
      for (const row of rows) {
        // Step 4a: Resolve Creditor (AI-Enhanced)
        const creditor = await this.creditorResolutionService.findOrCreate(
          organizationId,
          row.originalCreditorName,
          undefined, // EIN not yet parsed from basic CSV
          {
            street1: row.debtorAddressLine1, // Placeholder: basic CSV might not have creditor address
            city: row.debtorCity,
            state: row.debtorState,
          },
          importJob.id,
        );

        // Calculate current balance using safe arithmetic
        const currentBalance = addCurrency(
          row.principalAmount || 0,
          row.interestAmount || 0,
          row.feesAmount || 0,
        );

        const debt = this.debtRepository.create({
          organizationId,
          portfolioId: savedPortfolio.id,
          originalCreditorName: row.originalCreditorName,
          creditorId: creditor.id, // Linked to resolved entity
          accountNumber: row.accountNumber,
          principalAmount: row.principalAmount.toFixed(2),
          interestAmount: (row.interestAmount || 0).toFixed(2),
          feesAmount: (row.feesAmount || 0).toFixed(2),
          currentBalance,
          status: DebtStatus.IMPORTED,
          originalDebtDate: new Date(row.originalDebtDate),
          lastPaymentDate: null,
          notes: null,
        });

        debts.push(debt);
      }

      const savedDebts = await queryRunner.manager.save(Debt, debts);

      // 5. Update debtor map with real debt IDs
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const debt = savedDebts[i];
        const debtorKey = row._debtorKey;

        if (debtorKey && debtorMap.has(debtorKey)) {
          debtorMap.get(debtorKey).debtIds.push(debt.id);
        }
      }

      // 6. Create ownership history records
      const historyRecords: DebtOwnershipHistory[] = savedDebts.map((debt, i) => {
        return queryRunner.manager.create(DebtOwnershipHistory, {
          debtId: debt.id,
          organizationId,
          acquiredDate: new Date(createImportDto.purchaseDate),
          soldDate: null,
          source: OwnershipHistorySourceHelper.initialImport(
            rows[i].originalCreditorName,
          ),
        });
      });

      await queryRunner.manager.save(DebtOwnershipHistory, historyRecords);

      // 7. Update portfolio to ACTIVE
      savedPortfolio.status = PortfolioStatus.ACTIVE;
      await queryRunner.manager.save(Portfolio, savedPortfolio);

      // Commit transaction
      await queryRunner.commitTransaction();

      this.logger.log(`Transaction committed successfully`, {
        portfolioId: savedPortfolio.id,
        debtsCreated: savedDebts.length,
        debtorsFound: debtorMap.size,
      });

      return {
        portfolioId: savedPortfolio.id,
        debtors: debtorMap,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction rolled back`, {
        importJobId: importJob.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ImportProcessingFailedException(error instanceof Error ? error.message : 'Unknown error', importJob.id);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process debtor information from rows and generate unique keys.
   *
   * Debtors are identified by email (if present) or name+address combination.
   *
   * @param rows - CSV rows
   * @returns Map of debtorKey to debtor data (with empty debtIds array)
   */
  private processDebtors(rows: CsvRow[]): Map<string, any> {
    const debtorMap = new Map<string, any>();

    for (const row of rows) {
      if (!this.hasDebtorInfo(row)) {
        continue;
      }

      // Generate unique key for debtor (same logic as api-debtors listener)
      const debtorKey = row.debtorEmail
        ? row.debtorEmail.toLowerCase().trim()
        : `${row.debtorFirstName}_${row.debtorLastName}_${row.debtorAddressLine1}_${row.debtorZipCode}`.toLowerCase().trim();

      row._debtorKey = debtorKey;

      if (!debtorMap.has(debtorKey)) {
        debtorMap.set(debtorKey, {
          debtorKey,
          firstName: row.debtorFirstName,
          lastName: row.debtorLastName,
          email: row.debtorEmail,
          phone: row.debtorPhone,
          addressLine1: row.debtorAddressLine1,
          addressLine2: row.debtorAddressLine2,
          city: row.debtorCity,
          state: row.debtorState,
          zipCode: row.debtorZipCode,
          debtIds: [], // To be populated with real Debt IDs after debt creation
        });
      }
    }

    return debtorMap;
  }

  /**
   * Check if row has debtor information.
   */
  private hasDebtorInfo(row: CsvRow): boolean {
    return !!(row.debtorFirstName || row.debtorLastName || row.debtorEmail);
  }

  /**
   * Publish debtor batch events for api-debtors to consume.
   *
   * Debtors are split into batches of ~100 to enable scalable, parallel processing.
   * Each batch is published as a separate DEBTS_PORTFOLIO_DEBTOR_BATCH_READY event.
   *
   * @param debtors - Map of debtorKey to debtor data
   * @param organizationId - Organization ID
   * @param portfolioId - Portfolio ID
   * @param importJobId - Import job ID
   */
  private async publishDebtorEvents(
    debtors: Map<string, any>,
    organizationId: string,
    portfolioId: string,
    importJobId: string,
  ): Promise<void> {
    const BATCH_SIZE = 100;
    const debtorArray = Array.from(debtors.values());
    const totalBatches = Math.ceil(debtorArray.length / BATCH_SIZE);

    this.logger.log(`Publishing debtor batches`, {
      totalDebtors: debtorArray.length,
      batchSize: BATCH_SIZE,
      totalBatches,
      organizationId,
      portfolioId,
      importJobId,
    });

    // Split into batches and publish each batch
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, debtorArray.length);
      const batchDebtors = debtorArray.slice(startIndex, endIndex);

      // Map to DebtorDataDto format
      const debtorData: DebtorDataDto[] = batchDebtors.map((debtor) => {
        const dto = new DebtorDataDto();
        dto.debtorId = debtor.debtorKey; // Using debtorKey as the handle for mapping back
        dto.debtIds = debtor.debtIds; // Now correctly sending the real Debt entity IDs
        dto.firstName = debtor.firstName;
        dto.lastName = debtor.lastName;
        dto.email = debtor.email;
        dto.phone = debtor.phone;
        dto.addressLine1 = debtor.addressLine1;
        dto.addressLine2 = debtor.addressLine2;
        dto.city = debtor.city;
        dto.state = debtor.state;
        dto.zipCode = debtor.zipCode;
        return dto;
      });

      // Create event DTO
      const eventDto = new PortfolioDebtorBatchReadyDto();
      eventDto.importJobId = importJobId;
      eventDto.portfolioId = portfolioId;
      eventDto.organizationId = organizationId;
      eventDto.batchNumber = i + 1;
      eventDto.totalBatches = totalBatches;
      eventDto.debtorCount = batchDebtors.length;
      eventDto.debtors = debtorData;
      eventDto.publishedAt = new Date().toISOString();

      // Publish batch event
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
        eventDto,
        PortfolioDebtorBatchReadyDto,
      );

      // Also publish individual DebtorInformationReceived events
      for (const debtor of batchDebtors) {
        const debtorInfoDto = new DebtorInformationReceivedDto();
        debtorInfoDto.sourceOrganizationId = organizationId;
        debtorInfoDto.importJobId = importJobId;
        debtorInfoDto.debtorData = {
          firstName: debtor.firstName,
          lastName: debtor.lastName,
          email: debtor.email,
          phone: debtor.phone,
          address: debtor.addressLine1 ? {
            streetLine1: debtor.addressLine1,
            streetLine2: debtor.addressLine2,
            city: debtor.city,
            state: debtor.state,
            postalCode: debtor.zipCode,
          } : undefined,
        };

        await this.eventPublisher.publish(
          EVENT_TYPES.DEBTORS_PROFILE_INFORMATION_RECEIVED,
          debtorInfoDto,
          DebtorInformationReceivedDto,
        );
      }

      this.logger.log(`Published debtor batch ${i + 1}/${totalBatches}`, {
        batchNumber: i + 1,
        debtorCount: batchDebtors.length,
        portfolioId,
      });
    }

    this.logger.log(`Successfully published all debtor batches`, {
      totalBatches,
      totalDebtors: debtorArray.length,
      portfolioId,
    });
  }

  /**
   * Publish import completed event after successful import.
   *
   * @param portfolioId - Portfolio ID
   * @param organizationId - Organization ID
   * @param userId - User who initiated import
   * @param createImportDto - Import metadata
   * @param debtsCreated - Number of debts created
   * @param fileName - Original file name
   */
  private async publishImportCompletedEvent(
    portfolioId: string,
    organizationId: string,
    userId: string,
    createImportDto: CreateImportDto,
    debtsCreated: number,
    fileName: string,
  ): Promise<void> {
    // Fetch the portfolio to get totalPrincipal
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      this.logger.error(`Portfolio ${portfolioId} not found for event publishing`);
      return;
    }

    const importCompletedDto = new PortfolioImportCompletedDto();
    importCompletedDto.portfolioId = portfolioId;
    importCompletedDto.organizationId = organizationId;
    importCompletedDto.portfolioName = createImportDto.portfolioName;
    importCompletedDto.debtsCreated = debtsCreated;
    importCompletedDto.totalPrincipal = portfolio.totalPrincipal;
    importCompletedDto.purchasePrice = portfolio.purchasePrice;
    importCompletedDto.source = createImportDto.source;
    importCompletedDto.parseMethod = 'csv'; // Currently only CSV is supported
    importCompletedDto.fileName = fileName.split('/').pop(); // Extract filename from path
    importCompletedDto.importedBy = userId;
    importCompletedDto.importedAt = new Date().toISOString();

    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_PORTFOLIO_IMPORT_COMPLETED,
      importCompletedDto,
      PortfolioImportCompletedDto,
    );

    this.logger.log(`Published DEBTS_PORTFOLIO_IMPORT_COMPLETED event`, {
      portfolioId,
      debtsCreated,
    });
  }

  /**
   * Update import job status.
   */
  private async updateJobStatus(
    importJob: ImportJob,
    status: ImportJobStatus,
    errorMessage?: string,
  ): Promise<void> {
    importJob.status = status;
    if (errorMessage) {
      importJob.errorMessage = errorMessage;
    }
    await this.importJobRepository.save(importJob);

    this.logger.log(`Import job status updated`, {
      importJobId: importJob.id,
      status,
      hasError: !!errorMessage,
    });
  }

  /**
   * Inspect a file and return headers and preview rows.
   */
  async inspectFile(
    fileContent: Buffer,
    filename: string,
  ): Promise<{ headers: string[]; previewRows: any[] }> {
    return this.parser.inspect(fileContent, filename);
  }
}
