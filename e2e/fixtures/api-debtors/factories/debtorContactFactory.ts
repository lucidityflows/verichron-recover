import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { PhoneCategory, EmailCategory, AddressCategory } from '@verichron/enums';

/**
 * DebtorContactFactory
 *
 * Factory for creating debtor contact information (phones, emails, addresses).
 * Supports creating complete contact profiles with primary/verified statuses.
 */

// Phone types
export interface CreateDebtorPhoneOptions {
  debtorId: string;
  phoneNumber?: string;
  category?: PhoneCategory;
  isPrimary?: boolean;
  isVerified?: boolean;
  verifiedAt?: Date;
  canReceiveSms?: boolean;
  canReceiveCalls?: boolean;
  isOptedOut?: boolean;
}

export interface DebtorPhone {
  id: string;
  debtorId: string;
  phoneNumber: string;
  category: PhoneCategory;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  canReceiveSms: boolean;
  canReceiveCalls: boolean;
  isOptedOut: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Email types
export interface CreateDebtorEmailOptions {
  debtorId: string;
  emailAddress?: string;
  emailCategory?: EmailCategory;
  isPrimary?: boolean;
  isVerified?: boolean;
  verifiedAt?: Date;
}

export interface DebtorEmail {
  id: string;
  debtorId: string;
  emailAddress: string;
  emailCategory: EmailCategory;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Address types
export interface CreateDebtorAddressOptions {
  debtorId: string;
  street1?: string;
  street2?: string;
  street3?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  addressCategory?: AddressCategory;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
  isCurrent?: boolean;
  isVerified?: boolean;
  verifiedAt?: Date;
}

export interface DebtorAddress {
  id: string;
  debtorId: string;
  street1: string;
  street2?: string;
  street3?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressCategory: AddressCategory;
  latitude?: number;
  longitude?: number;
  isPrimary: boolean;
  isCurrent: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DebtorContactFactory {
  constructor(private readonly dataSource: DataSource) {}

  // ==========================
  // Phone Methods
  // ==========================

  /**
   * Create a phone number for a debtor
   *
   * @example
   * ```typescript
   * const phone = await contactFactory.createPhone({
   *   debtorId: debtor.id,
   *   category: PhoneCategory.MOBILE,
   *   isPrimary: true,
   * });
   * ```
   */
  async createPhone(options: CreateDebtorPhoneOptions): Promise<DebtorPhone> {
    // Generate phone number in format: +1-555-XXX-XXXX (16 chars, fits in varchar(20))
    const phoneNumber = options.phoneNumber || `+1-555-${faker.string.numeric(3)}-${faker.string.numeric(4)}`;
    const category = options.category || PhoneCategory.MOBILE;
    const isPrimary = options.isPrimary !== undefined ? options.isPrimary : false;
    const isVerified = options.isVerified !== undefined ? options.isVerified : false;
    const verifiedAt = options.verifiedAt || (isVerified ? new Date() : null);
    const canReceiveSms = options.canReceiveSms !== undefined ? options.canReceiveSms : category === PhoneCategory.MOBILE;
    const canReceiveCalls = options.canReceiveCalls !== undefined ? options.canReceiveCalls : true;
    const isOptedOut = options.isOptedOut !== undefined ? options.isOptedOut : false;

    const result = await this.dataSource.query(
      `
      INSERT INTO debtor_phones (
        debtor_profile_id,
        phone_number,
        category,
        is_primary,
        is_verified,
        verified_at,
        can_receive_sms,
        can_receive_calls,
        is_opted_out
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        options.debtorId,
        phoneNumber,
        category,
        isPrimary,
        isVerified,
        verifiedAt,
        canReceiveSms,
        canReceiveCalls,
        isOptedOut,
      ],
    );

    return this.mapPhone(result[0]);
  }

  /**
   * Create primary mobile phone for debtor
   *
   * @example
   * ```typescript
   * const phone = await contactFactory.createPrimaryMobilePhone(debtor.id);
   * ```
   */
  async createPrimaryMobilePhone(debtorId: string, phoneNumber?: string): Promise<DebtorPhone> {
    return this.createPhone({
      debtorId,
      phoneNumber,
      category: PhoneCategory.MOBILE,
      isPrimary: true,
      isVerified: true,
      canReceiveSms: true,
      canReceiveCalls: true,
    });
  }

  // ==========================
  // Email Methods
  // ==========================

  /**
   * Create an email address for a debtor
   *
   * @example
   * ```typescript
   * const email = await contactFactory.createEmail({
   *   debtorId: debtor.id,
   *   emailCategory: EmailCategory.GENERAL,
   *   isPrimary: true,
   * });
   * ```
   */
  async createEmail(options: CreateDebtorEmailOptions): Promise<DebtorEmail> {
    const emailAddress = options.emailAddress || faker.internet.email();
    const emailCategory = options.emailCategory || EmailCategory.GENERAL;
    const isPrimary = options.isPrimary !== undefined ? options.isPrimary : false;
    const isVerified = options.isVerified !== undefined ? options.isVerified : false;
    const verifiedAt = options.verifiedAt || (isVerified ? new Date() : null);

    const result = await this.dataSource.query(
      `
      INSERT INTO debtor_emails (
        debtor_profile_id,
        email,
        email_category,
        is_primary,
        is_verified,
        verified_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [options.debtorId, emailAddress, emailCategory, isPrimary, isVerified, verifiedAt],
    );

    return this.mapEmail(result[0]);
  }

  /**
   * Create primary email for debtor
   *
   * @example
   * ```typescript
   * const email = await contactFactory.createPrimaryEmail(debtor.id);
   * ```
   */
  async createPrimaryEmail(debtorId: string, emailAddress?: string): Promise<DebtorEmail> {
    return this.createEmail({
      debtorId,
      emailAddress,
      emailCategory: EmailCategory.GENERAL,
      isPrimary: true,
      isVerified: true,
    });
  }

  // ==========================
  // Address Methods
  // ==========================

  /**
   * Create an address for a debtor
   *
   * @example
   * ```typescript
   * const address = await contactFactory.createAddress({
   *   debtorId: debtor.id,
   *   addressCategory: AddressCategory.RESIDENCE_PRIMARY,
   *   isPrimary: true,
   * });
   * ```
   */
  async createAddress(options: CreateDebtorAddressOptions): Promise<DebtorAddress> {
    const street1 = options.street1 || faker.location.streetAddress();
    const street2 = options.street2 || null;
    const street3 = options.street3 || null;
    const city = options.city || faker.location.city();
    const state = options.state || faker.location.state({ abbreviated: true });
    const postalCode = options.postalCode || faker.location.zipCode();
    const country = options.country || 'US';
    const addressCategory = options.addressCategory || AddressCategory.RESIDENCE_PRIMARY;
    const latitude = options.latitude || null;
    const longitude = options.longitude || null;
    const isPrimary = options.isPrimary !== undefined ? options.isPrimary : false;
    const isCurrent = options.isCurrent !== undefined ? options.isCurrent : true;
    const isVerified = options.isVerified !== undefined ? options.isVerified : false;
    const verifiedAt = options.verifiedAt || (isVerified ? new Date() : null);

    const result = await this.dataSource.query(
      `
      INSERT INTO debtor_addresses (
        debtor_profile_id,
        street1,
        street2,
        street3,
        city,
        state,
        postal_code,
        country,
        address_category,
        latitude,
        longitude,
        is_primary,
        is_current,
        is_verified,
        verified_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
      `,
      [
        options.debtorId,
        street1,
        street2,
        street3,
        city,
        state,
        postalCode,
        country,
        addressCategory,
        latitude,
        longitude,
        isPrimary,
        isCurrent,
        isVerified,
        verifiedAt,
      ],
    );

    return this.mapAddress(result[0]);
  }

  /**
   * Create primary home address for debtor
   *
   * @example
   * ```typescript
   * const address = await contactFactory.createPrimaryHomeAddress(debtor.id);
   * ```
   */
  async createPrimaryHomeAddress(debtorId: string): Promise<DebtorAddress> {
    return this.createAddress({
      debtorId,
      addressCategory: AddressCategory.RESIDENCE_PRIMARY,
      isPrimary: true,
      isVerified: true,
    });
  }

  // ==========================
  // Complete Profile Methods
  // ==========================

  /**
   * Create complete contact profile (phone + email + address)
   *
   * @example
   * ```typescript
   * const profile = await contactFactory.createCompleteContactProfile(debtor.id);
   * ```
   */
  async createCompleteContactProfile(debtorId: string): Promise<{
    phone: DebtorPhone;
    email: DebtorEmail;
    address: DebtorAddress;
  }> {
    const phone = await this.createPrimaryMobilePhone(debtorId);
    const email = await this.createPrimaryEmail(debtorId);
    const address = await this.createPrimaryHomeAddress(debtorId);

    return { phone, email, address };
  }

  // ==========================
  // Mapping Methods
  // ==========================

  private mapPhone(row: any): DebtorPhone {
    return {
      id: row.id,
      debtorId: row.debtor_id,
      phoneNumber: row.phone_number,
      category: row.category,
      isPrimary: row.is_primary,
      isVerified: row.is_verified,
      verifiedAt: row.verified_at,
      canReceiveSms: row.can_receive_sms,
      canReceiveCalls: row.can_receive_calls,
      isOptedOut: row.is_opted_out,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapEmail(row: any): DebtorEmail {
    return {
      id: row.id,
      debtorId: row.debtor_id,
      emailAddress: row.email,
      emailCategory: row.email_category,
      isPrimary: row.is_primary,
      isVerified: row.is_verified,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAddress(row: any): DebtorAddress {
    return {
      id: row.id,
      debtorId: row.debtor_id,
      street1: row.street1,
      street2: row.street2,
      street3: row.street3,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      addressCategory: row.address_category,
      latitude: row.latitude,
      longitude: row.longitude,
      isPrimary: row.is_primary,
      isCurrent: row.is_current,
      isVerified: row.is_verified,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/**
 * Factory function to create a DebtorContactFactory instance
 *
 * @example
 * ```typescript
 * const contactFactory = createDebtorContactFactory(debtorsDataSource);
 * const phone = await contactFactory.createPrimaryMobilePhone(debtor.id);
 * ```
 */
export function createDebtorContactFactory(dataSource: DataSource): DebtorContactFactory {
  return new DebtorContactFactory(dataSource);
}
