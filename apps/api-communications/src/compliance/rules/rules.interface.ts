import { DebtorPreference } from '../../preferences/entities/debtor-preference.entity';
import { CommunicationLog } from '../../logs/schemas/communication-log.schema';
import { CommunicationType, StateAbbreviation } from '@verichron/enums';

export interface ComplianceRule {
  name: string;
  check(context: ComplianceContext): Promise<ComplianceResult>;
}

export interface ComplianceContext {
  debtorId: string;
  organizationId: string;
  communicationType: CommunicationType;
  scheduledAt?: Date;
  state?: StateAbbreviation;
  debtorPreferences?: DebtorPreference;
  recentCommunications?: CommunicationLog[];
}

export interface ComplianceResult {
  allowed: boolean;
  reason?: string;
  ruleName?: string;
  nextAllowedAt?: Date;
}