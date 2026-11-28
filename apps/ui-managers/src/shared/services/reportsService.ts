import { usersApiClient } from './apiClient.js';
import type { AxiosRequestConfig } from '@verichron/api-client';

// ============================================================================
// DAILY COLLECTION REPORT
// ============================================================================

export interface DailyCollectionReport {
  reportDate: string;
  summary: {
    totalContacts: number;
    successfulContacts: number;
    contactRate: number; // Percentage
    promisesSecured: number;
    paymentsReceived: number;
    totalCollected: number;
    activeCollectors: number;
  };
  collectorBreakdown: {
    collectorId: string;
    collectorName: string;
    contacts: number;
    successfulContacts: number;
    promises: number;
    payments: number;
    collected: number;
  }[];
  hourlyBreakdown: {
    hour: number;
    contacts: number;
    collections: number;
  }[];
  topPerformers: {
    collectorId: string;
    collectorName: string;
    metric: string;
    value: number;
  }[];
}

// ============================================================================
// COLLECTOR PERFORMANCE REPORT
// ============================================================================

export interface CollectorPerformanceReport {
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  collectors: {
    collectorId: string;
    collectorName: string;
    metrics: {
      totalContacts: number;
      successfulContacts: number;
      contactRate: number;
      promisesSecured: number;
      paymentsReceived: number;
      totalCollected: number;
      avgDailyCollections: number;
      goalsMetPercentage: number;
    };
    ranking: {
      overall: number;
      contacts: number;
      collections: number;
      efficiency: number;
    };
    trend: 'improving' | 'stable' | 'declining';
  }[];
  teamAverages: {
    contactRate: number;
    avgDailyCollections: number;
    goalsMetPercentage: number;
  };
}

// ============================================================================
// PORTFOLIO HEALTH REPORT
// ============================================================================

export interface PortfolioHealthReport {
  portfolios: {
    portfolioId: string;
    portfolioName: string;
    summary: {
      totalAccounts: number;
      totalDebt: number;
      collected: number;
      recoveryRate: number;
      avgAccountAge: number; // Days
    };
    agingAnalysis: {
      '0-30': { count: number; amount: number };
      '31-60': { count: number; amount: number };
      '61-90': { count: number; amount: number };
      '91-180': { count: number; amount: number };
      '180+': { count: number; amount: number };
    };
    riskAnalysis: {
      lowRisk: { count: number; amount: number };
      mediumRisk: { count: number; amount: number };
      highRisk: { count: number; amount: number };
    };
    performance: {
      contactsMade: number;
      promisesSecured: number;
      paymentsReceived: number;
      activeCollectors: number;
    };
    healthScore: number; // 0-100
  }[];
}

// ============================================================================
// COMPLIANCE REPORT
// ============================================================================

export interface ComplianceReport {
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
    pendingAlerts: number;
    avgResolutionTime: number; // Hours
  };
  alertsByType: {
    type: 'fdcpa_violation' | 'cease_desist' | 'dispute' | 'bankruptcy' | 'time_restriction' | 'frequency_violation';
    count: number;
    severity: 'critical' | 'warning' | 'info';
  }[];
  collectorCompliance: {
    collectorId: string;
    collectorName: string;
    alertCount: number;
    criticalCount: number;
    complianceScore: number; // 0-100
  }[];
  recentIncidents: {
    id: string;
    timestamp: string;
    type: string;
    collectorId: string;
    collectorName: string;
    debtorId: string;
    description: string;
    status: 'pending' | 'investigating' | 'resolved';
  }[];
}

// ============================================================================
// CUSTOM REPORT
// ============================================================================

export interface CustomReportConfig {
  name: string;
  metrics: string[];
  groupBy: 'collector' | 'portfolio' | 'date' | 'debtor';
  filters: {
    dateRange?: { start: string; end: string };
    collectors?: string[];
    portfolios?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomReportResult {
  config: CustomReportConfig;
  data: Record<string, any>[];
  summary: Record<string, number>;
  generatedAt: string;
}

// ============================================================================
// SCHEDULED REPORT
// ============================================================================

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: 'daily_collection' | 'collector_performance' | 'portfolio_health' | 'compliance' | 'custom';
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[]; // Email addresses
  format: 'pdf' | 'csv' | 'excel';
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  customConfig?: CustomReportConfig;
}

// ============================================================================
// SERVICE
// ============================================================================

export const reportsService = {
  /**
   * Get Daily Collection Report
   */
  getDailyCollectionReport: async (
    orgId: string,
    date: string, // YYYY-MM-DD
    config?: AxiosRequestConfig
  ): Promise<DailyCollectionReport> => {
    // TODO: Implement with real API
    const mockReport: DailyCollectionReport = {
      reportDate: date,
      summary: {
        totalContacts: 487,
        successfulContacts: 312,
        contactRate: 64.1,
        promisesSecured: 45,
        paymentsReceived: 28,
        totalCollected: 78450,
        activeCollectors: 12,
      },
      collectorBreakdown: Array.from({ length: 12 }, (_, i) => ({
        collectorId: `collector-${i + 1}`,
        collectorName: `Collector ${i + 1}`,
        contacts: Math.floor(Math.random() * 50) + 20,
        successfulContacts: Math.floor(Math.random() * 30) + 10,
        promises: Math.floor(Math.random() * 10),
        payments: Math.floor(Math.random() * 5),
        collected: Math.floor(Math.random() * 10000) + 2000,
      })),
      hourlyBreakdown: Array.from({ length: 10 }, (_, i) => ({
        hour: i + 8, // 8 AM to 6 PM
        contacts: Math.floor(Math.random() * 60) + 20,
        collections: Math.floor(Math.random() * 10000) + 3000,
      })),
      topPerformers: [
        { collectorId: 'c1', collectorName: 'John Smith', metric: 'Collections', value: 12500 },
        { collectorId: 'c2', collectorName: 'Jane Doe', metric: 'Contacts', value: 65 },
        { collectorId: 'c3', collectorName: 'Bob Johnson', metric: 'Promises', value: 12 },
      ],
    };
    return Promise.resolve(mockReport);
  },

  /**
   * Get Collector Performance Report
   */
  getCollectorPerformanceReport: async (
    orgId: string,
    startDate: string,
    endDate: string,
    config?: AxiosRequestConfig
  ): Promise<CollectorPerformanceReport> => {
    // TODO: Implement with real API
    const mockReport: CollectorPerformanceReport = {
      reportPeriod: { startDate, endDate },
      collectors: Array.from({ length: 12 }, (_, i) => ({
        collectorId: `collector-${i + 1}`,
        collectorName: `Collector ${i + 1}`,
        metrics: {
          totalContacts: Math.floor(Math.random() * 500) + 200,
          successfulContacts: Math.floor(Math.random() * 300) + 100,
          contactRate: Math.random() * 30 + 50,
          promisesSecured: Math.floor(Math.random() * 50) + 10,
          paymentsReceived: Math.floor(Math.random() * 30) + 5,
          totalCollected: Math.floor(Math.random() * 100000) + 50000,
          avgDailyCollections: Math.floor(Math.random() * 5000) + 2000,
          goalsMetPercentage: Math.random() * 40 + 60,
        },
        ranking: {
          overall: i + 1,
          contacts: Math.floor(Math.random() * 12) + 1,
          collections: Math.floor(Math.random() * 12) + 1,
          efficiency: Math.floor(Math.random() * 12) + 1,
        },
        trend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
      })),
      teamAverages: {
        contactRate: 65.5,
        avgDailyCollections: 3500,
        goalsMetPercentage: 78.3,
      },
    };
    return Promise.resolve(mockReport);
  },

  /**
   * Get Portfolio Health Report
   */
  getPortfolioHealthReport: async (
    orgId: string,
    config?: AxiosRequestConfig
  ): Promise<PortfolioHealthReport> => {
    // TODO: Implement with real API
    const mockReport: PortfolioHealthReport = {
      portfolios: Array.from({ length: 5 }, (_, i) => ({
        portfolioId: `portfolio-${i + 1}`,
        portfolioName: `Portfolio ${String.fromCharCode(65 + i)}`,
        summary: {
          totalAccounts: Math.floor(Math.random() * 500) + 100,
          totalDebt: Math.floor(Math.random() * 1000000) + 500000,
          collected: Math.floor(Math.random() * 300000) + 100000,
          recoveryRate: Math.random() * 30 + 15,
          avgAccountAge: Math.floor(Math.random() * 180) + 60,
        },
        agingAnalysis: {
          '0-30': { count: Math.floor(Math.random() * 50) + 10, amount: Math.floor(Math.random() * 50000) + 20000 },
          '31-60': { count: Math.floor(Math.random() * 60) + 20, amount: Math.floor(Math.random() * 80000) + 40000 },
          '61-90': { count: Math.floor(Math.random() * 70) + 30, amount: Math.floor(Math.random() * 100000) + 60000 },
          '91-180': { count: Math.floor(Math.random() * 80) + 40, amount: Math.floor(Math.random() * 150000) + 80000 },
          '180+': { count: Math.floor(Math.random() * 100) + 50, amount: Math.floor(Math.random() * 200000) + 100000 },
        },
        riskAnalysis: {
          lowRisk: { count: Math.floor(Math.random() * 100) + 50, amount: Math.floor(Math.random() * 200000) + 100000 },
          mediumRisk: { count: Math.floor(Math.random() * 150) + 75, amount: Math.floor(Math.random() * 400000) + 200000 },
          highRisk: { count: Math.floor(Math.random() * 50) + 25, amount: Math.floor(Math.random() * 300000) + 150000 },
        },
        performance: {
          contactsMade: Math.floor(Math.random() * 500) + 200,
          promisesSecured: Math.floor(Math.random() * 50) + 20,
          paymentsReceived: Math.floor(Math.random() * 30) + 10,
          activeCollectors: Math.floor(Math.random() * 8) + 3,
        },
        healthScore: Math.floor(Math.random() * 40) + 60,
      })),
    };
    return Promise.resolve(mockReport);
  },

  /**
   * Get Compliance Report
   */
  getComplianceReport: async (
    orgId: string,
    startDate: string,
    endDate: string,
    config?: AxiosRequestConfig
  ): Promise<ComplianceReport> => {
    // TODO: Implement with real API
    const mockReport: ComplianceReport = {
      reportPeriod: { startDate, endDate },
      summary: {
        totalAlerts: 23,
        criticalAlerts: 3,
        resolvedAlerts: 18,
        pendingAlerts: 5,
        avgResolutionTime: 4.5,
      },
      alertsByType: [
        { type: 'fdcpa_violation', count: 3, severity: 'critical' },
        { type: 'time_restriction', count: 8, severity: 'warning' },
        { type: 'frequency_violation', count: 5, severity: 'warning' },
        { type: 'cease_desist', count: 2, severity: 'critical' },
        { type: 'dispute', count: 3, severity: 'info' },
        { type: 'bankruptcy', count: 2, severity: 'critical' },
      ],
      collectorCompliance: Array.from({ length: 12 }, (_, i) => ({
        collectorId: `collector-${i + 1}`,
        collectorName: `Collector ${i + 1}`,
        alertCount: Math.floor(Math.random() * 5),
        criticalCount: Math.floor(Math.random() * 2),
        complianceScore: Math.floor(Math.random() * 30) + 70,
      })),
      recentIncidents: Array.from({ length: 5 }, (_, i) => ({
        id: `incident-${i + 1}`,
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        type: 'FDCPA Violation',
        collectorId: `collector-${Math.floor(Math.random() * 12) + 1}`,
        collectorName: `Collector ${Math.floor(Math.random() * 12) + 1}`,
        debtorId: `debtor-${i + 1}`,
        description: 'Contact made outside permitted hours',
        status: ['pending', 'investigating', 'resolved'][Math.floor(Math.random() * 3)] as any,
      })),
    };
    return Promise.resolve(mockReport);
  },

  /**
   * Generate Custom Report
   */
  generateCustomReport: async (
    orgId: string,
    config: CustomReportConfig,
    requestConfig?: AxiosRequestConfig
  ): Promise<CustomReportResult> => {
    // TODO: Implement with real API
    return Promise.resolve({
      config,
      data: [],
      summary: {},
      generatedAt: new Date().toISOString(),
    });
  },

  /**
   * Export Report
   */
  exportReport: async (
    reportType: string,
    reportData: any,
    format: 'pdf' | 'csv' | 'excel'
  ): Promise<Blob> => {
    // TODO: Implement actual export logic
    // This would typically call a backend endpoint that generates the file
    const mockBlob = new Blob(['Mock report data'], { type: 'text/plain' });
    return Promise.resolve(mockBlob);
  },

  /**
   * Get Scheduled Reports
   */
  getScheduledReports: async (
    orgId: string,
    config?: AxiosRequestConfig
  ): Promise<ScheduledReport[]> => {
    // TODO: Implement with real API
    const mockReports: ScheduledReport[] = [
      {
        id: '1',
        name: 'Daily EOD Report',
        reportType: 'daily_collection',
        schedule: 'daily',
        recipients: ['manager@example.com'],
        format: 'pdf',
        enabled: true,
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        nextRun: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        name: 'Weekly Performance Review',
        reportType: 'collector_performance',
        schedule: 'weekly',
        recipients: ['manager@example.com', 'director@example.com'],
        format: 'excel',
        enabled: true,
        nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    return Promise.resolve(mockReports);
  },

  /**
   * Create Scheduled Report
   */
  createScheduledReport: async (
    orgId: string,
    report: Omit<ScheduledReport, 'id' | 'lastRun' | 'nextRun'>,
    config?: AxiosRequestConfig
  ): Promise<ScheduledReport> => {
    // TODO: Implement with real API
    const newReport: ScheduledReport = {
      id: `report-${Date.now()}`,
      ...report,
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    return Promise.resolve(newReport);
  },

  /**
   * Delete Scheduled Report
   */
  deleteScheduledReport: async (
    orgId: string,
    reportId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    // TODO: Implement with real API
    return Promise.resolve();
  },
};
