// packages/types/src/events/payloads.ts (add these to existing file)

/**
 * Payload for DebtorInformationReceived event
 * Published by api-debts during import, consumed by api-debtors
 */
export interface DebtorInformationReceivedPayload {
  /** Organization that imported this debtor data */
  sourceOrganizationId: string;
  
  /** Reference to the import job that created this event */
  importJobId?: string;
  
  /** Reference to the debt this debtor is associated with */
  debtId?: string;
  
  /** Debtor demographic and contact data from import file */
  debtorData: {
    /** First name */
    firstName: string;
    
    /** Last name */
    lastName: string;
    
    /** Middle name (optional) */
    middleName?: string;
    
    /** Date of birth in ISO 8601 format (optional) */
    dateOfBirth?: string;
    
    /** Primary email address (optional) */
    email?: string;
    
    /** Primary phone number in E.164 format (optional) */
    phone?: string;
    
    /** Primary address (optional) */
    address?: {
      streetLine1: string;
      streetLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
    };
    
    /** Additional notes (optional) */
    notes?: string;
  };
}