import { CommunicationCadence } from '@verichron/enums';

/**
 * Organization communication preferences settings interface
 */
export interface IOrganizationCommunicationPreferencesSettings {
  defaultCommunicationCadence?: CommunicationCadence;
  optOutOfSmsGlobally?: boolean;
  preferredContactTimeStart?: string;
  preferredContactTimeEnd?: string;
}
