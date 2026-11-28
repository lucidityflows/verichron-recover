export interface IAuditSystemStats {
  status: string;
  service: string;
  mode: string;
  metrics: {
    totalLogs: number;
    logsToday: number;
    lastLogAt: string | Date | null;
  };
  generatedAt: string | Date;
}
