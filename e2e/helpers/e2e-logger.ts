import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

export class E2ELogger {
  private static instance: E2ELogger;
  private logStream: fs.WriteStream | null = null;
  private logFile: string;

  private constructor() {
    // Resolve log file path relative to project root
    const rootDir = path.resolve(__dirname, '../../');
    this.logFile = path.join(rootDir, 'e2e-latest.log');
    
    // Initialize the log stream (append to existing file created by CLI)
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
  }

  public static getInstance(): E2ELogger {
    if (!E2ELogger.instance) {
      E2ELogger.instance = new E2ELogger();
    }
    return E2ELogger.instance;
  }

  /**
   * Writes to BOTH Console and File.
   * Use this for standard test progress and important info.
   */
  public log(message: string, ...args: any[]): void {
    const formatted = util.format(message, ...args);
    console.log(formatted); // Print to console
    this.writeToFile(`[INFO] ${formatted}`);
  }

  /**
   * Writes to BOTH Console and File (in Red).
   * Use this for REAL test failures or unexpected crashes.
   */
  public error(message: string, ...args: any[]): void {
    const formatted = util.format(message, ...args);
    console.error(formatted); // Print to console (standard error)
    this.writeToFile(`[ERROR] ${formatted}`);
  }

  /**
   * Writes to FILE ONLY.
   * Use this for "Intentional Failures" (e.g. testing 400/403 responses)
   * or verbose debugging data that clutters the console.
   */
  public expectedError(message: string, ...args: any[]): void {
    const formatted = util.format(message, ...args);
    // DO NOT print to console
    this.writeToFile(`[EXPECTED] ${formatted}`);
  }

  /**
   * Writes to FILE ONLY.
   * Use this for debug info (payloads, headers).
   */
  public debug(message: string, ...args: any[]): void {
    const formatted = util.format(message, ...args);
    this.writeToFile(`[DEBUG] ${formatted}`);
  }

  private writeToFile(message: string): void {
    if (this.logStream) {
      // Strip ANSI color codes for the log file
      // eslint-disable-next-line no-control-regex
      const cleanMessage = message.replace(/\x1B\[\d+m/g, '');
      this.logStream.write(cleanMessage + '\n');
    }
  }

  public close(): void {
    if (this.logStream) {
      this.logStream.write(`\n--- E2E Test Run Finished: ${new Date().toISOString()} ---\n`);
      this.logStream.end();
      this.logStream = null;
    }
  }
}

export const logger = E2ELogger.getInstance();
