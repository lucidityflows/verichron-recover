
/**
 * Interface for Global Creditor (Platform Master List)
 */
export interface IGlobalCreditor {
  canonicalName: string;
  verifiedEIN?: string;
  knownAliases?: string[];
  industry?: string;
  isReferenceOnly?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Interface for creating a new global creditor
 */
export interface ICreateGlobalCreditor extends IGlobalCreditor {}

/**
 * Interface for updating an existing global creditor
 */
export interface IUpdateGlobalCreditor extends Partial<IGlobalCreditor> {}
