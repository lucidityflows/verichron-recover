
/**
 * Interface for Tenant-Scoped Creditor
 */
export interface ICreditor {
  legalName: string;
  ein?: string;
  dbaName?: string;
  street1?: string;
  street2?: string;
  street3?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  industry?: string;
  notes?: string;
}

/**
 * Interface for creating a new tenant-scoped creditor
 */
export interface ICreateCreditor extends ICreditor {}

/**
 * Interface for updating an existing tenant-scoped creditor
 */
export interface IUpdateCreditor extends Partial<ICreditor> {}
