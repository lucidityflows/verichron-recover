import { ImportJobStatus } from './import-job-status.enum';

/**
 * Terminal statuses that represent end states for import jobs
 */
export const IMPORT_TERMINAL_STATUSES: ImportJobStatus[] = [
  ImportJobStatus.COMPLETED,
  ImportJobStatus.FAILED,
];

/**
 * Checks if an import job status is terminal (no further processing)
 *
 * @param status - The import job status to check
 * @returns true if the status is terminal
 */
export function isImportTerminalStatus(status: ImportJobStatus): boolean {
  return IMPORT_TERMINAL_STATUSES.includes(status);
}
