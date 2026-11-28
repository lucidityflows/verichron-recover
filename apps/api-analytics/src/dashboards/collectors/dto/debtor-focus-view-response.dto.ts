import { IsArray, IsString, IsNumber, IsBoolean, IsOptional, IsEnum, ValidateNested, IsDate, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import type {
  IDebtorFocusView,
  IDebtorFocusDebtor,
  IDebtorFocusDebt,
  IDebtorFocusTimelineEvent,
  IDebtorFocusPaymentHistory,
  IDebtorFocusDocument,
  IDebtorFocusNote,
  IDebtorFocusSummary,
  IFdcpaFlags,
  IDebtorAddress,
  IDebtorEmail,
  IDebtorPhone,
  IMetadata,
} from '@verichron/contracts';
import { PreferredContactMethod, OptOutStatus, TimelineEventType, AddressCategory, EmailCategory, EmailBounceStatus, PhoneCategory } from '@verichron/enums';

class DebtorAddressDto implements IDebtorAddress {
  @IsString()
  id: string;

  @IsString()
  debtorProfileId: string;

  @IsEnum(AddressCategory)
  addressCategory: AddressCategory;

  @IsString()
  street1: string;

  @IsString()
  @IsOptional()
  street2?: string;

  @IsString()
  @IsOptional()
  street3?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  postalCode: string;

  @IsString()
  country: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsBoolean()
  isVerified: boolean;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  verifiedAt?: Date;

  @IsBoolean()
  isCurrent: boolean;

  @IsBoolean()
  isPrimary: boolean;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

class DebtorEmailDto implements IDebtorEmail {
  @IsString()
  id: string;

  @IsString()
  debtorProfileId: string;

  @IsString()
  email: string;

  @IsEnum(EmailCategory)
  emailCategory: EmailCategory;

  @IsBoolean()
  isPrimary: boolean;

  @IsBoolean()
  isVerified: boolean;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  verifiedAt?: Date;

  @IsEnum(EmailBounceStatus)
  bounceStatus: EmailBounceStatus;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastBouncedAt?: Date;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

class DebtorPhoneDto implements IDebtorPhone {
  @IsString()
  id: string;

  @IsString()
  debtorProfileId: string;

  @IsString()
  phoneNumber: string;

  @IsEnum(PhoneCategory)
  category: PhoneCategory;

  @IsBoolean()
  isPrimary: boolean;

  @IsBoolean()
  isVerified: boolean;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  verifiedAt?: Date;

  @IsBoolean()
  canReceiveSms: boolean;

  @IsBoolean()
  canReceiveCalls: boolean;

  @IsBoolean()
  isOptedOut: boolean;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  optedOutAt?: Date;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

class DebtorDto implements IDebtorFocusDebtor {
  @IsString()
  id: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => DebtorEmailDto)
  email: IDebtorEmail | null;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => DebtorPhoneDto)
  phone: IDebtorPhone | null;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => DebtorAddressDto)
  address: IDebtorAddress | null;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dateOfBirth: Date | null;

  @IsString()
  @IsOptional()
  ssnLast4: string | null;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsString()
  @IsOptional()
  notes: string | null;

  @IsEnum(PreferredContactMethod)
  preferredContactMethod: PreferredContactMethod;

  @IsString()
  @IsOptional()
  preferredContactTime: string | null;

  @IsBoolean()
  doNotContact: boolean;

  @IsString()
  @IsOptional()
  bankruptcyStatus: string | null;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  deceasedDate: Date | null;

  @IsEnum(OptOutStatus)
  optOutStatus: OptOutStatus;

  @IsOptional()
  attorneyInfo: any | null;
}

class DebtDto implements IDebtorFocusDebt {
  @IsString()
  id: string;

  @IsString()
  accountNumber: string;

  @IsString()
  originalCreditorName: string;

  @IsString()
  debtType: string;

  @IsString()
  status: string;

  @IsNumber()
  principalAmount: number;

  @IsNumber()
  interestAmount: number;

  @IsNumber()
  feesAmount: number;

  @IsNumber()
  currentBalance: number;

  @IsNumber()
  daysOverdue: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  lastPaymentDate: Date | null;

  @IsNumber()
  @IsOptional()
  lastPaymentAmount: number | null;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  nextPaymentDue: Date | null;

  @IsBoolean()
  hasPaymentPlan: boolean;

  @IsBoolean()
  hasDispute: boolean;

  @IsNumber()
  @IsOptional()
  ltpScore?: number;
}

class TimelineEventDto implements IDebtorFocusTimelineEvent {
  @IsString()
  id: string;

  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @IsEnum(TimelineEventType)
  eventType: TimelineEventType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  performedBy: string;

  @IsString()
  performedByName: string;

  @IsString()
  @IsOptional()
  relatedDebtId: string | null;

  @IsObject()
  metadata: IMetadata;
}

class PaymentHistoryDto implements IDebtorFocusPaymentHistory {
  @IsString()
  id: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsNumber()
  amount: number;

  @IsString()
  debtId: string;

  @IsString()
  debtAccountNumber: string;

  @IsString()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  transactionId: string | null;

  @IsString()
  status: string;
}

class DocumentDto implements IDebtorFocusDocument {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsDate()
  @Type(() => Date)
  uploadedAt: Date;

  @IsString()
  uploadedBy: string;

  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  debtId: string | null;
}

class NoteDto implements IDebtorFocusNote {
  @IsString()
  id: string;

  @IsString()
  content: string;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsString()
  createdBy: string;

  @IsString()
  createdByName: string;

  @IsBoolean()
  isSystemGenerated: boolean;

  @IsString()
  @IsOptional()
  debtId: string | null;
}

class SummaryDto implements IDebtorFocusSummary {
  @IsNumber()
  totalDebt: number;

  @IsNumber()
  totalPaid: number;

  @IsNumber()
  remainingBalance: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  oldestDebtDate: Date | null;

  @IsNumber()
  @IsOptional()
  daysSinceLastContact: number | null;

  @IsNumber()
  @IsOptional()
  daysSinceLastPayment: number | null;

  @IsNumber()
  activeDebtsCount: number;

  @IsNumber()
  paidDebtsCount: number;
}

class FdcpaFlagsDto implements IFdcpaFlags {
  @IsBoolean()
  isDeceased: boolean;

  @IsBoolean()
  isBankrupt: boolean;

  @IsBoolean()
  hasCeaseAndDesist: boolean;

  @IsBoolean()
  hasDispute: boolean;

  @IsBoolean()
  isRepresented: boolean;
}

/**
 * Debtor Focus View Response DTO
 * Implements IDebtorFocusView from @verichron/contracts
 */
export class DebtorFocusViewResponseDto implements IDebtorFocusView {
  @ValidateNested()
  @Type(() => DebtorDto)
  debtor: DebtorDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtDto)
  debts: DebtDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimelineEventDto)
  timeline: TimelineEventDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentHistoryDto)
  paymentHistory: PaymentHistoryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents: DocumentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteDto)
  notes: NoteDto[];

  @IsArray()
  @IsString({ each: true })
  availableActions: string[];

  @ValidateNested()
  @Type(() => SummaryDto)
  summary: SummaryDto;

  @ValidateNested()
  @Type(() => FdcpaFlagsDto)
  fdcpaFlags: FdcpaFlagsDto;
}
