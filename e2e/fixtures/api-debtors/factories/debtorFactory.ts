import { DataSource, DeepPartial } from 'typeorm';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { DebtorVerificationStatus } from '@verichron/enums';

/**
 * DebtorIdentity entity representation for factory use
 */
export interface DebtorIdentity {
  id: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DebtorProfile entity representation for factory use
 */
export interface DebtorProfile {
  id: string;
  debtorIdentityId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: Date;
  organizationId: string;
  verificationStatus: DebtorVerificationStatus;
  lastVerifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateDebtorIdentityOptions {
  id?: string;
  userId?: string | null;
}

export interface CreateDebtorProfileOptions {
  debtorIdentityId?: string; // If not provided, a new identity will be created
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: Date;
  organizationId: string;
  verificationStatus?: DebtorVerificationStatus;
  lastVerifiedAt?: Date;
  notes?: string;
}

/**
 * DebtorIdentityFactory
 *
 * Factory for creating DebtorIdentity entities in api-debtors database.
 */
export class DebtorIdentityFactory {
  constructor(private readonly dataSource: DataSource) {}

  async createDebtorIdentity(options: CreateDebtorIdentityOptions = {}): Promise<DebtorIdentity> {
    const identity = {
      id: options.id || randomUUID(),
      userId: options.userId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [savedIdentity] = await this.dataSource.query(
      `INSERT INTO debtor_identities (id, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [identity.id, identity.userId, identity.createdAt, identity.updatedAt],
    );

    return {
      id: savedIdentity.id,
      userId: savedIdentity.user_id,
      createdAt: savedIdentity.created_at,
      updatedAt: savedIdentity.updated_at,
    };
  }
}

/**
 * DebtorProfileFactory
 *
 * Factory for creating DebtorProfile entities in api-debtors database.
 */
export class DebtorProfileFactory {
  private debtorIdentityFactory: DebtorIdentityFactory;

  constructor(private readonly dataSource: DataSource) {
    this.debtorIdentityFactory = new DebtorIdentityFactory(dataSource);
  }

  /**
   * Create a debtor profile with custom options
   * Automatically creates a DebtorIdentity if debtorIdentityId is not provided.
   */
  async createDebtorProfile(options: CreateDebtorProfileOptions): Promise<DebtorProfile> {
    let debtorIdentityId = options.debtorIdentityId;
    if (!debtorIdentityId) {
      const identity = await this.debtorIdentityFactory.createDebtorIdentity();
      debtorIdentityId = identity.id;
    }

    const profileData = {
      id: randomUUID(),
      debtorIdentityId,
      firstName: options.firstName || faker.person.firstName(),
      lastName: options.lastName || faker.person.lastName(),
      middleName: options.middleName,
      dateOfBirth: options.dateOfBirth || faker.date.past({ years: 30, refDate: '2000-01-01' }),
      organizationId: options.organizationId,
      verificationStatus: options.verificationStatus || DebtorVerificationStatus.UNVERIFIED,
      lastVerifiedAt: options.lastVerifiedAt,
      notes: options.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [savedProfile] = await this.dataSource.query(
      `INSERT INTO debtor_profiles (id, debtor_identity_id, first_name, last_name, middle_name, date_of_birth, organization_id, verification_status, last_verified_at, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        profileData.id,
        profileData.debtorIdentityId,
        profileData.firstName,
        profileData.lastName,
        profileData.middleName,
        profileData.dateOfBirth,
        profileData.organizationId,
        profileData.verificationStatus,
        profileData.lastVerifiedAt,
        profileData.notes,
        profileData.createdAt,
        profileData.updatedAt,
      ],
    );

    return {
      id: savedProfile.id,
      debtorIdentityId: savedProfile.debtor_identity_id,
      firstName: savedProfile.first_name,
      lastName: savedProfile.last_name,
      middleName: savedProfile.middle_name,
      dateOfBirth: savedProfile.date_of_birth,
      organizationId: savedProfile.organization_id,
      verificationStatus: savedProfile.verification_status,
      lastVerifiedAt: savedProfile.last_verified_at,
      notes: savedProfile.notes,
      createdAt: savedProfile.created_at,
      updatedAt: savedProfile.updated_at,
      deletedAt: savedProfile.deleted_at,
    };
  }

  /**
   * Create a debtor profile linked to a user account.
   * This will create a DebtorIdentity linked to the userId first.
   */
  async createDebtorProfileWithUser(
    userId: string,
    options: Omit<CreateDebtorProfileOptions, 'debtorIdentityId'>,
  ): Promise<{ profile: DebtorProfile; identity: DebtorIdentity }> {
    const identity = await this.debtorIdentityFactory.createDebtorIdentity({ userId });
    const profile = await this.createDebtorProfile({
      ...options,
      debtorIdentityId: identity.id,
    });
    return { profile, identity };
  }

  /**
   * Create a verified debtor profile
   */
  async createVerifiedDebtorProfile(options: Omit<CreateDebtorProfileOptions, 'verificationStatus'>): Promise<DebtorProfile> {
    return this.createDebtorProfile({
      ...options,
      verificationStatus: DebtorVerificationStatus.VERIFIED,
      lastVerifiedAt: new Date(),
    });
  }

  /**
   * Create an unverified debtor profile (default state)
   */
  async createUnverifiedDebtorProfile(options: Omit<CreateDebtorProfileOptions, 'verificationStatus'>): Promise<DebtorProfile> {
    return this.createDebtorProfile({
      ...options,
      verificationStatus: DebtorVerificationStatus.UNVERIFIED,
    });
  }

  /**
   * Create a debtor profile with pending verification
   */
  async createPendingVerificationDebtorProfile(
    options: Omit<CreateDebtorProfileOptions, 'verificationStatus'>,
  ): Promise<DebtorProfile> {
    return this.createDebtorProfile({
      ...options,
      verificationStatus: DebtorVerificationStatus.PENDING,
    });
  }

  /**
   * Create multiple debtor profiles at once
   */
  async createMultipleDebtorProfiles(count: number, options: CreateDebtorProfileOptions): Promise<DebtorProfile[]> {
    const profiles: DebtorProfile[] = [];
    for (let i = 0; i < count; i++) {
      const profile = await this.createDebtorProfile(options);
      profiles.push(profile);
    }
    return profiles;
  }
}

/**
 * Factory function to create a DebtorProfileFactory instance
 *
 * @example
 * ```typescript
 * const debtorProfileFactory = createDebtorProfileFactory(debtorsDataSource);
 * const profile = await debtorProfileFactory.createDebtorProfile({
 *   organizationId: org.id,
 * });
 * ```
 */
export function createDebtorProfileFactory(dataSource: DataSource): DebtorProfileFactory {
  return new DebtorProfileFactory(dataSource);
}
