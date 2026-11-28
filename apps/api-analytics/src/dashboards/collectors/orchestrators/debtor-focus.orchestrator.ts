import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscription } from '@verichron/event-subscriber';
import { EVENT_SOURCES, EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import type { OrchestrationEventEnvelope } from '@verichron/events';
import type {
  IDebtorFocusView,
  IDebtorFocusDebtor,
  IDebtorFocusDebt,
  IDebtorFocusTimelineEvent,
  IDebtorFocusPaymentHistory,
  IDebtorFocusDocument,
  IDebtorFocusNote,
  IDebtorFocusSummary,
  IFdcpaFlags,
  IDebtorAddress,
  IDebtorEmail,
  IDebtorPhone,
} from '@verichron/contracts';
import type { EventOrchestratorConfig } from '@verichron/event-orchestrator';
import { BaseOrchestrator } from '@verichron/event-orchestrator';
import {
  PreferredContactMethod,
  OptOutStatus,
  TimelineEventType,
  AddressCategory,
  EmailCategory,
  EmailBounceStatus,
  PhoneCategory,
} from '@verichron/enums';
import { AnalyticsDebtorFocusRequestedDto, AnalyticsDebtorFocusCompletedDto } from '../../../events/event-dto/analytics';
import { CacheService } from '../../../core/cache';
import { CircuitBreakerService } from '../../../core/circuit-breaker';

/**
 * Debtor Focus Analytics Orchestrator (api-analytics)
 *
 * Comprehensive debtor profile view for collectors.
 * Shows debtor profile, debts, transactions, communications.
 *
 * Cache TTL: 1 minute (real-time collector needs)
 */
@Injectable()
export class DebtorFocusOrchestrator extends BaseOrchestrator<
  AnalyticsDebtorFocusRequestedDto,
  AnalyticsDebtorFocusCompletedDto
> {
  protected readonly logger = new Logger(DebtorFocusOrchestrator.name);
  protected readonly requestDtoClass = AnalyticsDebtorFocusRequestedDto;
  protected readonly responseDtoClass = AnalyticsDebtorFocusCompletedDto;
  protected readonly serviceName = EVENT_SOURCES.ANALYTICS;
  protected readonly serviceKeyEnvVar = 'SERVICE_KEY_ANALYTICS';

  private readonly CACHE_TTL = 60; // 1 minute

  constructor(
    @Inject('EVENT_ORCHESTRATOR_CONFIG')
    config: EventOrchestratorConfig,
    httpService: HttpService,
    eventPublisher: EventPublisher,
    private readonly cacheService: CacheService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super(config, httpService, eventPublisher);
  }

  @EventSubscription({
    topicName: EVENT_TOPICS.ORGANIZATIONS,
    subscriptionName: 'api-analytics.debtor-focus-requested.sub',
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

    const cacheKey = this.cacheService.buildKey('analytics:debtor_focus', {
      organizationId,
      debtorProfileId,
    });

    const cached = await this.cacheService.get<IDebtorFocusView>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT for debtor focus (debtor: ${debtorProfileId})`);
      return { organizationId, debtorProfileId, correlationId, debtorFocusView: cached };
    }

    this.logger.debug(`Cache MISS for debtor focus (debtor: ${debtorProfileId})`);

    const debtServiceUrl = this.config.serviceEndpoints['api-debts'];
    const debtorServiceUrl = this.config.serviceEndpoints['api-debtors'];
    const transactionServiceUrl = this.config.serviceEndpoints['api-transactions'];
    const communicationServiceUrl = this.config.serviceEndpoints['api-communications'];

    if (!debtServiceUrl || !debtorServiceUrl) {
      throw new Error('Required service endpoints are not configured');
    }

    // Fetch all data in parallel with circuit breaker
    const [profileData, debtsData, transactionsData, communicationsData] = await Promise.all([
      this.circuitBreaker.execute('api-debtors', () =>
        this.fetchInternal(
          debtorServiceUrl,
          `/internal/debtors/analytics/debtor-focus/${organizationId}/${debtorProfileId}`,
        ),
      ),
      this.circuitBreaker.execute('api-debts', () =>
        this.fetchInternal(
          debtServiceUrl,
          `/internal/debts/analytics/debtor-focus/${organizationId}/${debtorProfileId}`,
        ),
      ),
      transactionServiceUrl
        ? this.circuitBreaker
            .execute('api-transactions', () =>
              this.fetchInternal(
                transactionServiceUrl,
                `/internal/transactions/analytics/debtor-focus/${organizationId}/${debtorProfileId}`,
              ),
            )
            .catch(() => ({ transactions: [], paymentPlans: [] }))
        : Promise.resolve({ transactions: [], paymentPlans: [] }),
      communicationServiceUrl
        ? this.circuitBreaker
            .execute('api-communications', () =>
              this.fetchInternal(
                communicationServiceUrl,
                `/internal/communications/analytics/debtor-focus/${organizationId}/${debtorProfileId}`,
              ),
            )
            .catch(() => ({ communications: [] }))
        : Promise.resolve({ communications: [] }),
    ]);

    // Transform and build IDebtorFocusView
    const debtor = this.transformDebtor(profileData);
    const debts: IDebtorFocusDebt[] = debtsData.debts || [];
    const timeline = this.buildTimeline(transactionsData, communicationsData);
    const paymentHistory = this.buildPaymentHistory(transactionsData);
    const summary = this.buildSummary(debtsData, transactionsData);
    const fdcpaFlags = this.buildFdcpaFlags(profileData, debts);

    const debtorFocusView: IDebtorFocusView = {
      debtor,
      debts,
      timeline,
      paymentHistory,
      documents: [],
      notes: [],
      availableActions: this.getAvailableActions(debtor, fdcpaFlags),
      summary,
      fdcpaFlags,
    };

    // Cache result
    await this.cacheService.set(cacheKey, debtorFocusView, this.CACHE_TTL);

    return { organizationId, debtorProfileId, correlationId, debtorFocusView };
  }

  /**
   * Transform profile data from api-debtors into IDebtorFocusDebtor
   */
  private transformDebtor(profileData: any): IDebtorFocusDebtor {
    // Find primary or first contact info
    const primaryAddress = profileData.addresses?.find((a: any) => a.isPrimary) || profileData.addresses?.[0];
    const primaryEmail = profileData.emails?.find((e: any) => e.isPrimary) || profileData.emails?.[0];
    const primaryPhone = profileData.phones?.find((p: any) => p.isPrimary) || profileData.phones?.[0];

    return {
      id: profileData.debtorProfileId,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: primaryEmail ? this.transformEmail(primaryEmail) : null,
      phone: primaryPhone ? this.transformPhone(primaryPhone) : null,
      address: primaryAddress ? this.transformAddress(primaryAddress, profileData.debtorProfileId) : null,
      dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null,
      ssnLast4: profileData.ssnLast4 || null,
      tags: profileData.tags || [],
      notes: profileData.notes || null,
      preferredContactMethod: profileData.preferredContactMethod || PreferredContactMethod.PHONE,
      preferredContactTime: profileData.preferredContactTime || null,
      doNotContact: profileData.doNotContact || false,
      bankruptcyStatus: profileData.bankruptcyStatus || null,
      deceasedDate: profileData.deceasedDate ? new Date(profileData.deceasedDate) : null,
      optOutStatus: profileData.optOutStatus || OptOutStatus.NONE,
      attorneyInfo: profileData.attorneyInfo || null,
    };
  }

  private transformAddress(address: any, debtorProfileId: string): IDebtorAddress {
    return {
      id: address.addressId,
      debtorProfileId,
      addressCategory: address.category || AddressCategory.RESIDENCE_PRIMARY,
      street1: address.street1,
      street2: address.street2 || undefined,
      street3: undefined,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country || 'USA',
      latitude: undefined,
      longitude: undefined,
      isVerified: address.isVerified || false,
      verifiedAt: undefined,
      isCurrent: true,
      isPrimary: address.isPrimary || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private transformEmail(email: any): IDebtorEmail {
    return {
      id: email.emailId,
      debtorProfileId: '',
      email: email.email,
      emailCategory: email.category || EmailCategory.GENERAL,
      isPrimary: email.isPrimary || false,
      isVerified: email.isVerified || false,
      verifiedAt: undefined,
      bounceStatus: EmailBounceStatus.VALID,
      lastBouncedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private transformPhone(phone: any): IDebtorPhone {
    return {
      id: phone.phoneId,
      debtorProfileId: '',
      phoneNumber: phone.phoneNumber,
      category: phone.category || PhoneCategory.MOBILE,
      isPrimary: phone.isPrimary || false,
      isVerified: phone.isVerified || false,
      verifiedAt: undefined,
      canReceiveSms: true,
      canReceiveCalls: true,
      isOptedOut: false,
      optedOutAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Build timeline from transactions and communications
   */
  private buildTimeline(transactionsData: any, communicationsData: any): IDebtorFocusTimelineEvent[] {
    const timeline: IDebtorFocusTimelineEvent[] = [];

    // Add payment events
    const transactions = transactionsData.transactions || [];
    for (const tx of transactions) {
      timeline.push({
        id: tx.id || tx.transactionId,
        timestamp: new Date(tx.transactionDate || tx.createdAt),
        eventType: TimelineEventType.PAYMENT_RECEIVED,
        title: 'Payment Received',
        description: `Payment of $${tx.amount?.toFixed(2) || '0.00'} via ${tx.paymentMethod || 'Unknown'}`,
        performedBy: tx.processedBy || 'SYSTEM',
        performedByName: tx.processedByName || 'System',
        relatedDebtId: tx.debtId || null,
        metadata: { transactionId: tx.id, amount: tx.amount },
      });
    }

    // Add communication events
    const communications = communicationsData.communications || [];
    for (const comm of communications) {
      // All communications (CALL, EMAIL, SMS) are contact attempts
      timeline.push({
        id: comm.id || comm.communicationId,
        timestamp: new Date(comm.sentAt || comm.createdAt),
        eventType: TimelineEventType.CONTACT_ATTEMPT,
        title: `${comm.communicationType || comm.type || 'Communication'} ${comm.direction || ''}`.trim(),
        description: comm.subject || comm.summary || 'Communication logged',
        performedBy: comm.sentBy || comm.createdBy || 'SYSTEM',
        performedByName: comm.sentByName || comm.createdByName || 'System',
        relatedDebtId: comm.debtId || null,
        metadata: { communicationId: comm.id, communicationType: comm.communicationType || comm.type },
      });
    }

    // Sort by timestamp descending (most recent first)
    return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Build payment history from transactions
   */
  private buildPaymentHistory(transactionsData: any): IDebtorFocusPaymentHistory[] {
    const transactions = transactionsData.transactions || [];
    return transactions
      .filter((tx: any) => tx.type === 'PAYMENT' || tx.transactionType === 'PAYMENT' || tx.amount > 0)
      .map((tx: any) => ({
        id: tx.id || tx.transactionId,
        date: new Date(tx.transactionDate || tx.createdAt),
        amount: Number(tx.amount) || 0,
        debtId: tx.debtId,
        debtAccountNumber: tx.accountNumber || tx.debtAccountNumber || '',
        paymentMethod: tx.paymentMethod || 'UNKNOWN',
        transactionId: tx.id || tx.transactionId || null,
        status: tx.status || 'COMPLETED',
      }));
  }

  /**
   * Build summary metrics
   */
  private buildSummary(debtsData: any, transactionsData: any): IDebtorFocusSummary {
    const debts = debtsData.debts || [];
    const transactions = transactionsData.transactions || [];

    const totalDebt = debts.reduce((sum: number, d: any) => sum + (Number(d.principalAmount) || 0), 0);
    const totalPaid = transactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const remainingBalance = debts.reduce((sum: number, d: any) => sum + (Number(d.currentBalance) || 0), 0);

    // Calculate oldest debt date from debts array
    let oldestDebtDate: Date | null = null;
    for (const debt of debts) {
      if (debt.lastPaymentDate) {
        const date = new Date(debt.lastPaymentDate);
        if (!oldestDebtDate || date < oldestDebtDate) {
          oldestDebtDate = date;
        }
      }
    }

    // Calculate days since last payment
    let daysSinceLastPayment: number | null = null;
    const latestPayment = transactions
      .filter((t: any) => t.amount > 0)
      .sort((a: any, b: any) => new Date(b.transactionDate || b.createdAt).getTime() - new Date(a.transactionDate || a.createdAt).getTime())[0];
    if (latestPayment) {
      const paymentDate = new Date(latestPayment.transactionDate || latestPayment.createdAt);
      daysSinceLastPayment = Math.floor((Date.now() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const activeDebtsCount = debts.filter((d: any) =>
      d.status !== 'PAID_IN_FULL' && d.status !== 'SETTLED' && d.status !== 'CHARGED_OFF' && d.status !== 'SOLD'
    ).length;

    const paidDebtsCount = debts.filter((d: any) =>
      d.status === 'PAID_IN_FULL' || d.status === 'SETTLED'
    ).length;

    return {
      totalDebt,
      totalPaid,
      remainingBalance,
      oldestDebtDate,
      daysSinceLastContact: null,
      daysSinceLastPayment,
      activeDebtsCount,
      paidDebtsCount,
    };
  }

  /**
   * Build FDCPA compliance flags
   */
  private buildFdcpaFlags(profileData: any, debts: IDebtorFocusDebt[]): IFdcpaFlags {
    const hasDispute = debts.some((d) => d.hasDispute);

    return {
      isDeceased: !!profileData.deceasedDate,
      isBankrupt: !!profileData.bankruptcyStatus && profileData.bankruptcyStatus !== 'NONE',
      hasCeaseAndDesist: profileData.doNotContact || false,
      hasDispute,
      isRepresented: !!profileData.attorneyInfo,
    };
  }

  /**
   * Determine available actions based on debtor state and FDCPA flags
   */
  private getAvailableActions(debtor: IDebtorFocusDebtor, fdcpaFlags: IFdcpaFlags): string[] {
    const actions: string[] = [];

    // If deceased, bankrupt, or has cease and desist, very limited actions
    if (fdcpaFlags.isDeceased || fdcpaFlags.isBankrupt || fdcpaFlags.hasCeaseAndDesist) {
      return ['VIEW_DETAILS'];
    }

    // If represented by attorney, must contact attorney instead
    if (fdcpaFlags.isRepresented) {
      return ['VIEW_DETAILS', 'CONTACT_ATTORNEY'];
    }

    // Standard available actions
    if (!debtor.doNotContact) {
      if (debtor.phone) {
        actions.push('CALL');
      }
      if (debtor.email) {
        actions.push('EMAIL');
      }
      if (debtor.phone?.canReceiveSms) {
        actions.push('SMS');
      }
    }

    actions.push('ADD_NOTE');
    actions.push('RECORD_PAYMENT');
    actions.push('CREATE_PAYMENT_PLAN');
    actions.push('VIEW_DETAILS');

    return actions;
  }
}
