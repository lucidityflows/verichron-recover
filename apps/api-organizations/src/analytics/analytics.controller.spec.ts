// Mock uuid before importing anything else
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
  validate: jest.fn(() => true),
}));

// Mock event-subscriber decorator
jest.mock('@verichron/event-subscriber', () => ({
  EventSubscription: jest.fn(() => jest.fn()),
  EventSubscriber: jest.fn(),
}));

// Mock entities before importing anything else
jest.mock('../profiles/entities', () => ({
  Organization: class Organization {},
  OrganizationAddress: class OrganizationAddress {},
  OrganizationEmail: class OrganizationEmail {},
  OrganizationPhoneNumber: class OrganizationPhoneNumber {},
}));

import { type TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '@verichron/auth';
import { TrendGranularity } from '@verichron/enums';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';

  const mockAnalyticsService = {
    getDashboardSummary: jest.fn(),
    getRecoveryTrends: jest.fn(),
    getPortfolioPerformance: jest.fn(),
    getDebtAgeGeographic: jest.fn(),
    getCreditorGeographic: jest.fn(),
    getDebtorGeographic: jest.fn(),
    getDefaultRiskGeographic: jest.fn(),
    getLikelihoodToPayGeographic: jest.fn(),
    getPaymentPlanGeographic: jest.fn(),
    getResponsivenessGeographic: jest.fn(),
    getCombinedGeographic: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // Dashboard Summary Tests
  // ==========================================================================

  describe('getDashboardSummary', () => {
    it('should return dashboard summary', async () => {
      const mockResponse = {
        totalDebts: 1500,
        totalDebtValue: 2500000,
        totalRecovered: 750000,
        overallRecoveryRate: 30,
        activeDebtors: 850,
        avgDebtAge: 180,
        outstandingBalance: 1750000,
      };

      mockAnalyticsService.getDashboardSummary.mockResolvedValue(mockResponse);

      const result = await controller.getDashboardSummary(mockOrgId);

      expect(service.getDashboardSummary).toHaveBeenCalledWith(mockOrgId, undefined);
      expect(service.getDashboardSummary).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.totalDebts).toBe(1500);
      expect(result.overallRecoveryRate).toBe(30);
    });
  });

  // ==========================================================================
  // Recovery Trends Tests
  // ==========================================================================

  describe('getRecoveryTrends', () => {
    it('should return recovery trends with query parameters', async () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        granularity: TrendGranularity.MONTHLY,
      };

      const mockResponse = {
        trends: [
          {
            period: '2024-01',
            recoveryRate: 28,
            totalRecovered: 50000,
            totalDebts: 100,
          },
          {
            period: '2024-02',
            recoveryRate: 32,
            totalRecovered: 60000,
            totalDebts: 110,
          },
        ],
        avgRecoveryRate: 30,
        totalRecovered: 110000,
        totalPeriods: 2,
      };

      mockAnalyticsService.getRecoveryTrends.mockResolvedValue(mockResponse);

      const result = await controller.getRecoveryTrends(mockOrgId, query);

      expect(service.getRecoveryTrends).toHaveBeenCalledWith(mockOrgId, query);
      expect(service.getRecoveryTrends).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.trends).toHaveLength(2);
      expect(result.avgRecoveryRate).toBe(30);
    });

    it('should handle different granularity options', async () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        granularity: TrendGranularity.DAILY,
      };

      const mockResponse = {
        trends: [],
        summary: {
          avgRecoveryRate: 0,
          totalRecovered: 0,
          totalPeriods: 0,
        },
      };

      mockAnalyticsService.getRecoveryTrends.mockResolvedValue(mockResponse);

      await controller.getRecoveryTrends(mockOrgId, query);

      expect(service.getRecoveryTrends).toHaveBeenCalledWith(mockOrgId, query);
      expect(service.getRecoveryTrends).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Portfolio Performance Tests
  // ==========================================================================

  describe('getPortfolioPerformance', () => {
    it('should return portfolio performance metrics', async () => {
      const mockResponse = {
        orgId: mockOrgId,
        totalPortfolios: 2,
        portfolios: [
          { portfolioId: 'p1', portfolioName: 'Portfolio 1', principalValue: 2000000, paymentsCollected: 500000, recoveryRate: 25, accountCount: 100, activePaymentPlans: 20, avgAccountBalance: 20000, acquisitionDate: new Date(), daysSinceAcquisition: 100 },
          { portfolioId: 'p2', portfolioName: 'Portfolio 2', principalValue: 3000000, paymentsCollected: 1000000, recoveryRate: 33.3, accountCount: 150, activePaymentPlans: 30, avgAccountBalance: 20000, acquisitionDate: new Date(), daysSinceAcquisition: 150 },
        ],
        overallRecoveryRate: 30,
        totalInvested: '2500000',
        totalDebtValue: 5000000,
        totalPaymentsCollected: 1500000,
        generatedAt: new Date(),
      };

      mockAnalyticsService.getPortfolioPerformance.mockResolvedValue(
        mockResponse,
      );

      const mockQuery = { page: 1, pageSize: 20 };
      const result = await controller.getPortfolioPerformance(mockOrgId, mockQuery);

      expect(service.getPortfolioPerformance).toHaveBeenCalledWith(mockOrgId, mockQuery);
      expect(service.getPortfolioPerformance).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.totalInvested).toBeDefined();
      expect(result.portfolios).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Geographic Analytics Tests
  // ==========================================================================

  describe('getDebtAgeGeographic', () => {
    it('should return debt age geographic analytics', async () => {
      const query = {
        states: ['CA', 'NY'],
      };

      const mockResponse = {
        type: 'debt_age',
        states: [
          {
            state: 'CA',
            avgAge: 180,
            ageDistribution: [
              { bucket: '0-90', count: 100, percentage: 40 },
              { bucket: '91-180', count: 150, percentage: 60 },
            ],
          },
          {
            state: 'NY',
            avgAge: 150,
            ageDistribution: [
              { bucket: '0-90', count: 200, percentage: 50 },
              { bucket: '91-180', count: 200, percentage: 50 },
            ],
          },
        ],
      };

      mockAnalyticsService.getDebtAgeGeographic.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getDebtAgeGeographic(mockOrgId, query);

      expect(service.getDebtAgeGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getDebtAgeGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.states).toHaveLength(2);
    });
  });

  describe('getCreditorGeographic', () => {
    it('should return creditor geographic analytics', async () => {
      const query = {
        states: ['TX'],
      };

      const mockResponse = {
        stateBreakdown: [
          {
            state: 'TX',
            creditorCount: 25,
            topCreditors: [
              { creditorId: 'cred-1', name: 'Bank A', debtCount: 100 },
              { creditorId: 'cred-2', name: 'Bank B', debtCount: 75 },
            ],
          },
        ],
      };

      mockAnalyticsService.getCreditorGeographic.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getCreditorGeographic(mockOrgId, query);

      expect(service.getCreditorGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getCreditorGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDebtorGeographic', () => {
    it('should return debtor geographic analytics', async () => {
      const query = {
        states: ['FL', 'GA'],
      };

      const mockResponse = {
        type: 'debtors',
        totalDebtors: 800,
        totalDebtValue: 1600000,
        states: [
          {
            state: 'FL',
            debtorCount: 500,
            totalDebtValue: 1000000,
            avgDebtPerDebtor: 2000,
            recoveryRate: 28,
          },
          {
            state: 'GA',
            debtorCount: 300,
            totalDebtValue: 600000,
            avgDebtPerDebtor: 2000,
            recoveryRate: 32,
          },
        ],
      };

      mockAnalyticsService.getDebtorGeographic.mockResolvedValue(mockResponse);

      const result = await controller.getDebtorGeographic(mockOrgId, query);

      expect(service.getDebtorGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getDebtorGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.states).toHaveLength(2);
    });
  });

  describe('getDefaultRiskGeographic', () => {
    it('should return default risk geographic analytics', async () => {
      const query = {
        states: ['CA'],
      };

      const mockResponse = {
        stateBreakdown: [
          {
            state: 'CA',
            avgDefaultRiskScore: 65,
            riskDistribution: [
              { riskBucket: 'low', count: 100, percentage: 20 },
              { riskBucket: 'medium', count: 250, percentage: 50 },
              { riskBucket: 'high', count: 150, percentage: 30 },
            ],
            projectedLoss: 250000,
          },
        ],
      };

      mockAnalyticsService.getDefaultRiskGeographic.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getDefaultRiskGeographic(
        mockOrgId,
        query,
      );

      expect(service.getDefaultRiskGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getDefaultRiskGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLikelihoodToPayGeographic', () => {
    it('should return likelihood to pay geographic analytics', async () => {
      const query = {
        states: ['NY'],
      };

      const mockResponse = {
        stateBreakdown: [
          {
            state: 'NY',
            avgLikelihoodScore: 72,
            scoreDistribution: [
              { scoreBucket: '0-40', count: 50, percentage: 10 },
              { scoreBucket: '41-70', count: 200, percentage: 40 },
              { scoreBucket: '71-100', count: 250, percentage: 50 },
            ],
            projectedRecovery: 500000,
          },
        ],
      };

      mockAnalyticsService.getLikelihoodToPayGeographic.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getLikelihoodToPayGeographic(
        mockOrgId,
        query,
      );

      expect(service.getLikelihoodToPayGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getLikelihoodToPayGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPaymentPlanGeographic', () => {
    it('should return payment plan geographic analytics', async () => {
      const query = {
        states: ['TX', 'CA'],
      };

      const mockResponse = {
        type: 'payment-plans',
        totalDebtorsWithPlans: 800,
        activePlans: 500,
        completedPlans: 300,
        totalPlans: 800,
        states: [
          {
            state: 'TX',
            activePaymentPlanCount: 150,
            activePaymentPlanDebtValue: 750000,
            averageMonthlyPayment: 150,
            completedPaymentPlanCount: 100,
            completedPaymentPlanTotalRecovered: 500000,
            averageCompletionTimeMonths: 12,
            paymentPlanSuccessRate: 0.75,
            averageComplianceRate: 0.85,
          },
          {
            state: 'CA',
            activePaymentPlanCount: 200,
            activePaymentPlanDebtValue: 1000000,
            averageMonthlyPayment: 160,
            completedPaymentPlanCount: 120,
            completedPaymentPlanTotalRecovered: 600000,
            averageCompletionTimeMonths: 13,
            paymentPlanSuccessRate: 0.80,
            averageComplianceRate: 0.88,
          },
        ],
      };

      mockAnalyticsService.getPaymentPlanGeographic.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getPaymentPlanGeographic(
        mockOrgId,
        query,
      );

      expect(service.getPaymentPlanGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getPaymentPlanGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.states).toHaveLength(2);
    });
  });

  describe('getResponsivenessGeographic', () => {
    it('should return responsiveness geographic analytics', async () => {
      const query = {
        states: ['FL'],
      };

      const mockResponse = {
        stateBreakdown: [
          {
            state: 'FL',
            avgResponseTime: 48,
            contactAttempts: 3.5,
            responseRate: 65,
            preferredMethods: [
              { method: 'email', percentage: 45 },
              { method: 'phone', percentage: 35 },
              { method: 'sms', percentage: 20 },
            ],
          },
        ],
      };

      mockAnalyticsService.getResponsivenessGeographic.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getResponsivenessGeographic(
        mockOrgId,
        query,
      );

      expect(service.getResponsivenessGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getResponsivenessGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCombinedGeographic', () => {
    it('should return combined geographic analytics', async () => {
      const query = {
        states: ['CA', 'NY', 'TX'],
      };

      const mockResponse = {
        debtors: {
          type: 'debtors',
          totalDebtors: 1250,
          totalDebtValue: 2500000,
          states: [
            {
              state: 'CA',
              debtorCount: 500,
              totalDebtValue: 1000000,
              averageDebtValue: 2000,
              activeDebts: 400,
              paidDebts: 50,
              defaultedDebts: 50,
              recoveryRate: 0.30,
            },
            {
              state: 'NY',
              debtorCount: 400,
              totalDebtValue: 800000,
              averageDebtValue: 2000,
              activeDebts: 300,
              paidDebts: 50,
              defaultedDebts: 50,
              recoveryRate: 0.32,
            },
            {
              state: 'TX',
              debtorCount: 350,
              totalDebtValue: 700000,
              averageDebtValue: 2000,
              activeDebts: 250,
              paidDebts: 50,
              defaultedDebts: 50,
              recoveryRate: 0.28,
            },
          ],
        },
        creditors: {
          type: 'creditors',
          totalCreditors: 100,
          totalDebtValue: 1500000,
          states: [
            {
              state: 'CA',
              creditorCount: 50,
              totalDebtValue: 1000000,
              averageDebtValue: 20000,
              topCreditors: [],
            },
            {
              state: 'NY',
              creditorCount: 45,
              totalDebtValue: 800000,
              averageDebtValue: 17777,
              topCreditors: [],
            },
            {
              state: 'TX',
              creditorCount: 40,
              totalDebtValue: 700000,
              averageDebtValue: 17500,
              topCreditors: [],
            },
          ],
        },
        flows: [
          {
            originState: 'CA',
            destinationState: 'NY',
            debtCount: 50,
            debtValue: 100000,
          },
          {
            originState: 'NY',
            destinationState: 'CA',
            debtCount: 40,
            debtValue: 80000,
          },
        ],
      };

      mockAnalyticsService.getCombinedGeographic.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getCombinedGeographic(mockOrgId, query);

      expect(service.getCombinedGeographic).toHaveBeenCalledWith(
        mockOrgId,
        query,
      );
      expect(service.getCombinedGeographic).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
      expect(result.debtors.states).toHaveLength(3);
      expect(result.flows).toHaveLength(2);
    });
  });
});
