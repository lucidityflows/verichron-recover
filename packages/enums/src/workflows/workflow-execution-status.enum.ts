export enum WorkflowExecutionStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED', // For actions skipped due to stop-work logic
  RUNNING = 'RUNNING', // For current executions
  PENDING = 'PENDING', // For scheduled executions
}
