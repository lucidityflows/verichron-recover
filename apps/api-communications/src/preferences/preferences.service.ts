import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtorPreference } from './entities/debtor-preference.entity';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { PreferenceChannel } from '@verichron/enums';

/**
 * Preferences Service
 *
 * Manages debtor communication preferences for FDCPA/TCPA compliance
 * - Get/create preferences with defaults
 * - Update preferences (debtor or collector initiated)
 * - Check opt-out status and channel availability
 * - Handle do-not-contact requests
 */
@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @InjectRepository(DebtorPreference)
    private readonly preferencesRepo: Repository<DebtorPreference>,
  ) {}

  /**
   * Get preferences for a debtor (creates with defaults if not exists)
   */
  async findByDebtor(
    debtorId: string,
    organizationId: string,
  ): Promise<DebtorPreference> {
    let preferences = await this.preferencesRepo.findOne({
      where: { debtorId, organizationId },
    });

    if (!preferences) {
      this.logger.log(
        `Creating default preferences for debtor ${debtorId} in org ${organizationId}`,
      );

      // Create default preferences (FDCPA compliant defaults)
      preferences = this.preferencesRepo.create({
        debtorId,
        organizationId,
        doNotContact: false,
        optedOutChannels: [],
        allowedStartHour: 8, // FDCPA: 8am earliest
        allowedEndHour: 21, // FDCPA: 9pm latest
        dailyContactLimit: 3, // Reasonable default
        preferredLanguage: 'en',
      });

      preferences = await this.preferencesRepo.save(preferences);

      this.logger.log(`Default preferences created for debtor ${debtorId}`);
    }

    return preferences;
  }

  /**
   * Update preferences
   */
  async update(
    debtorId: string,
    organizationId: string,
    updateData: UpdatePreferenceDto,
    debtorInitiated = false,
  ): Promise<DebtorPreference> {
    this.logger.log(
      `Updating preferences for debtor ${debtorId} in org ${organizationId} (debtor-initiated: ${debtorInitiated})`,
    );

    // Get existing preferences (or create defaults)
    const preferences = await this.findByDebtor(debtorId, organizationId);

    // Apply updates
    Object.assign(preferences, updateData);

    // Track if debtor self-updated
    if (debtorInitiated) {
      preferences.lastUpdatedByDebtorAt = new Date();
    }

    const updated = await this.preferencesRepo.save(preferences);

    this.logger.log(
      `Preferences updated for debtor ${debtorId}. Do Not Contact: ${updated.doNotContact}, Opted Out Channels: ${JSON.stringify(updated.optedOutChannels)}`,
    );

    return updated;
  }

  /**
   * Check if communication is allowed for a specific channel
   */
  async canContact(
    debtorId: string,
    organizationId: string,
    channel: PreferenceChannel,
  ): Promise<boolean> {
    const preferences = await this.findByDebtor(debtorId, organizationId);

    // Global do not contact overrides everything
    if (preferences.doNotContact) {
      this.logger.warn(
        `Contact blocked: Debtor ${debtorId} has global do-not-contact flag`,
      );
      return false;
    }

    // Check channel-specific opt-out
    if (preferences.optedOutChannels.includes(channel)) {
      this.logger.warn(
        `Contact blocked: Debtor ${debtorId} opted out of ${channel}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Record opt-out request
   */
  async optOut(
    debtorId: string,
    organizationId: string,
    channel?: PreferenceChannel,
  ): Promise<DebtorPreference> {
    this.logger.log(
      `Recording opt-out for debtor ${debtorId} in org ${organizationId}${channel ? ` (channel: ${channel})` : ' (all channels)'}`,
    );

    const preferences = await this.findByDebtor(debtorId, organizationId);

    if (channel) {
      // Channel-specific opt-out
      if (!preferences.optedOutChannels.includes(channel)) {
        preferences.optedOutChannels.push(channel);
      }
    } else {
      // Global opt-out
      preferences.doNotContact = true;
    }

    preferences.lastUpdatedByDebtorAt = new Date();

    const updated = await this.preferencesRepo.save(preferences);

    this.logger.log(
      `Opt-out recorded for debtor ${debtorId}${channel ? ` (${channel})` : ' (all channels)'}`,
    );

    return updated;
  }

  /**
   * Opt back in (reverse opt-out)
   */
  async optIn(
    debtorId: string,
    organizationId: string,
    channel?: PreferenceChannel,
  ): Promise<DebtorPreference> {
    this.logger.log(
      `Recording opt-in for debtor ${debtorId} in org ${organizationId}${channel ? ` (channel: ${channel})` : ' (all channels)'}`,
    );

    const preferences = await this.findByDebtor(debtorId, organizationId);

    if (channel) {
      // Remove channel from opted-out list
      preferences.optedOutChannels = preferences.optedOutChannels.filter(
        (c) => c !== channel,
      );
    } else {
      // Clear global opt-out
      preferences.doNotContact = false;
      preferences.optedOutChannels = [];
    }

    preferences.lastUpdatedByDebtorAt = new Date();

    const updated = await this.preferencesRepo.save(preferences);

    this.logger.log(
      `Opt-in recorded for debtor ${debtorId}${channel ? ` (${channel})` : ' (all channels)'}`,
    );

    return updated;
  }

  /**
   * Delete preferences (for debtor removal/GDPR)
   */
  async remove(debtorId: string, organizationId: string): Promise<void> {
    this.logger.log(
      `Deleting preferences for debtor ${debtorId} in org ${organizationId}`,
    );

    await this.preferencesRepo.delete({ debtorId, organizationId });

    this.logger.log(`Preferences deleted for debtor ${debtorId}`);
  }
}
