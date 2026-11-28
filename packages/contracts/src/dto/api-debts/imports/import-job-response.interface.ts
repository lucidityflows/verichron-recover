import { ImportJobStatus } from "@verichron/enums";

/**
 * Contract interface for import job response data.
 *
 * Represents the current state of an import job with progress tracking.
 */
export interface IImportJobResponse {
  /**
   * Unique import job identifier
   */
  id: string;

  /**
   * Organization that owns this import job
   */
  organizationId: string;

  /**
   * Name of the portfolio being created
   */
  portfolioName: string;

  /**
   * Current processing status
   */
  status: ImportJobStatus;

  /**
   * Total number of rows in CSV (null if not yet parsed)
   */
  totalRows: number | null;

  /**
   * Number of rows processed so far
   */
  processedRows: number;

  /**
   * Progress percentage (0-100, null if totalRows is null)
   */
  progressPercentage: number | null;

  /**
   * Error message if import failed (null otherwise)
   */
  errorMessage: string | null;

  /**
   * Portfolio ID if successfully created (null otherwise)
   */
  portfolioId: string | null;

  /**
   * Timestamp when import job was created (ISO 8601)
   */
  createdAt: string;

  /**
   * Timestamp when import job was last updated (ISO 8601)
   */
  updatedAt: string;
}

/**
 * Contract interface for pagination metadata.
 */
export interface IPaginationMeta {
  /**
   * Current page number
   */
  page: number;

  /**
   * Number of items per page
   */
  pageSize: number;

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Total number of pages
   */
  totalPages: number;
}

/**
 * Contract interface for paginated import job list response.
 */
export interface IPaginatedImportJobResponse {
  /**
   * Array of import jobs for current page
   */
  data: IImportJobResponse[];

  /**
   * Pagination metadata
   */
  meta: IPaginationMeta;
}
