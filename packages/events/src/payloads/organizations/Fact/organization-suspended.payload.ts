import { OrganizationType } from '@verichron/enums';

export interface OrganizationSuspendedPayload {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  suspendedBy?: string;
  suspendedAt?: string;
}
