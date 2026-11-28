import { ImportJobStatus } from "@verichron/enums";

/**
 * Contract interface for querying import jobs with filters and pagination.
 */
export interface IQueryImports {
  /**
   * Filter by import job status
   */
  status?: ImportJobStatus;

  /**
   * Page number (1-indexed, defaults to 1)
   */
  page?: number;

  /**
   * Number of items per page (defaults to 20, max 100)
   */
  pageSize?: number;

  /**
   * Sort order by creation date (defaults to DESC)
   */
  order?: 'ASC' | 'DESC';
}
