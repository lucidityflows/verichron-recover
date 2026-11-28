import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  OrchestrationEventEnvelope,
} from '@verichron/events';
import {
  AnalyticsDebtorFocusRequestedDto,
  AnalyticsDebtorFocusCompletedDto,
} from './dto';
import type { EventOrchestratorConfig } from '../../../event-orchestrator.module';
import { BaseOrchestrator } from '../../../base-orchestrator.abstract';
import type { IDebtorFocusView } from '@verichron/contracts';

/**
 * ========================================================================
 * Debtor Focus Analytics Orchestrator
 * ========================================================================
 *
 * REFACTORED:
 * Extends BaseOrchestrator for standardized validation, error handling, and HMAC signing.
 */
@Injectable()
export class AnalyticsDebtorFocusOrchestrator extends BaseOrchestrator<
  AnalyticsDebtorFocusRequestedDto,
  AnalyticsDebtorFocusCompletedDto
> {
  protected readonly logger = new Logger(AnalyticsDebtorFocusOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsDebtorFocusRequestedDto;
  protected readonly responseDtoClass = AnalyticsDebtorFocusCompletedDto;
  protected readonly serviceName = 'api-organizations';
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ORGANIZATIONS';

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName:
      'event-orchestrator.analytics.debtor-focus-requested.sub',
    eventType: EVENT_TYPES.ANALYTICS_DEBTOR_FOCUS_REQUESTED,
    dto: AnalyticsDebtorFocusRequestedDto,
  })
  async handleDebtorFocusRequested(
    envelope: OrchestrationEventEnvelope<AnalyticsDebtorFocusRequestedDto>,
  ) {
    await this.executeOrchestration(
      envelope,
      EVENT_TYPES.ANALYTICS_DEBTOR_FOCUS_COMPLETED,
      async (payload) => this.processRequest(payload),
    );
  }

  private async processRequest(
    payload: AnalyticsDebtorFocusRequestedDto,
  ): Promise<AnalyticsDebtorFocusCompletedDto> {
    const { organizationId, debtorProfileId, correlationId } = payload;
    
    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!debtServiceUrl || !debtorServiceUrl) {
      throw new Error('Required service endpoints are not configured.');
    }

    const [profileData, debtsData, transactionsData, communicationsData] = await Promise.all([
      this.fetchDebtorProfile(debtorServiceUrl, organizationId, debtorProfileId),
      this.fetchDebtorDebts(debtServiceUrl, organizationId, debtorProfileId),
      transactionServiceUrl
        ? this.fetchDebtorTransactions(transactionServiceUrl, organizationId, debtorProfileId)
        : Promise.resolve({ transactions: [], paymentPlans: [] }),
      communicationServiceUrl
        ? this.fetchDebtorCommunications(communicationServiceUrl, organizationId, debtorProfileId)
        : Promise.resolve({ communications: [] }),
    ]);

    const debtorFocusView: IDebtorFocusView = this.aggregateDebtorFocusView(
      profileData,
      debtsData,
      transactionsData,
      communicationsData,
    );

    return {
      organizationId,
      debtorProfileId,
      correlationId,
      debtorFocusView,
    };
  }

  private async fetchDebtorProfile(baseUrl: string, organizationId: string, debtorProfileId: string): Promise<any> {
    return this.fetchInternal(baseUrl, `/internal/debtors/analytics/debtor-focus/${organizationId}/${debtorProfileId}`);
  }

  private async fetchDebtorDebts(baseUrl: string, organizationId: string, debtorProfileId: string): Promise<any> {
    return this.fetchInternal(baseUrl, `/internal/debts/analytics/debtor-focus/${organizationId}/${debtorProfileId}`);
  }

  private async fetchDebtorTransactions(baseUrl: string, organizationId: string, debtorProfileId: string): Promise<any> {
    return this.fetchInternal(baseUrl, `/internal/transactions/analytics/debtor-focus/${organizationId}/${debtorProfileId}`);
  }

  private async fetchDebtorCommunications(baseUrl: string, organizationId: string, debtorProfileId: string): Promise<any> {
    return this.fetchInternal(baseUrl, `/internal/communications/analytics/debtor-focus/${organizationId}/${debtorProfileId}`);
  }

  private aggregateDebtorFocusView(profileData: any, debtsData: any, transactionsData: any, communicationsData: any): IDebtorFocusView {
    const debtor = {
      id: profileData?.debtorProfileId || '',
      firstName: profileData?.firstName || '',
      lastName: profileData?.lastName || '',
      email: profileData?.primaryEmail || null,
      phone: profileData?.primaryPhone || null,
      address: profileData?.primaryAddress || null,
      dateOfBirth: profileData?.dateOfBirth || null,
      ssnLast4: profileData?.ssnLast4 || null,
      tags: profileData?.tags || [],
      notes: profileData?.notes || null,
      preferredContactMethod: profileData?.preferredContactMethod || 'EMAIL',
      preferredContactTime: profileData?.preferredContactTime || null,
      doNotContact: profileData?.doNotContact || false,
      bankruptcyStatus: profileData?.bankruptcyStatus || 'NONE',
      deceasedDate: profileData?.deceasedDate || null,
      optOutStatus: profileData?.optOutStatus || 'OPTED_IN',
      attorneyInfo: profileData?.attorneyInfo || null,
    };

    const debts = debtsData?.debts || [];
    const paymentHistory = transactionsData?.paymentHistory || [];
    const timeline: any[] = [];

    if (communicationsData?.communications) {
      communicationsData.communications.forEach((comm: any) => {
        timeline.push({ id: comm.id, type: comm.type, date: comm.date, description: comm.description || comm.subject, metadata: comm });
      });
    }

    if (transactionsData?.transactions) {
      transactionsData.transactions.forEach((txn: any) => {
        timeline.push({ id: txn.transactionId || txn.id, type: 'PAYMENT', date: txn.transactionDate || txn.date, description: `Payment of $${txn.amount}`, metadata: txn });
      });
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalDebt = debtsData?.totalPrincipal || 0;
    const totalBalance = debtsData?.totalBalance || 0;
    const totalPaid = totalDebt - totalBalance;
    const activeDebtsCount = debtsData?.activeDebtCount || 0;
    const paidDebtsCount = debts.filter((d: any) => d.status === 'PAID_IN_FULL' || d.status === 'SETTLED').length;

    let oldestDebtDate: Date | null = null;
    if (debts.length > 0) {
      const delinquentDates = debts.map((d: any) => d.delinquentDate).filter((date: any) => date != null);
      if (delinquentDates.length > 0) oldestDebtDate = new Date(delinquentDates.sort()[0]);
    }

    let daysSinceLastContact: number | null = null;
    if (timeline.length > 0) {
      const lastContactDate = new Date(timeline[0].date);
      daysSinceLastContact = Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    let daysSinceLastPayment: number | null = null;
    const paymentEvents = timeline.filter((event) => event.type === 'PAYMENT');
    if (paymentEvents.length > 0 && paymentEvents[0].date) {
      const lastPaymentDate = new Date(paymentEvents[0].date);
      daysSinceLastPayment = Math.floor((Date.now() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const availableActions: string[] = [];
    if (!debtor.doNotContact) {
      if (debtor.phone) availableActions.push('CALL');
      if (debtor.email) availableActions.push('EMAIL');
      availableActions.push('SMS');
    }
    availableActions.push('NOTE', 'SCHEDULE_FOLLOW_UP');
    if (activeDebtsCount > 0) availableActions.push('OFFER_PAYMENT_PLAN', 'RECORD_PAYMENT');

    const fdcpaFlags = {
      isDeceased: !!debtor.deceasedDate,
      isBankrupt: debtor.bankruptcyStatus !== 'NONE' && debtor.bankruptcyStatus !== null,
      hasCeaseAndDesist: debtor.doNotContact,
      hasDispute: debtsData?.debts?.some((d: any) => d.isDisputed === true) || false,
      isRepresented: !!debtor.attorneyInfo,
    };

    return {
      debtor, debts, timeline, paymentHistory, documents: [], notes: [], availableActions,
      summary: { totalDebt, totalPaid, remainingBalance: totalBalance, oldestDebtDate, daysSinceLastContact, daysSinceLastPayment, activeDebtsCount, paidDebtsCount },
      fdcpaFlags,
    };
  }
}