import { OrganizationType } from '@verichron/enums';

export interface OrganizationReactivatedPayload {
  organizationId: string;
  organizationName: string;
  organizationType: OrganizationType;
  reactivatedBy?: string;
  reactivatedAt?: string;
}
