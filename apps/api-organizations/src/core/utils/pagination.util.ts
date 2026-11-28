import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

/**
 * Pagination options interface
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Apply pagination to a TypeORM query builder
 */
export function applyPagination<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  options: PaginationOptions,
): SelectQueryBuilder<T> {
  const { page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  return query.skip(skip).take(pageSize);
}

/**
 * Build a paginated response object
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResponseDto<T> {
  const { page, pageSize } = options;
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const response = new PaginatedResponseDto<T>();
  response.data = data;
  response.meta = {
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
  return response;
}

/**
 * Execute a paginated query and return formatted response
 */
export async function executePaginatedQuery<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  options: PaginationOptions,
): Promise<PaginatedResponseDto<T>> {
  const paginatedQuery = applyPagination(query, options);
  const [data, total] = await paginatedQuery.getManyAndCount();

  return buildPaginatedResponse(data, total, options);
}

/**
 * Validate and normalize pagination options
 */
export function validatePaginationOptions(
  page?: number,
  pageSize?: number,
): PaginationOptions {
  const validatedPage = Math.max(1, page || 1);
  const validatedPageSize = Math.min(Math.max(1, pageSize || 10), 100);

  return {
    page: validatedPage,
    pageSize: validatedPageSize,
  };
}