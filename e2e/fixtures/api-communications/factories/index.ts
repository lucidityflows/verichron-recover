/**
 * api-communications Factories
 *
 * Data factories for creating test data in the api-communications database.
 * Follow the service-aligned fixtures architecture pattern.
 */

export {
  TemplateFactory,
  createTemplateFactory,
  type CreateTemplateOptions,
  type Template,
  type TemplateType,
} from './templateFactory';

export {
  DebtorPreferenceFactory,
  createDebtorPreferenceFactory,
  type CreateDebtorPreferenceOptions,
  type DebtorPreference,
  type CommunicationChannel,
} from './debtorPreferenceFactory';
