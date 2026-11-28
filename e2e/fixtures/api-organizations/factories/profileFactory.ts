import { AddressCategory, PhoneCategory, EmailCategory } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { faker } from '../../../utils/faker';

/**
 * Organization Profile Factory
 * Manages organization contact details: emails, addresses, phone numbers
 */

export interface CreateOrganizationEmailOptions {
  id?: string;
  organizationId: string;
  email: string;
  isPrimary?: boolean;
  isVerified?: boolean;
  emailCategory?: EmailCategory;
  validFrom?: Date;
  validTo?: Date;
}

export interface CreateOrganizationAddressOptions {
  id?: string;
  organizationId: string;
  street1?: string;
  street2?: string;
  street3?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
  addressCategory?: AddressCategory;
}

export interface CreateOrganizationPhoneOptions {
  id?: string;
  organizationId: string;
  phoneNumber?: string;
  extension?: string;
  isPrimary?: boolean;
  isVerified?: boolean;
  phoneCategory?: PhoneCategory;
  validFrom?: Date;
  validTo?: Date;
}

export class OrganizationProfileFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Add email to organization
   */
  async addEmail(options: CreateOrganizationEmailOptions) {
    const id = options.id || faker.uuid();
    const isPrimary = options.isPrimary ?? false;
    const isVerified = options.isVerified ?? true;
    const emailCategory = options.emailCategory || EmailCategory.GENERAL;

    const [email] = await this.dataSource.query(
      `INSERT INTO organization_emails (id, organization_id, email, is_primary, is_verified, email_category, valid_from, valid_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, organization_id as "organizationId", email, is_primary as "isPrimary", is_verified as "isVerified", email_category as "emailCategory", valid_from as "validFrom", valid_to as "validTo", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, options.organizationId, options.email, isPrimary, isVerified, emailCategory, options.validFrom || null, options.validTo || null],
    );

    return email;
  }

  /**
   * Add address to organization
   */
  async addAddress(options: CreateOrganizationAddressOptions) {
    const id = options.id || faker.uuid();
    const street1 = options.street1 || faker.address.street();
    const city = options.city || faker.address.city();
    const state = options.state || faker.address.state();
    const postalCode = options.postalCode || faker.address.zipCode();
    const country = options.country || 'US';
    const isPrimary = options.isPrimary ?? false;
    const addressCategory = options.addressCategory || AddressCategory.HEADQUARTERS;

    const [address] = await this.dataSource.query(
      `INSERT INTO organization_addresses (id, organization_id, street1, street2, street3, city, state, postal_code, country, latitude, longitude, is_primary, address_category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING id, organization_id as "organizationId", street1, street2, street3, city, state, postal_code as "postalCode", country, latitude, longitude, is_primary as "isPrimary", address_category as "addressCategory", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, options.organizationId, street1, options.street2 || null, options.street3 || null, city, state, postalCode, country, options.latitude || null, options.longitude || null, isPrimary, addressCategory],
    );

    return address;
  }

  /**
   * Add phone number to organization
   */
  async addPhone(options: CreateOrganizationPhoneOptions) {
    const id = options.id || faker.uuid();
    const phoneNumber = options.phoneNumber || faker.phone();
    const isPrimary = options.isPrimary ?? false;
    const isVerified = options.isVerified ?? true;
    const phoneCategory = options.phoneCategory || PhoneCategory.WORK;

    const [phone] = await this.dataSource.query(
      `INSERT INTO organization_phone_numbers (id, organization_id, phone_number, extension, is_primary, is_verified, category, valid_from, valid_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, organization_id as "organizationId", phone_number as "phoneNumber", extension, is_primary as "isPrimary", is_verified as "isVerified", category as "phoneCategory", valid_from as "validFrom", valid_to as "validTo", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, options.organizationId, phoneNumber, options.extension || null, isPrimary, isVerified, phoneCategory, options.validFrom || null, options.validTo || null],
    );

    return phone;
  }

  /**
   * Get all emails for an organization
   */
  async getEmails(organizationId: string) {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", email, is_primary as "isPrimary", is_verified as "isVerified", email_category as "emailCategory", valid_from as "validFrom", valid_to as "validTo", created_at as "createdAt", updated_at as "updatedAt"
       FROM organization_emails WHERE organization_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [organizationId],
    );
  }

  /**
   * Get all addresses for an organization
   */
  async getAddresses(organizationId: string) {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", street1, street2, street3, city, state, postal_code as "postalCode", country, latitude, longitude, is_primary as "isPrimary", address_category as "addressCategory", created_at as "createdAt", updated_at as "updatedAt"
       FROM organization_addresses WHERE organization_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [organizationId],
    );
  }

  /**
   * Get all phone numbers for an organization
   */
  async getPhones(organizationId: string) {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", phone_number as "phoneNumber", extension, is_primary as "isPrimary", is_verified as "isVerified", phone_category as "phoneCategory", valid_from as "validFrom", valid_to as "validTo", created_at as "createdAt", updated_at as "updatedAt"
       FROM organization_phone_numbers WHERE organization_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [organizationId],
    );
  }
}

/**
 * Factory creator function
 */
export function createOrganizationProfileFactory(dataSource: DataSource): OrganizationProfileFactory {
  return new OrganizationProfileFactory(dataSource);
}
