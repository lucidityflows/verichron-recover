/**
 * Payment Plans Exceptions
 *
 * Aggregate export file for all payment plan exceptions.
 * Provides convenient single import point for service layer.
 */

export { PlanNotFoundException } from './plan-not-found.exception';
export { InvalidPlanStateException } from './invalid-plan-state.exception';
export { DebtAlreadyInPlanException } from './debt-already-in-plan.exception';
export { InvalidStateTransitionException } from './invalid-state-transition.exception';
export { PlanApprovalRequiredException } from './plan-approval-required.exception';
