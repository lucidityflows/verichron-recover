import { EVENT_TYPES } from '@verichron/events';
import {
  DebtorCreatedDto,
  DebtorUpdatedDto,
  DebtorAddressUpdatedDto,
  DebtorEmailUpdatedDto,
  DebtorPhoneUpdatedDto,
  DebtorUserLinkedDto,
  DebtorVerificationStatusChangedDto,
  DebtorInformationReceivedDto,
  DebtorInvitationRequestedDto,
  DebtorIdentityCreatedDto,
  DebtorProfileCreatedDto
} from './debtors';
import { DemographicsCreatedDto, DemographicsUpdatedDto, DemographicsDeletedDto } from './demographics';
import { VerificationRequestedDto, VerificationCompletedDto, VerificationFailedDto } from './verifications';
import { DocumentUploadedDto, DocumentUpdatedDto, DocumentDeletedDto, DocumentArchivedDto } from './documents';
import { PortfolioDebtorBatchReadyDto } from './debts/portfolio-debtor-batch-ready.dto';
import { DebtorUserCreatedBatchDto } from './users/debtor-user-created-batch.dto';

/**
 * Mapping of event types to their corresponding DTO classes.
 * Useful for type-safe event handling and deserialization.
 */
export const EVENT_DTO_MAP = {
  // Identity events
  [EVENT_TYPES.DEBTORS_IDENTITY_CREATED]: DebtorIdentityCreatedDto,
  [EVENT_TYPES.DEBTORS_USER_LINKED]: DebtorUserLinkedDto,

  // Profile events
  [EVENT_TYPES.DEBTORS_PROFILE_CREATED]: DebtorProfileCreatedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_UPDATED]: DebtorUpdatedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_ADDRESS_UPDATED]: DebtorAddressUpdatedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_EMAIL_UPDATED]: DebtorEmailUpdatedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_PHONE_UPDATED]: DebtorPhoneUpdatedDto,
  [EVENT_TYPES.DEBTORS_INVITATION_REQUESTED]: DebtorInvitationRequestedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_VERIFICATION_STATUS_CHANGED]: DebtorVerificationStatusChangedDto,
  [EVENT_TYPES.DEBTORS_PROFILE_INFORMATION_RECEIVED]: DebtorInformationReceivedDto,

  // Demographics events
  [EVENT_TYPES.DEBTORS_DEMOGRAPHICS_CREATED]: DemographicsCreatedDto,
  [EVENT_TYPES.DEBTORS_DEMOGRAPHICS_UPDATED]: DemographicsUpdatedDto,
  [EVENT_TYPES.DEBTORS_DEMOGRAPHICS_DELETED]: DemographicsDeletedDto,

  // Verification events
  [EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED]: VerificationRequestedDto,
  [EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_COMPLETED]: VerificationCompletedDto,
  [EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_FAILED]: VerificationFailedDto,

  // Document events
  [EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_UPLOADED]: DocumentUploadedDto,
  [EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_UPDATED]: DocumentUpdatedDto,
  [EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_DELETED]: DocumentDeletedDto,
  [EVENT_TYPES.DEBTORS_DOCUMENTS_DOCUMENT_ARCHIVED]: DocumentArchivedDto,

  // Subscribed events from other domains (api-debts)
  [EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY]: PortfolioDebtorBatchReadyDto,

  // Subscribed events from other domains (api-users)
  [EVENT_TYPES.USERS_DEBTOR_USER_CREATED_BATCH]: DebtorUserCreatedBatchDto,
} as const;
