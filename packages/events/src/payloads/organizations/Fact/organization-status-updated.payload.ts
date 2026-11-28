import { OrganizationStatus } from "@verichron/enums";

/*
* Published when organization status changes.
 */
export interface OrganizationStatusUpdatedPayload {
  organizationId: string;
  previousStatus: OrganizationStatus;
  newStatus: OrganizationStatus;
  
  /**
   * Reason for status change (e.g., "Non-payment", "ToS violation", "Voluntary closure")
   */
  reason?: string;
  
  /**
   * ID of the user who triggered the status change.
   * @deprecated Use `actor.id` instead.
   */
  updatedBy: string;

  /**
   * Snapshot of the actor who performed the action.
   * Captured from the JWT/Context at the moment of the event.
   */
  actor: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };

  statusChangedAt: string;
}
