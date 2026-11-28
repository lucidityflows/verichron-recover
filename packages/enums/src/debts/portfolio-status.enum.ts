
/**
 * Exception thrown when an invalid portfolio status transition is attempted.
 * 
 * HTTP Status: 400 Bad Request
 * Error Code: DEBTS_PORTFOLIOS_002
 * 
 * Status transitions are enforced via a state machine defined in
 * VALID_STATUS_TRANSITIONS. This prevents illogical state changes.
 * 
 * Example invalid transitions:
 * - SOLD → ACTIVE (cannot reactivate a sold portfolio)
 * - PROVISIONING → CLOSED (must go through ACTIVE first)
 * - CLOSED → PROVISIONING (cannot revert to provisioning)
 * 
 * Valid transitions are documented in portfolio-status.enum.ts
 */
export enum PortfolioStatus {
    SOLD = "SOLD",
    PROVISIONING = "PROVISIONING",
    ACTIVE = "ACTIVE",
    CLOSED = "CLOSED"
}