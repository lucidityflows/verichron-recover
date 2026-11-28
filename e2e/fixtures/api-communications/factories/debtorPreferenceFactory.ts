import { DataSource } from 'typeorm';

/**
 * DebtorPreferenceFactory
 *
 * Factory for creating DebtorPreference entities.
 * Manages communication preferences per debtor per organization with FDCPA/TCPA compliance.
 */

export type CommunicationChannel = 'EMAIL' | 'SMS' | 'LETTER';

export interface CreateDebtorPreferenceOptions {
  debtorId: string;
  organizationId: string;
  doNotContact?: boolean;
  optedOutChannels?: CommunicationChannel[];
  allowedStartHour?: number;
  allowedEndHour?: number;
  dailyContactLimit?: number;
  timezone?: string;
  preferredLanguage?: string;
  preferredChannels?: CommunicationChannel[];
  notes?: string;
}

export interface DebtorPreference {
  id: string;
  debtorId: string;
  organizationId: string;
  doNotContact: boolean;
  optedOutChannels: string[];
  allowedStartHour: number;
  allowedEndHour: number;
  dailyContactLimit: number;
  timezone?: string;
  preferredLanguage: string;
  preferredChannels?: string[];
  notes?: string;
  lastUpdatedByDebtorAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class DebtorPreferenceFactory {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create debtor communication preferences
   *
   * @example
   * ```typescript
   * const preference = await preferenceFactory.createPreference({
   *   debtorId: debtor.id,
   *   organizationId: org.id,
   *   preferredChannels: ['EMAIL', 'SMS'],
   *   timezone: 'America/New_York',
   * });
   * ```
   */
  async createPreference(options: CreateDebtorPreferenceOptions): Promise<DebtorPreference> {
    const doNotContact = options.doNotContact !== undefined ? options.doNotContact : false;
    const optedOutChannels = options.optedOutChannels || [];
    const allowedStartHour = options.allowedStartHour !== undefined ? options.allowedStartHour : 8;
    const allowedEndHour = options.allowedEndHour !== undefined ? options.allowedEndHour : 21;
    const dailyContactLimit = options.dailyContactLimit !== undefined ? options.dailyContactLimit : 3;
    const timezone = options.timezone || 'America/New_York';
    const preferredLanguage = options.preferredLanguage || 'en';
    const preferredChannels = options.preferredChannels || null;
    const notes = options.notes || null;

    const result = await this.dataSource.query(
      `
      INSERT INTO debtor_preferences (
        debtor_id,
        organization_id,
        do_not_contact,
        opted_out_channels,
        allowed_start_hour,
        allowed_end_hour,
        daily_contact_limit,
        timezone,
        preferred_language,
        preferred_channels,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        options.debtorId,
        options.organizationId,
        doNotContact,
        JSON.stringify(optedOutChannels),
        allowedStartHour,
        allowedEndHour,
        dailyContactLimit,
        timezone,
        preferredLanguage,
        preferredChannels ? JSON.stringify(preferredChannels) : null,
        notes,
      ],
    );

    return this.mapPreference(result[0]);
  }

  /**
   * Create default preference (no opt-outs, standard compliance)
   *
   * @example
   * ```typescript
   * const preference = await preferenceFactory.createDefaultPreference({
   *   debtorId: debtor.id,
   *   organizationId: org.id,
   * });
   * ```
   */
  async createDefaultPreference(options: {
    debtorId: string;
    organizationId: string;
    timezone?: string;
  }): Promise<DebtorPreference> {
    return this.createPreference({
      debtorId: options.debtorId,
      organizationId: options.organizationId,
      doNotContact: false,
      optedOutChannels: [],
      allowedStartHour: 8,
      allowedEndHour: 21,
      dailyContactLimit: 3,
      timezone: options.timezone || 'America/New_York',
      preferredLanguage: 'en',
      preferredChannels: ['EMAIL', 'SMS'],
    });
  }

  /**
   * Create preference with do-not-contact flag
   *
   * @example
   * ```typescript
   * const preference = await preferenceFactory.createDoNotContactPreference({
   *   debtorId: debtor.id,
   *   organizationId: org.id,
   * });
   * ```
   */
  async createDoNotContactPreference(options: {
    debtorId: string;
    organizationId: string;
  }): Promise<DebtorPreference> {
    return this.createPreference({
      debtorId: options.debtorId,
      organizationId: options.organizationId,
      doNotContact: true,
      optedOutChannels: [],
      notes: 'Debtor requested no contact',
    });
  }

  /**
   * Create preference with channel-specific opt-outs
   *
   * @example
   * ```typescript
   * const preference = await preferenceFactory.createChannelOptOutPreference({
   *   debtorId: debtor.id,
   *   organizationId: org.id,
   *   optedOutChannels: ['SMS'],
   * });
   * ```
   */
  async createChannelOptOutPreference(options: {
    debtorId: string;
    organizationId: string;
    optedOutChannels: CommunicationChannel[];
  }): Promise<DebtorPreference> {
    const channelNames = options.optedOutChannels.join(', ');
    return this.createPreference({
      debtorId: options.debtorId,
      organizationId: options.organizationId,
      doNotContact: false,
      optedOutChannels: options.optedOutChannels,
      notes: `Opted out of: ${channelNames}`,
    });
  }

  /**
   * Create email-only preference
   *
   * @example
   * ```typescript
   * const preference = await preferenceFactory.createEmailOnlyPreference({
   *   debtorId: debtor.id,
   *   organizationId: org.id,
   * });
   * ```
   */
  async createEmailOnlyPreference(options: {
    debtorId: string;
    organizationId: string;
  }): Promise<DebtorPreference> {
    return this.createPreference({
      debtorId: options.debtorId,
      organizationId: options.organizationId,
      doNotContact: false,
      optedOutChannels: ['SMS', 'LETTER'],
      preferredChannels: ['EMAIL'],
      notes: 'Email-only communication requested',
    });
  }

  /**
   * Create preference with custom time restrictions
   *
   * @example
   * ```typescript
   * const preference = await preferenceFactory.createTimeRestrictedPreference({
   *   debtorId: debtor.id,
   *   organizationId: org.id,
   *   allowedStartHour: 10,
   *   allowedEndHour: 18,
   *   timezone: 'America/Los_Angeles',
   * });
   * ```
   */
  async createTimeRestrictedPreference(options: {
    debtorId: string;
    organizationId: string;
    allowedStartHour: number;
    allowedEndHour: number;
    timezone?: string;
  }): Promise<DebtorPreference> {
    return this.createPreference({
      debtorId: options.debtorId,
      organizationId: options.organizationId,
      allowedStartHour: options.allowedStartHour,
      allowedEndHour: options.allowedEndHour,
      timezone: options.timezone || 'America/New_York',
      notes: `Contact allowed: ${options.allowedStartHour}:00 - ${options.allowedEndHour}:00`,
    });
  }

  /**
   * Update opt-out channels for existing preference
   *
   * @example
   * ```typescript
   * await preferenceFactory.updateOptOutChannels({
   *   preferenceId: preference.id,
   *   optedOutChannels: ['SMS', 'LETTER'],
   * });
   * ```
   */
  async updateOptOutChannels(options: {
    preferenceId: string;
    optedOutChannels: CommunicationChannel[];
  }): Promise<DebtorPreference> {
    const result = await this.dataSource.query(
      `
      UPDATE debtor_preferences
      SET
        opted_out_channels = $1,
        last_updated_by_debtor_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [JSON.stringify(options.optedOutChannels), options.preferenceId],
    );

    return this.mapPreference(result[0]);
  }

  /**
   * Set global do-not-contact flag
   *
   * @example
   * ```typescript
   * await preferenceFactory.setDoNotContact({
   *   preferenceId: preference.id,
   *   doNotContact: true,
   * });
   * ```
   */
  async setDoNotContact(options: { preferenceId: string; doNotContact: boolean }): Promise<DebtorPreference> {
    const result = await this.dataSource.query(
      `
      UPDATE debtor_preferences
      SET
        do_not_contact = $1,
        last_updated_by_debtor_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [options.doNotContact, options.preferenceId],
    );

    return this.mapPreference(result[0]);
  }

  /**
   * Get preference for debtor in organization
   *
   * @example
   * ```typescript
   * const preference = await preferenceFactory.getPreference({
   *   debtorId: debtor.id,
   *   organizationId: org.id,
   * });
   * ```
   */
  async getPreference(options: { debtorId: string; organizationId: string }): Promise<DebtorPreference | null> {
    const result = await this.dataSource.query(
      `
      SELECT * FROM debtor_preferences
      WHERE debtor_id = $1 AND organization_id = $2
      LIMIT 1
      `,
      [options.debtorId, options.organizationId],
    );

    return result.length > 0 ? this.mapPreference(result[0]) : null;
  }

  /**
   * Maps database result to DebtorPreference type
   */
  private mapPreference(row: any): DebtorPreference {
    return {
      id: row.id,
      debtorId: row.debtor_id,
      organizationId: row.organization_id,
      doNotContact: row.do_not_contact,
      optedOutChannels: row.opted_out_channels,
      allowedStartHour: row.allowed_start_hour,
      allowedEndHour: row.allowed_end_hour,
      dailyContactLimit: row.daily_contact_limit,
      timezone: row.timezone,
      preferredLanguage: row.preferred_language,
      preferredChannels: row.preferred_channels,
      notes: row.notes,
      lastUpdatedByDebtorAt: row.last_updated_by_debtor_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/**
 * Factory function to create a DebtorPreferenceFactory instance
 *
 * @example
 * ```typescript
 * const preferenceFactory = createDebtorPreferenceFactory(communicationsDataSource);
 * const preference = await preferenceFactory.createDefaultPreference({ debtorId, organizationId });
 * ```
 */
export function createDebtorPreferenceFactory(dataSource: DataSource): DebtorPreferenceFactory {
  return new DebtorPreferenceFactory(dataSource);
}
