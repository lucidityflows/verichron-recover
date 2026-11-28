import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentsService } from './document.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { GenerateAgreementDto } from './dto/generate-agreement.dto';
import { GenerateReceiptDto } from './dto/generate-receipt.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { Document } from './entities/document.entity';
import { Permissions } from '@verichron/auth';
import { RequestContext } from '../core/services/request-context.service';

/**
 * Documents Controller
 * 
 * Manages payment-related document generation, storage, and retrieval.
 * All documents are stored in Google Cloud Storage with metadata tracked in the database.
 * 
 * All endpoints enforce organization-level tenant isolation.
 */
@ApiTags('Documents')
@ApiBearerAuth()
@Controller('transactions/documents/orgs/:organizationId')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly requestContext: RequestContext,
  ) {}

  /**
   * Generate Payment Agreement
   * 
   * Generate a payment agreement PDF for a payment plan.
   * The agreement contains plan terms, debtor information, and signature fields.
   * 
   * Requires: payment_plan:create permission
   */
  @Post('generate-agreement')
  @Permissions('payment_plan:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate payment agreement',
    description:
      'Generate a payment agreement PDF for a payment plan. ' +
      'The document contains plan terms, debtor information, and signature fields. ' +
      'The PDF is automatically uploaded to Google Cloud Storage.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment agreement generated successfully',
    type: Document,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment plan not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Document generation or storage failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment_plan:create permission',
  })
  async generateAgreement(
    @Param('organizationId') _orgId: string,
    @Body() generateDto: GenerateAgreementDto,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.documentsService.generatePaymentAgreement(
      generateDto.planId,
      organizationId,
      userId,
    );
  }

  /**
   * Generate Payment Receipt
   * 
   * Generate a payment receipt PDF for a transaction.
   * The receipt contains transaction details, amount, date, and payment method.
   * 
   * Requires: payment:create permission
   */
  @Post('generate-receipt')
  @Permissions('payment:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate payment receipt',
    description:
      'Generate a payment receipt PDF for a transaction. ' +
      'The document contains transaction details, amount, date, and payment method. ' +
      'Automatically called after successful payment processing.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment receipt generated successfully',
    type: Document,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Document generation or storage failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment:create permission',
  })
  async generateReceipt(
    @Param('organizationId') _orgId: string,
    @Body() generateDto: GenerateReceiptDto,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    return this.documentsService.generatePaymentReceipt(
      generateDto.transactionId,
      organizationId,
    );
  }

  /**
   * Generate Invoice
   * 
   * Generate an invoice PDF for a debt.
   * The invoice contains debt details, amounts owed, and payment instructions.
   * 
   * Requires: debt:read permission
   */
  @Post('generate-invoice')
  @Permissions('debt:read')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate invoice',
    description:
      'Generate an invoice PDF for a debt. ' +
      'The document contains debt details, amounts owed, and payment instructions.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invoice generated successfully',
    type: Document,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Debt not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Document generation or storage failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks debt:read permission',
  })
  async generateInvoice(
    @Param('organizationId') _orgId: string,
    @Body() generateDto: GenerateInvoiceDto,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    const userId = this.requestContext.getUserId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    if (!userId) {
      throw new InternalServerErrorException('User context not available');
    }
    return this.documentsService.generateInvoice(
      generateDto.debtId,
      organizationId,
      userId,
    );
  }

  /**
   * List Documents
   * 
   * Retrieve a paginated, filterable list of documents.
   * Results are automatically scoped to the user's organization.
   * 
   * Requires: document:read permission
   */
  @Get()
  @Permissions('document:read')
  @ApiOperation({
    summary: 'List documents',
    description:
      'Retrieve a paginated list of documents with optional filters. ' +
      'Results are automatically scoped to the requesting user\'s organization.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Document' },
        },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        pageSize: { type: 'number', example: 20 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks document:read permission',
  })
  async findAll(
    @Param('organizationId') _orgId: string,
    @Query() query: QueryDocumentsDto,
  ): Promise<{
    data: Document[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    return this.documentsService.findAll(query, organizationId);
  }

  /**
   * Get Document Details
   * 
   * Retrieve detailed metadata about a specific document.
   * Does not return the actual file - use the download endpoint for that.
   * 
   * Requires: document:read permission
   */
  @Get(':id')
  @Permissions('document:read')
  @ApiOperation({
    summary: 'Get document details',
    description:
      'Retrieve detailed metadata about a specific document by ID. ' +
      'Returns document metadata only, not the file itself. ' +
      'Access is automatically scoped to the requesting user\'s organization.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document found',
    type: Document,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found or access denied',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks document:read permission',
  })
  async findOne(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Document> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    return this.documentsService.findOne(id, organizationId);
  }

  /**
   * Download Document
   * 
   * Generate a signed URL for secure document download from Google Cloud Storage.
   * The URL expires in 1 hour.
   * 
   * Requires: document:read permission
   */
  @Get(':id/download')
  @Permissions('document:read')
  @ApiOperation({
    summary: 'Download document',
    description:
      'Generate a signed URL for secure document download from Google Cloud Storage. ' +
      'The signed URL provides temporary access to the document file without exposing ' +
      'GCS credentials. The URL expires in 1 hour.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Signed download URL generated',
    schema: {
      type: 'object',
      properties: {
        downloadUrl: {
          type: 'string',
          example: 'https://storage.googleapis.com/...',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T11:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to generate signed URL',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks document:read permission',
  })
  async getDownloadUrl(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    const downloadUrl = await this.documentsService.getDownloadUrl(id, organizationId);

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };
  }

  /**
   * Delete Document
   * 
   * Soft delete a document. The metadata is retained for audit purposes
   * and the file remains in Google Cloud Storage.
   * 
   * Requires: document:delete permission
   */
  @Delete(':id')
  @Permissions('document:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete document',
    description:
      'Soft delete a document. The document metadata is retained for audit purposes ' +
      'with a deletedAt timestamp. The file remains in Google Cloud Storage.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks document:delete permission',
  })
  async remove(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }
    return this.documentsService.deleteDocument(id, organizationId);
  }
}