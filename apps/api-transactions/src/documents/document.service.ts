import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { Document } from './entities/document.entity';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { DocumentType } from './enums/document-type.enum';
import {
  DocumentNotFoundException,
  DocumentGenerationFailedException,
  DocumentStorageException,
} from './errors/index';
import { PlansService } from '../payment-plans/payment-plan.service';
import { TransactionsService } from '../transactions/transaction.service';

/**
 * Documents Service
 *
 * Core business logic for document generation, storage, and retrieval.
 * Handles PDF generation and Google Cloud Storage integration.
 *
 * Key responsibilities:
 * - Generate payment-related PDFs (agreements, receipts, invoices)
 * - Upload documents to GCS with proper path structure
 * - Manage document metadata
 * - Generate signed URLs for secure downloads
 *
 * Note: Uses forwardRef() for circular dependency resolution
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly storage: Storage;
  private readonly bucketName = process.env.DOCUMENTS_BUCKET_NAME || 'payments-docs';

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @Inject(forwardRef(() => PlansService))
    private readonly plansService: PlansService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
  ) {
    // Initialize Google Cloud Storage client
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      // Credentials are automatically loaded from environment in GCP
    });
  }

  /**
   * Generate payment agreement PDF for a payment plan
   * 
   * Workflow:
   * 1. Fetch plan details from plans service
   * 2. Fetch debtor information from api-debtors (TODO)
   * 3. Fetch debt details from api-debts (TODO)
   * 4. Generate PDF using template
   * 5. Upload to GCS
   * 6. Create Document record
   * 
   * @param planId Payment plan ID
   * @param organizationId Organization context
   * @param userId User generating the document
   * @returns Created document metadata
   */
  async generatePaymentAgreement(
    planId: string,
    organizationId: string,
    userId: string,
  ): Promise<Document> {
    this.logger.log(`Generating payment agreement for plan ${planId}`);

    const startTime = Date.now();

    try {
      // Fetch plan details
      const plan = await this.plansService.findOne(planId, organizationId);

      // TODO: Fetch debtor information from api-debtors
      // For now, using placeholder data
      const debtorData = {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St, City, ST 12345',
      };

      // TODO: Fetch debt details from api-debts via plan.debts relationship
      const debtData = [
        { accountNumber: 'ACC-001', balance: 500.00 },
        { accountNumber: 'ACC-002', balance: 1000.00 },
      ];

      // Generate PDF
      const pdfBuffer = await this.generateAgreementPDF(plan, debtorData, debtData);

      // Generate unique document ID and storage path
      const documentId = uuidv4();
      const storagePath = `gs://${this.bucketName}/${organizationId}/${documentId}.pdf`;
      const gcsPath = `${organizationId}/${documentId}.pdf`;

      // Upload to GCS
      await this.uploadToGCS(gcsPath, pdfBuffer, 'application/pdf');

      // Create document metadata record
      const document = this.documentRepository.create({
        organizationId,
        debtorId: plan.debtorId,
        documentType: DocumentType.PAYMENT_AGREEMENT,
        title: `Payment Agreement - Plan #${plan.id.substring(0, 8)}`,
        storagePath,
        mimeType: 'application/pdf',
        fileSizeBytes: pdfBuffer.length,
        associatedPlanId: planId,
        createdByUserId: userId,
        metadata: {
          generationTimeMs: Date.now() - startTime,
          templateVersion: 'v1.0',
          planTotal: plan.totalAmount,
          planInstallments: plan.numberOfInstallments,
        },
      });

      const savedDocument = (await this.documentRepository.save(document)) as unknown as Document;

      this.logger.log(
        `Payment agreement generated successfully: ${savedDocument.id} (${Date.now() - startTime}ms)`,
      );

      return savedDocument;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate payment agreement for plan ${planId}:`, errorMessage);
      throw new DocumentGenerationFailedException(
        'PAYMENT_AGREEMENT',
        errorMessage,
      );
    }
  }

  /**
   * Generate payment receipt PDF for a transaction
   * 
   * Workflow:
   * 1. Fetch transaction details from transactions service
   * 2. Fetch debtor information from api-debtors (TODO)
   * 3. Generate PDF using template
   * 4. Upload to GCS
   * 5. Create Document record
   * 
   * @param transactionId Transaction ID
   * @param organizationId Organization context
   * @returns Created document metadata
   */
  async generatePaymentReceipt(
    transactionId: string,
    organizationId: string,
  ): Promise<Document> {
    this.logger.log(`Generating payment receipt for transaction ${transactionId}`);

    const startTime = Date.now();

    try {
      // Fetch transaction details
      const transaction = await this.transactionsService.findOne(
        transactionId,
        organizationId,
      );

      // TODO: Fetch debtor information from api-debtors
      const debtorData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      // Generate PDF
      const pdfBuffer = await this.generateReceiptPDF(transaction, debtorData);

      // Generate unique document ID and storage path
      const documentId = uuidv4();
      const storagePath = `gs://${this.bucketName}/${organizationId}/${documentId}.pdf`;
      const gcsPath = `${organizationId}/${documentId}.pdf`;

      // Upload to GCS
      await this.uploadToGCS(gcsPath, pdfBuffer, 'application/pdf');

      // Create document metadata record
      const document = this.documentRepository.create({
        organizationId,
        debtorId: transaction.debtorId,
        documentType: DocumentType.PAYMENT_RECEIPT,
        title: `Payment Receipt - ${transaction.createdAt.toLocaleDateString()}`,
        storagePath,
        mimeType: 'application/pdf',
        fileSizeBytes: pdfBuffer.length,
        associatedTransactionId: transactionId,
        createdByUserId: 'system', // Auto-generated
        metadata: {
          generationTimeMs: Date.now() - startTime,
          templateVersion: 'v1.0',
          transactionAmount: transaction.amount,
          transactionStatus: transaction.status,
        },
      });

      const savedDocument = (await this.documentRepository.save(document)) as unknown as Document;

      this.logger.log(
        `Payment receipt generated successfully: ${savedDocument.id} (${Date.now() - startTime}ms)`,
      );

      return savedDocument;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate payment receipt for transaction ${transactionId}:`,
        errorMessage,
      );
      throw new DocumentGenerationFailedException('PAYMENT_RECEIPT', errorMessage);
    }
  }

  /**
   * Generate invoice PDF for a debt
   * 
   * Workflow:
   * 1. Fetch debt details from api-debts (TODO)
   * 2. Fetch debtor information from api-debtors (TODO)
   * 3. Generate PDF using template
   * 4. Upload to GCS
   * 5. Create Document record
   * 
   * @param debtId Debt ID
   * @param organizationId Organization context
   * @param userId User generating the document
   * @returns Created document metadata
   */
  async generateInvoice(
    debtId: string,
    organizationId: string,
    userId: string,
  ): Promise<Document> {
    this.logger.log(`Generating invoice for debt ${debtId}`);

    const startTime = Date.now();

    try {
      // TODO: Fetch debt details from api-debts
      const debtData = {
        id: debtId,
        accountNumber: 'ACC-12345',
        principalAmount: 1000.00,
        interestAmount: 50.00,
        currentBalance: 1050.00,
        originalDebtDate: new Date('2023-01-01'),
      };

      // TODO: Fetch debtor information from api-debtors
      const debtorData = {
        id: 'debtor-123',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St, City, ST 12345',
      };

      // Generate PDF
      const pdfBuffer = await this.generateInvoicePDF(debtData, debtorData);

      // Generate unique document ID and storage path
      const documentId = uuidv4();
      const storagePath = `gs://${this.bucketName}/${organizationId}/${documentId}.pdf`;
      const gcsPath = `${organizationId}/${documentId}.pdf`;

      // Upload to GCS
      await this.uploadToGCS(gcsPath, pdfBuffer, 'application/pdf');

      // Create document metadata record
      const document = this.documentRepository.create({
        organizationId,
        debtorId: debtorData.id,
        documentType: DocumentType.INVOICE,
        title: `Invoice - Account ${debtData.accountNumber}`,
        storagePath,
        mimeType: 'application/pdf',
        fileSizeBytes: pdfBuffer.length,
        associatedDebtId: debtId,
        createdByUserId: userId,
        metadata: {
          generationTimeMs: Date.now() - startTime,
          templateVersion: 'v1.0',
          currentBalance: debtData.currentBalance,
        },
      });

      const savedDocument = (await this.documentRepository.save(document)) as unknown as Document;

      this.logger.log(
        `Invoice generated successfully: ${savedDocument.id} (${Date.now() - startTime}ms)`,
      );

      return savedDocument;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate invoice for debt ${debtId}:`, errorMessage);
      throw new DocumentGenerationFailedException('INVOICE', errorMessage);
    }
  }

  /**
   * Find all documents with filters and pagination
   * 
   * @param query Query parameters
   * @param organizationId Organization context for tenant isolation
   * @returns Paginated document list
   */
  async findAll(
    query: QueryDocumentsDto,
    organizationId: string,
  ): Promise<{ data: Document[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'DESC', ...filters } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {
      organizationId,
      deletedAt: IsNull(), // Only return non-deleted documents
    };

    // Apply filters
    if (filters.debtorId) where.debtorId = filters.debtorId;
    if (filters.documentType) where.documentType = filters.documentType;
    if (filters.associatedPlanId) where.associatedPlanId = filters.associatedPlanId;
    if (filters.associatedTransactionId)
      where.associatedTransactionId = filters.associatedTransactionId;
    if (filters.associatedDebtId) where.associatedDebtId = filters.associatedDebtId;

    // Date range filters
    if (filters.dateFrom && filters.dateTo) {
      where.createdAt = Between(new Date(filters.dateFrom), new Date(filters.dateTo));
    } else if (filters.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(filters.dateFrom));
    } else if (filters.dateTo) {
      where.createdAt = LessThanOrEqual(new Date(filters.dateTo));
    }

    const orderField = sortBy as keyof Document;
    const [data, total] = await this.documentRepository.findAndCount({
      where,
      order: { [orderField]: sortOrder },
      take: pageSize,
      skip,
    });

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Find a single document by ID
   * 
   * @param id Document ID
   * @param organizationId Organization context for tenant isolation
   * @returns Document metadata
   * @throws DocumentNotFoundException if not found
   */
  async findOne(id: string, organizationId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });

    if (!document) {
      throw new DocumentNotFoundException(id);
    }

    return document;
  }

  /**
   * Generate signed URL for secure document download
   * 
   * The signed URL allows temporary access to the document in GCS
   * without exposing GCS credentials. Expires in 1 hour.
   * 
   * @param id Document ID
   * @param organizationId Organization context for tenant isolation
   * @returns Signed download URL
   */
  async getDownloadUrl(id: string, organizationId: string): Promise<string> {
    const document = await this.findOne(id, organizationId);

    try {
      // Extract GCS path from storage path URI
      const gcsPath = document.storagePath.replace(`gs://${this.bucketName}/`, '');

      // Generate signed URL (expires in 1 hour)
      const [url] = await this.storage
        .bucket(this.bucketName)
        .file(gcsPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });

      return url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate signed URL for document ${id}:`, errorMessage);
      throw new DocumentStorageException('download URL generation', errorMessage);
    }
  }

  /**
   * Soft delete a document
   * 
   * Sets deletedAt timestamp, keeping metadata for audit purposes.
   * The actual file in GCS is kept for compliance.
   * 
   * @param id Document ID
   * @param organizationId Organization context for tenant isolation
   */
  async deleteDocument(id: string, organizationId: string): Promise<void> {
    const document = await this.findOne(id, organizationId);

    await this.documentRepository.softDelete(document.id);

    this.logger.log(`Document ${id} soft-deleted`);
  }

  /**
   * Upload file to Google Cloud Storage
   * 
   * @param gcsPath Path within bucket (e.g., "org-123/doc-456.pdf")
   * @param buffer File buffer
   * @param mimeType MIME type
   */
  private async uploadToGCS(
    gcsPath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    try {
      const file = this.storage.bucket(this.bucketName).file(gcsPath);

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });

      this.logger.log(`Uploaded file to GCS: ${gcsPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload to GCS: ${gcsPath}:`, errorMessage);
      throw new DocumentStorageException('upload', errorMessage);
    }
  }

  /**
   * Generate payment agreement PDF
   * 
   * @param plan Payment plan data
   * @param debtor Debtor data
   * @param debts Debt data
   * @returns PDF buffer
   */
  private async generateAgreementPDF(
    plan: any,
    debtor: any,
    debts: any[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

        // Collect chunks
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate PDF content
        doc.fontSize(20).text('PAYMENT AGREEMENT', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Agreement Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Plan ID: ${plan.id}`);
        doc.moveDown();

        doc.fontSize(14).text('Debtor Information', { underline: true });
        doc.fontSize(12).text(`Name: ${debtor.firstName} ${debtor.lastName}`);
        doc.text(`Address: ${debtor.address}`);
        doc.moveDown();

        doc.fontSize(14).text('Payment Terms', { underline: true });
        doc.fontSize(12).text(`Total Amount: $${plan.totalAmount.toFixed(2)}`);
        doc.text(`Number of Installments: ${plan.numberOfInstallments}`);
        doc.text(`Installment Amount: $${plan.installmentAmount.toFixed(2)}`);
        doc.text(`Frequency: ${plan.frequency}`);
        doc.text(`Start Date: ${plan.startDate.toLocaleDateString()}`);
        doc.moveDown();

        doc.fontSize(14).text('Consolidated Debts', { underline: true });
        debts.forEach((debt, index) => {
          doc.fontSize(12).text(
            `${index + 1}. Account ${debt.accountNumber}: $${debt.balance.toFixed(2)}`,
          );
        });
        doc.moveDown(2);

        doc.fontSize(10).text(
          'By signing below, the debtor agrees to the terms outlined in this agreement.',
        );
        doc.moveDown(2);

        doc.text('_________________________________');
        doc.text('Debtor Signature', { indent: 50 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate payment receipt PDF
   * 
   * @param transaction Transaction data
   * @param debtor Debtor data
   * @returns PDF buffer
   */
  private async generateReceiptPDF(transaction: any, debtor: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate PDF content
        doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Receipt Date: ${transaction.createdAt.toLocaleDateString()}`);
        doc.text(`Transaction ID: ${transaction.id}`);
        doc.moveDown();

        doc.fontSize(14).text('Payment Information', { underline: true });
        doc.fontSize(12).text(`Amount Paid: $${transaction.amount.toFixed(2)}`);
        doc.text(`Payment Method: ${transaction.paymentMethodToken.substring(0, 10)}...`);
        doc.text(`Status: ${transaction.status}`);
        doc.moveDown();

        doc.fontSize(14).text('Debtor Information', { underline: true });
        doc.fontSize(12).text(`Name: ${debtor.firstName} ${debtor.lastName}`);
        doc.text(`Email: ${debtor.email}`);
        doc.moveDown(2);

        doc.fontSize(10).text('Thank you for your payment.', { align: 'center' });
        doc.text('Please retain this receipt for your records.', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate invoice PDF
   * 
   * @param debt Debt data
   * @param debtor Debtor data
   * @returns PDF buffer
   */
  private async generateInvoicePDF(debt: any, debtor: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate PDF content
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Invoice Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Account Number: ${debt.accountNumber}`);
        doc.moveDown();

        doc.fontSize(14).text('Debtor Information', { underline: true });
        doc.fontSize(12).text(`Name: ${debtor.firstName} ${debtor.lastName}`);
        doc.text(`Address: ${debtor.address}`);
        doc.moveDown();

        doc.fontSize(14).text('Amount Due', { underline: true });
        doc.fontSize(12).text(`Principal Amount: $${debt.principalAmount.toFixed(2)}`);
        doc.text(`Interest: $${debt.interestAmount.toFixed(2)}`);
        doc.text(`Total Balance: $${debt.currentBalance.toFixed(2)}`);
        doc.moveDown();

        doc.fontSize(14).text('Original Debt Date', { underline: true });
        doc.fontSize(12).text(debt.originalDebtDate.toLocaleDateString());
        doc.moveDown(2);

        doc.fontSize(10).text(
          'Please remit payment to the address provided or contact us to set up a payment plan.',
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}