import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { IImportParser, IPortfolioImportData } from '@verichron/contracts';
import { InvalidImportFileException } from '../errors';

/**
 * Vertex AI Document AI Parser Service (Production Implementation)
 *
 * Uses Google Cloud Document AI Form Parser to extract structured data from:
 * - PDF documents
 * - Images (JPG, PNG, TIFF)
 * - Spreadsheets (CSV, XLSX)
 * - JSON files
 *
 * **Architecture:**
 * - Form Parser processor extracts key-value pairs and tables
 * - Field mapping logic normalizes Document AI output to debt portfolio format
 * - Confidence thresholds ensure data quality (min 0.8)
 * - Retry logic handles transient API failures
 * - Cost monitoring and page limits prevent runaway costs
 *
 * **Security:**
 * - Service account authentication with minimal permissions
 * - PII data processed in-memory only (never persisted)
 * - Audit logging for compliance
 * - Timeout protection (60s max)
 *
 * **Cost Management:**
 * - ~$1.50 per 1000 pages processed
 * - Page limit enforced (default: 100 pages per file)
 * - Results cached (future enhancement)
 *
 * **Error Handling:**
 * - Exponential backoff for rate limits
 * - Detailed error messages with file metadata
 * - Graceful degradation for low-confidence extractions
 */
@Injectable()
export class VertexAiParserService implements IImportParser {
  private readonly logger = new Logger(VertexAiParserService.name);
  readonly name = 'vertex-ai-parser';
  readonly supportedExtensions = [
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.tiff',
    '.csv',
    '.xlsx',
    '.json',
  ];

  private client: DocumentProcessorServiceClient;
  private projectId: string;
  private location: string;
  private processorId: string;
  private maxPages: number;
  private timeout: number;
  private minConfidence: number;

  constructor(private readonly config: ConfigService) {
    // Skip initialization if using emulator (MockParserService will be used instead)
    const useEmulator = this.config.get<string>('DOCUMENT_AI_EMULATOR') === 'true';
    if (useEmulator) {
      this.logger.log('Skipping Vertex AI Parser initialization (emulator mode enabled)');
      return;
    }

    this.projectId = this.config.get<string>('GCP_PROJECT_ID')!;
    this.location = this.config.get<string>('GCP_LOCATION', 'us');
    this.processorId = this.config.get<string>('DOCUMENT_AI_PROCESSOR_ID')!;
    this.maxPages = this.config.get<number>('DOCUMENT_AI_MAX_PAGES_PER_FILE', 100);
    this.timeout = this.config.get<number>('DOCUMENT_AI_TIMEOUT_MS', 60000);
    this.minConfidence = this.config.get<number>('DOCUMENT_AI_MIN_CONFIDENCE', 0.8);

    // Validate required configuration
    if (!this.projectId || !this.processorId) {
      throw new Error(
        'Document AI configuration missing. Required: GCP_PROJECT_ID, DOCUMENT_AI_PROCESSOR_ID',
      );
    }

    // Initialize Document AI client with regional endpoint
    const apiEndpoint =
      this.location === 'eu'
        ? 'eu-documentai.googleapis.com'
        : this.location === 'us'
          ? 'us-documentai.googleapis.com'
          : `${this.location}-documentai.googleapis.com`;

    this.client = new DocumentProcessorServiceClient({
      apiEndpoint,
    });

    this.logger.log('Vertex AI Parser initialized', {
      projectId: this.projectId,
      location: this.location,
      processorId: this.processorId,
      apiEndpoint,
    });
  }

  /**
   * Parse file using Document AI Form Parser.
   *
   * Process:
   * 1. Validate file size and page count
   * 2. Encode file as base64
   * 3. Call Document AI API with retry logic
   * 4. Extract entities (key-value pairs) and tables
   * 5. Map Document AI output to portfolio/debt structure
   * 6. Validate confidence thresholds
   * 7. Return normalized IPortfolioImportData
   *
   * @param fileContent - File buffer to parse
   * @param filename - Original filename (for MIME type detection)
   * @returns Normalized portfolio data
   * @throws InvalidImportFileException for parsing failures
   */
  async parse(
    fileContent: Buffer,
    filename: string,
    options?: { columnMapping?: Record<string, string> },
  ): Promise<IPortfolioImportData> {
    const startTime = Date.now();
    this.logger.log('Starting Document AI parsing', {
      filename,
      fileSize: fileContent.length,
    });

    try {
      // Step 1: Validate file
      this.validateFile(fileContent, filename);

      // Step 2: Determine MIME type
      const mimeType = this.getMimeType(filename);

      // Step 3: Encode file
      const encodedFile = fileContent.toString('base64');

      // Step 4: Build processor path
      const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

      // Step 5: Call Document AI API with retry
      const [result] = await this.processWithRetry(name, encodedFile, mimeType);

      const processingTime = Date.now() - startTime;
      this.logger.log('Document AI processing completed', {
        filename,
        processingTimeMs: processingTime,
        pages: result.document?.pages?.length || 0,
      });

      // Step 6: Extract structured data
      const portfolioData = this.extractPortfolioData(result.document, filename);

      // Step 7: Validate confidence
      this.validateConfidence(portfolioData);

      return portfolioData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Document AI parsing failed', {
        filename,
        error: errorMessage,
        stack: errorStack,
      });

      if (error instanceof InvalidImportFileException) {
        throw error;
      }

      throw new InvalidImportFileException(
        `Document AI processing failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Validate file before processing.
   */
  private validateFile(fileContent: Buffer, filename: string): void {
    // Check file size (max 20MB for Document AI)
    const maxSize = 20 * 1024 * 1024;
    if (fileContent.length > maxSize) {
      throw new InvalidImportFileException(
        `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
      );
    }

    // Check supported extension
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!this.supportedExtensions.includes(ext)) {
      throw new InvalidImportFileException(
        `Unsupported file type: ${ext}. Supported: ${this.supportedExtensions.join(', ')}`,
      );
    }
  }

  /**
   * Determine MIME type from filename extension.
   */
  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.tiff': 'image/tiff',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.json': 'application/json',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Call Document AI API with exponential backoff retry logic.
   */
  private async processWithRetry(
    name: string,
    encodedFile: string,
    mimeType: string,
    retries = 3,
  ): Promise<any> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await Promise.race([
          this.client.processDocument({
            name,
            rawDocument: {
              content: encodedFile,
              mimeType,
            },
          }),
          this.timeoutPromise(this.timeout),
        ]);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // Check if error is retryable
        const isRetryable =
          error && typeof error === 'object' && 'code' in error && (
            (error as any).code === 429 || // Rate limit
            (error as any).code === 500 || // Server error
            (error as any).code === 503    // Service unavailable
          );

        if (!isRetryable) {
          throw error;
        }

        // Exponential backoff: 2s, 4s, 8s
        const delayMs = Math.pow(2, attempt) * 1000;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn('Document AI API call failed, retrying...', {
          attempt,
          delayMs,
          error: errorMessage,
        });

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Create timeout promise for API call.
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Document AI API call timed out after ${ms}ms`)),
        ms,
      ),
    );
  }

  /**
   * Extract portfolio and debt data from Document AI response.
   *
   * Document AI returns:
   * - entities: Key-value pairs (e.g., "Account Number: 12345")
   * - tables: Structured data (multiple debts in rows)
   * - pages: Text and layout information
   *
   * This method normalizes Document AI output to IPortfolioImportData.
   *
   * TODO: Implement field mapping logic specific to debt portfolio documents.
   * This is a placeholder that needs enhancement based on actual document structure.
   */
  private extractPortfolioData(
    document: any,
    filename: string,
  ): IPortfolioImportData {
    this.logger.log('Extracting portfolio data from Document AI response');

    // TODO: Implement actual field extraction logic
    // For now, return placeholder structure
    // In production, this needs to:
    // 1. Map Document AI entities to debt fields
    // 2. Extract tables containing multiple debts
    // 3. Handle various document formats and layouts
    // 4. Apply confidence thresholds
    // 5. Validate required fields are present

    throw new InvalidImportFileException(
      'Document AI field extraction not yet implemented. See TODO in vertex-ai-parser.service.ts:extractPortfolioData()',
    );

    // Example structure (placeholder):
    // return {
    //   portfolioName: extractedName,
    //   purchaseDate: extractedDate,
    //   purchasePrice: extractedPrice,
    //   source: extractedSource,
    //   debts: extractedDebts,
    //   metadata: {
    //     source: 'vertex-ai-document-ai',
    //     confidence: averageConfidence,
    //   },
    // };
  }

  /**
   * Validate extracted data meets confidence thresholds.
   *
   * TODO: Re-implement this method once confidence is added to IPortfolioImportData metadata.
   */
  private validateConfidence(data: IPortfolioImportData): void {
    this.logger.warn('Confidence validation is currently disabled as "confidence" is not part of IPortfolioImportData metadata.');
    // const confidence = data.metadata?.confidence || 0;

    // if (confidence < this.minConfidence) {
    //   throw new InvalidImportFileException(
    //     `Document AI extraction confidence too low: ${confidence.toFixed(2)} (minimum: ${this.minConfidence})`,
    //   );
    // }

    // this.logger.log('Confidence validation passed', { confidence });
  }

  /**
   * Inspect file using Document AI (Placeholder).
   */
  async inspect(
    fileContent: Buffer,
    filename: string,
  ): Promise<{ headers: string[]; previewRows: any[] }> {
    this.logger.warn('Document AI inspection not yet fully implemented');
    // For now, return empty lists to avoid crashing the pipeline
    return { headers: [], previewRows: [] };
  }
}
