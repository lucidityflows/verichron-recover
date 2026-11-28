import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * Apply sorting to a query builder
 * @param allowedFields - Whitelist of fields that can be sorted (security measure)
 */
export function applySorting<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  sortBy?: string,
  sortOrder: 'ASC' | 'DESC' = 'DESC',
  allowedFields: string[] = [],
): SelectQueryBuilder<T> {
  if (!sortBy) {
    return query;
  }

  // Security: Only allow whitelisted fields
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    sortBy = allowedFields[0] || 'createdAt';
  }

  return query.orderBy(`${alias}.${sortBy}`, sortOrder);
}

/**
 * Apply partial (ILIKE) match filter
 */
export function applyPartialMatch<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  value: string | undefined,
  paramName: string,
): SelectQueryBuilder<T> {
  if (!value) {
    return query;
  }

  return query.andWhere(`${alias}.${field} ILIKE :${paramName}`, {
    [paramName]: `%${value}%`,
  });
}

/**
 * Apply exact match filter
 */
export function applyExactMatch<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  value: any | undefined,
  paramName: string,
): SelectQueryBuilder<T> {
  if (value === undefined || value === null) {
    return query;
  }

  return query.andWhere(`${alias}.${field} = :${paramName}`, {
    [paramName]: value,
  });
}

/**
 * Apply boolean filter
 */
export function applyBooleanFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  value: boolean | undefined,
  paramName: string,
): SelectQueryBuilder<T> {
  if (value === undefined || value === null) {
    return query;
  }

  return query.andWhere(`${alias}.${field} = :${paramName}`, {
    [paramName]: value,
  });
}

/**
 * Apply date range filter
 */
export function applyDateRangeFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  startDate?: Date | string,
  endDate?: Date | string,
  startParamName: string = 'startDate',
  endParamName: string = 'endDate',
): SelectQueryBuilder<T> {
  if (startDate) {
    query.andWhere(`${alias}.${field} >= :${startParamName}`, {
      [startParamName]: startDate,
    });
  }

  if (endDate) {
    query.andWhere(`${alias}.${field} <= :${endParamName}`, {
      [endParamName]: endDate,
    });
  }

  return query;
}

/**
 * Apply enum filter
 */
export function applyEnumFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  value: string | undefined,
  paramName: string,
): SelectQueryBuilder<T> {
  if (!value) {
    return query;
  }

  return query.andWhere(`${alias}.${field} = :${paramName}`, {
    [paramName]: value,
  });
}

/**
 * Apply search filter across multiple fields (OR condition)
 */
export function applySearchFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  fields: string[],
  searchTerm: string | undefined,
  paramName: string,
): SelectQueryBuilder<T> {
  if (!searchTerm || fields.length === 0) {
    return query;
  }

  const conditions = fields
    .map((field) => `${alias}.${field} ILIKE :${paramName}`)
    .join(' OR ');

  return query.andWhere(`(${conditions})`, {
    [paramName]: `%${searchTerm}%`,
  });
}

/**
 * Apply validity filter (checks if current date is within validFrom/validTo range)
 */
export function applyValidityFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  validFromField: string = 'validFrom',
  validToField: string = 'validTo',
  onlyValid: boolean = false,
): SelectQueryBuilder<T> {
  if (!onlyValid) {
    return query;
  }

  const now = new Date().toISOString();

  return query
    .andWhere(
      `(${alias}.${validFromField} IS NULL OR ${alias}.${validFromField} <= :now)`,
      { now },
    )
    .andWhere(
      `(${alias}.${validToField} IS NULL OR ${alias}.${validToField} >= :now)`,
      { now },
    );
}

/**
 * Apply filter to check if a relation exists
 */
export function applyRelationExistsFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  relationField: string,
  exists: boolean | undefined,
): SelectQueryBuilder<T> {
  if (exists === undefined || exists === null) {
    return query;
  }

  if (exists) {
    query.andWhere(`${alias}.${relationField} IS NOT NULL`);
  } else {
    query.andWhere(`${alias}.${relationField} IS NULL`);
  }

  return query;
}

/**
 * Apply IN filter for array of values
 */
export function applyInFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  values: any[] | undefined,
  paramName: string,
): SelectQueryBuilder<T> {
  if (!values || values.length === 0) {
    return query;
  }

  return query.andWhere(`${alias}.${field} IN (:...${paramName})`, {
    [paramName]: values,
  });
}

/**
 * Apply NOT IN filter for array of values
 */
export function applyNotInFilter<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  values: any[] | undefined,
  paramName: string,
): SelectQueryBuilder<T> {
  if (!values || values.length === 0) {
    return query;
  }

  return query.andWhere(`${alias}.${field} NOT IN (:...${paramName})`, {
    [paramName]: values,
  });
}