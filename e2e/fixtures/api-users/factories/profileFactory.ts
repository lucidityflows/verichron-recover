import { AddressCategory, PhoneCategory } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { faker } from '../../../utils/faker';

/**
 * Profile Factory
 * Manages user profile details: emails, addresses, phone numbers
 */

export interface CreateEmailOptions {
  id?: string;
  userId: string;
  email: string;
  isPrimary?: boolean;
}

export interface CreateAddressOptions {
  id?: string;
  userId: string;
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

export interface CreatePhoneOptions {
  id?: string;
  userId: string;
  phoneNumber?: string;
  category?: PhoneCategory;
  isPrimary?: boolean;
}

export class ProfileFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Add email to user profile
   */
  async addEmail(options: CreateEmailOptions) {
    const id = options.id || faker.uuid();
    const isPrimary = options.isPrimary ?? false;

    const [email] = await this.dataSource.query(
      `INSERT INTO user_emails (id, user_id, email, is_primary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, user_id as "userId", email, is_primary as "isPrimary", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, options.userId, options.email, isPrimary],
    );

    return email;
  }

  /**
   * Add address to user profile
   */
  async addAddress(options: CreateAddressOptions) {
    const id = options.id || faker.uuid();
    const street1 = options.street1 || faker.address.street();
    const city = options.city || faker.address.city();
    const state = options.state || faker.address.state();
    const postalCode = options.postalCode || faker.address.zipCode();
    const country = options.country || 'US';
    const isPrimary = options.isPrimary ?? false;
    const addressCategory = options.addressCategory || AddressCategory.RESIDENCE_PRIMARY;

    const [address] = await this.dataSource.query(
      `INSERT INTO user_addresses (id, user_id, street1, street2, street3, city, state, postal_code, country, latitude, longitude, is_primary, address_category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING id, user_id as "userId", street1, street2, street3, city, state, postal_code as "postalCode", country, latitude, longitude, is_primary as "isPrimary", address_category as "addressCategory", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, options.userId, street1, options.street2 || null, options.street3 || null, city, state, postalCode, country, options.latitude || null, options.longitude || null, isPrimary, addressCategory],
    );

    return address;
  }

  /**
   * Add phone number to user profile
   */
  async addPhone(options: CreatePhoneOptions) {
    const id = options.id || faker.uuid();
    const phoneNumber = options.phoneNumber || faker.phone();
    const category = options.category || PhoneCategory.MOBILE;
    const isPrimary = options.isPrimary ?? false;

    const [phone] = await this.dataSource.query(
      `INSERT INTO user_phone_numbers (id, user_id, phone_number, category, is_primary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, user_id as "userId", phone_number as "phoneNumber", category, is_primary as "isPrimary", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, options.userId, phoneNumber, category, isPrimary],
    );

    return phone;
  }

  /**
   * Get all emails for a user
   */
  async getEmails(userId: string) {
    return this.dataSource.query(
      `SELECT id, user_id as "userId", email, is_primary as "isPrimary", created_at as "createdAt", updated_at as "updatedAt"
       FROM user_emails WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [userId],
    );
  }

  /**
   * Get all addresses for a user
   */
  async getAddresses(userId: string) {
    return this.dataSource.query(
      `SELECT id, user_id as "userId", street1, street2, street3, city, state, postal_code as "postalCode", country, latitude, longitude, is_primary as "isPrimary", address_category as "addressCategory", created_at as "createdAt", updated_at as "updatedAt"
       FROM user_addresses WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [userId],
    );
  }

  /**
   * Get all phone numbers for a user
   */
  async getPhones(userId: string) {
    return this.dataSource.query(
      `SELECT id, user_id as "userId", phone_number as "phoneNumber", category, is_primary as "isPrimary", created_at as "createdAt", updated_at as "updatedAt"
       FROM user_phone_numbers WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [userId],
    );
  }
}

/**
 * Factory creator function
 */
export function createProfileFactory(dataSource: DataSource): ProfileFactory {
  return new ProfileFactory(dataSource);
}
