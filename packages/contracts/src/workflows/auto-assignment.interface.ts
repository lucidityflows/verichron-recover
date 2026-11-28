/**
 * Target entity to be assigned to a collector
 */
export interface AssignmentTarget {
  id: string;
  type: 'DEBT' | 'ACCOUNT' | 'DEBTOR';
  balance?: number;
  location?: {
    state?: string;
    city?: string;
    zipCode?: string;
  };
  category?: string;
  priority?: string;
  accountAge?: number; // days
  portfolioId?: string;
  [key: string]: any; // Allow other custom fields
}

/**
 * Result of an assignment attempt
 */
export interface AssignmentResult {
  success: boolean;
  collectorId?: string;
  configId: string;
  targetEntityId: string;
  reason?: string;
  error?: string;
}

/**
 * Collector with metadata for assignment decisions
 */
export interface CollectorMetadata {
  id: string;
  name: string;
  currentWorkload: number;
  skills?: string[];
  territories?: {
    states?: string[];
    zipcodes?: string[];
  };
  isAvailable: boolean;
}

/**
 * Auto-assignment configuration filters
 */
export interface AutoAssignmentFilters {
  portfolioIds?: string[];
  balanceRange?: [number, number];
  accountAgeRange?: [number, number];
  priority?: string[];
  [key: string]: any;
}
