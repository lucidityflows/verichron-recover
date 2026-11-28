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

import { type TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceUnavailableException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Organization } from '../profiles/entities';
import { OrganizationNotFoundException } from '../core/exceptions';
import { EventOrchestratorClient } from '@verichron/event-orchestrator';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { type DashboardSummaryResponseDto } from './dto';
import { AnalyticsDashboardSummaryRequestedDto } from '../events/event-dto/analytics/analytics-dashboard-summary-requested.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let organizationRepository: any;
  let orchestratorClient: any;

  const mockOrganization = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Organization',
    displayName: 'Test Org',
    organizationType: 'AGENCY',
    status: 'ACTIVE',
  };

  const mockDashboardSummary: DashboardSummaryResponseDto = {
    totalPortfolios: 5,
    totalDebts: 100,
    totalDebtors: 80,
    totalInvested: [{ year: 2024, quarter: 'Q4', value: 100000 }],
    totalCollected: [{ year: 2024, quarter: 'Q4', value: 25000 }],
    totalOutstanding: 75000,
    overallRecoveryRate: 25,
    statusCounts: { active: 60, paid: 20, settled: 10, defaulted: 5, paymentPlan: 5 },
    todayCollections: 5000,
    todayPaymentPlans: 2,
    todayContacts: 10,
    yesterdayCollections: 4500,
    yesterdayPaymentPlans: 1,
    yesterdayContacts: 8,
    topPortfolios: [{ id: 'p1', name: 'Portfolio 1', recoveryRate: 65.5, totalCollected: 50000 }],
    generatedAt: new Date(),
  };

  beforeEach(async () => {
    organizationRepository = {
      findOne: jest.fn(),
    };

    orchestratorClient = {
      request: jest.fn(),
    };

    const module: TestingModule = await createSilentTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
        {
          provide: EventOrchestratorClient,
          useValue: orchestratorClient,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardSummary', () => {
    it('should successfully request and return a dashboard summary', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      orchestratorClient.request.mockResolvedValue(mockDashboardSummary);

      const result = await service.getDashboardSummary(mockOrganization.id);

      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
      expect(orchestratorClient.request).toHaveBeenCalledWith(
        EVENT_TOPICS.ORGANIZATIONS,
        EVENT_TYPES.ANALYTICS_DASHBOARD_SUMMARY_REQUESTED,
        expect.objectContaining({
          organizationId: mockOrganization.id,
        }),
        AnalyticsDashboardSummaryRequestedDto,
      );
      expect(result).toEqual(mockDashboardSummary);
    });

    it('should throw OrganizationNotFoundException if organization does not exist', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getDashboardSummary('nonexistent-id'),
      ).rejects.toThrow(OrganizationNotFoundException);

      expect(orchestratorClient.request).not.toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException if orchestration times out or fails', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      orchestratorClient.request.mockRejectedValue(new ServiceUnavailableException('Orchestration failed'));

      await expect(
        service.getDashboardSummary(mockOrganization.id),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(orchestratorClient.request).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException if orchestration returns null/undefined summary', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      orchestratorClient.request.mockResolvedValue(null);

      await expect(
        service.getDashboardSummary(mockOrganization.id),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(orchestratorClient.request).toHaveBeenCalled();
    });
  });

  describe('Other Analytics Methods', () => {
    it('getRecoveryTrends should throw ServiceUnavailableException', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      await expect(service.getRecoveryTrends(mockOrganization.id, {} as any)).rejects.toThrow(ServiceUnavailableException);
    });

    it('getPortfolioPerformance should throw ServiceUnavailableException', async () => {
        organizationRepository.findOne.mockResolvedValue(mockOrganization);
        await expect(service.getPortfolioPerformance(mockOrganization.id, {} as any)).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
