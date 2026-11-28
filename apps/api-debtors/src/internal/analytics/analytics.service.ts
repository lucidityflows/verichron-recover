import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DebtorAddress } from '../../profiles/entities/debtor-address.entity';
import { FlowDimension, GeographicAnalyticsView, getStateCoordinates, getStateName } from '@verichron/enums';
import {
  FlowAnalyticsInternalQueryDto,
  FlowAnalyticsDebtorResponseDto,
  FlowDimensionDataDto,
  GeographicDebtorsQueryDto,
  GeographicDebtorsResponseDto,
  DebtorFocusProfileResponseDto,
  DebtorFocusAddressDto,
  DebtorFocusEmailDto,
  DebtorFocusPhoneDto,
} from './dto';

export interface InternalDebtorAnalytics {
  totalDebtors: number;
}

/**
 * Internal Analytics Service for api-debtors
 *
 * Provides aggregated debtor metrics for the event orchestrator.
 * This service is only called via internal endpoints, not exposed to external users.
 */
@Injectable()
export class InternalAnalyticsService {
  private readonly logger = new Logger(InternalAnalyticsService.name);

  constructor(
    @InjectRepository(DebtorProfileEntity)
    private readonly debtorProfileRepository: Repository<DebtorProfileEntity>,
    @InjectRepository(DebtorAddress)
    private readonly debtorAddressRepository: Repository<DebtorAddress>,
  ) {}

  async getDashboardSummary(organizationId: string): Promise<InternalDebtorAnalytics> {
    this.logger.log(`Generating dashboard summary for organization: ${organizationId}`);

    const totalDebtors = await this.getTotalDebtors(organizationId);

    return {
      totalDebtors,
    };
  }

  async getFlowAnalytics(
    organizationId: string,
    query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsDebtorResponseDto> {
    this.logger.log(
      `Generating flow analytics for organization: ${organizationId}, view: ${query.view}`,
    );

    if (query.view === FlowDimension.STATE) {
      return this.getFlowByState(organizationId, query);
    }

    // Other flow dimensions are not supported for debtors
    return { debtorsByDimension: [] };
  }

  async getGeographicDebtors(
    organizationId: string,
    query: GeographicDebtorsQueryDto,
  ): Promise<GeographicDebtorsResponseDto> {
    this.logger.log(
      `Generating geographic debtor analytics for organization: ${organizationId}`,
    );

    // Build query for debtor counts by state
    const queryBuilder = this.debtorAddressRepository
      .createQueryBuilder('address')
      .innerJoin(
        'debtor_profiles',
        'profile',
        'profile.id = address.debtor_profile_id AND profile.organization_id = :organizationId',
        { organizationId },
      )
      .select('address.state', 'stateCode')
      .addSelect('COUNT(DISTINCT profile.id)', 'debtorCount')
      .where('address.is_primary = :isPrimary', { isPrimary: true })
      .groupBy('address.state')
      .orderBy('"debtorCount"', 'DESC');

    // Apply filters
    if (query.states && query.states.length > 0) {
      queryBuilder.andWhere('address.state IN (:...states)', { states: query.states });
    }

    if (query.startDate) {
      queryBuilder.andWhere('profile.created_at >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('profile.created_at <= :endDate', { endDate: query.endDate });
    }

    const rawResults = await queryBuilder.getRawMany();

    // Get total debtors for this organization
    let totalDebtorsQuery = this.debtorProfileRepository
      .createQueryBuilder('profile')
      .where('profile.organization_id = :organizationId', { organizationId });

    if (query.startDate) {
      totalDebtorsQuery.andWhere('profile.created_at >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      totalDebtorsQuery.andWhere('profile.created_at <= :endDate', { endDate: query.endDate });
    }

    const totalDebtors = await totalDebtorsQuery.getCount();

    // Get debtor-to-state mapping for orchestrator aggregation
    const mappingQueryBuilder = this.debtorAddressRepository
      .createQueryBuilder('address')
      .innerJoin(
        'debtor_profiles',
        'profile',
        'profile.id = address.debtor_profile_id AND profile.organization_id = :organizationId',
        { organizationId },
      )
      .select('profile.id', 'debtorProfileId')
      .addSelect('address.state', 'stateCode')
      .where('address.is_primary = :isPrimary', { isPrimary: true });

    // Apply same filters to mapping query
    if (query.states && query.states.length > 0) {
      mappingQueryBuilder.andWhere('address.state IN (:...states)', { states: query.states });
    }

    if (query.startDate) {
      mappingQueryBuilder.andWhere('profile.created_at >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      mappingQueryBuilder.andWhere('profile.created_at <= :endDate', { endDate: query.endDate });
    }

    const debtorStateMapping = await mappingQueryBuilder.getRawMany();

    // Transform results to state data format
    // Note: Debt values, recovery rates, etc. will be populated by api-debts service
    // This service returns debtor-specific data only
    const states = rawResults.map((item) => ({
      stateCode: item.stateCode,
      stateName: getStateName(item.stateCode),
      coordinates: getStateCoordinates(item.stateCode),
      debtorCount: parseInt(item.debtorCount, 10),
      totalDebtValue: 0, // Will be populated by orchestrator from api-debts data
      averageDebtValue: 0,
      activeDebts: 0,
      paidDebts: 0,
      defaultedDebts: 0,
      recoveryRate: 0,
    }));

    return {
      type: GeographicAnalyticsView.DEBTORS,
      totalDebtors,
      totalDebtValue: 0, // Will be populated by orchestrator from api-debts data
      states,
      debtorStateMapping,
    };
  }

  private async getFlowByState(
    organizationId: string,
    query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsDebtorResponseDto> {
    const queryBuilder = this.debtorAddressRepository
      .createQueryBuilder('address')
      .innerJoin(
        'debtor_profiles',
        'profile',
        'profile.id = address.debtor_profile_id AND profile.organization_id = :organizationId',
        { organizationId },
      )
      .select('address.state', 'dimensionValue')
      .addSelect('COUNT(DISTINCT profile.id)', 'totalDebtors')
      .where('address.is_primary = :isPrimary', { isPrimary: true })
      .groupBy('address.state')
      .orderBy('"totalDebtors"', 'DESC');

    // Apply date filters if provided
    if (query.startDate) {
      queryBuilder.andWhere('profile.created_at >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      queryBuilder.andWhere('profile.created_at <= :endDate', { endDate: query.endDate });
    }

    const rawResults = await queryBuilder.getRawMany();

    // Transform results to include labels
    const debtorsByDimension: FlowDimensionDataDto[] = rawResults.map((item) => ({
      dimensionValue: item.dimensionValue,
      label: getStateName(item.dimensionValue),
      totalDebtors: parseInt(item.totalDebtors, 10),
    }));

    return { debtorsByDimension };
  }

  private async getTotalDebtors(organizationId: string): Promise<number> {
    return this.debtorProfileRepository.count({
      where: { organizationId },
    });
  }

  /**
   * Get debtor profile with all contact information for debtor focus view
   */
  async getDebtorProfile(
    organizationId: string,
    debtorProfileId: string,
  ): Promise<DebtorFocusProfileResponseDto> {
    this.logger.log(
      `Fetching debtor profile for debtor: ${debtorProfileId} in organization: ${organizationId}`,
    );

    // Fetch debtor profile with all relations
    const debtorProfile = await this.debtorProfileRepository.findOne({
      where: {
        id: debtorProfileId,
        organizationId,
      },
      relations: ['addresses', 'emails', 'phones'],
    });

    if (!debtorProfile) {
      throw new Error(
        `Debtor profile not found: ${debtorProfileId} in organization ${organizationId}`,
      );
    }

    // Map addresses
    const addresses: DebtorFocusAddressDto[] =
      debtorProfile.addresses?.map((address) => ({
        addressId: address.id,
        category: address.addressCategory,
        street1: address.street1,
        street2: address.street2 || null,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        isPrimary: address.isPrimary || false,
      })) || [];

    // Map emails
    const emails: DebtorFocusEmailDto[] =
      debtorProfile.emails?.map((email) => ({
        emailId: email.id,
        email: email.email,
        category: email.emailCategory,
        isPrimary: email.isPrimary || false,
        isVerified: email.isVerified || false,
      })) || [];

    // Map phones
    const phones: DebtorFocusPhoneDto[] =
      debtorProfile.phones?.map((phone) => ({
        phoneId: phone.id,
        phoneNumber: phone.phoneNumber,
        category: phone.category,
        isPrimary: phone.isPrimary || false,
        isVerified: phone.isVerified || false,
      })) || [];

    return {
      debtorProfileId: debtorProfile.id,
      debtorIdentityId: debtorProfile.debtorIdentityId,
      firstName: debtorProfile.firstName,
      lastName: debtorProfile.lastName,
      middleName: debtorProfile.middleName || null,
      dateOfBirth: debtorProfile.dateOfBirth
        ? debtorProfile.dateOfBirth.toISOString().split('T')[0]
        : null,
      status: debtorProfile.status,
      createdAt: debtorProfile.createdAt.toISOString().split('T')[0],
      updatedAt: debtorProfile.updatedAt.toISOString().split('T')[0],
      addresses,
      emails,
      phones,
    };
  }
}
