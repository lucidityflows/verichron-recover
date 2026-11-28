/**
 * Reason for collector assignment
 */
export enum AssignmentReason {
  /**
   * Automatically assigned by round-robin strategy
   */
  AUTO_ROUND_ROBIN = 'AUTO_ROUND_ROBIN',

  /**
   * Automatically assigned by least-workload strategy
   */
  AUTO_LEAST_WORKLOAD = 'AUTO_LEAST_WORKLOAD',

  /**
   * Automatically assigned by skill-based matching
   */
  AUTO_SKILL_BASED = 'AUTO_SKILL_BASED',

  /**
   * Automatically assigned by geographic territory
   */
  AUTO_GEOGRAPHIC = 'AUTO_GEOGRAPHIC',

  /**
   * Manually assigned by manager or admin
   */
  MANUAL = 'MANUAL',

  /**
   * Escalated from another collector
   */
  ESCALATION = 'ESCALATION',

  /**
   * Reassigned due to collector unavailability
   */
  REASSIGNMENT = 'REASSIGNMENT',

  /**
   * Assigned as part of workload balancing
   */
  WORKLOAD_BALANCING = 'WORKLOAD_BALANCING',
}
