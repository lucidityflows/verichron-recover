/**
 * Payload for MembershipCreated event
 *
 * Used when an existing user is added to a new organization.
 * Unlike UserCreated, this does not include invitation fields since
 * the user already exists and has credentials.
 */
export interface MembershipCreatedPayload {
  userId: string;
  organizationId: string;
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;

  /**
   * The role assigned to this user in the organization.
   */
  roleId: string;

  /**
   * ID of the user who created this membership.
   * May be null for system-generated memberships (e.g., onboarding flow).
   */
  createdBy: string | null;
}
