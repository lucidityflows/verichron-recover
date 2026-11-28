import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IDebtorFocusView } from '@verichron/contracts';
import {
  DebtorFocusDebtorDto,
  DebtorFocusDebtDto,
  DebtorFocusTimelineEventDto,
  DebtorFocusPaymentHistoryDto,
  DebtorFocusDocumentDto,
  DebtorFocusNoteDto,
  DebtorFocusSummaryDto,
  FdcpaFlagsDto, // Added
} from './sub-dtos';

/**
 * Response DTO for debtor focus view
 *
 * Contains the complete 360-degree view of a debtor aggregated from all services.
 */
export class DebtorFocusResponseDto implements IDebtorFocusView {
  @ApiProperty({ description: 'Debtor profile details', type: () => DebtorFocusDebtorDto })
  debtor: DebtorFocusDebtorDto;

  @ApiProperty({ description: 'List of debts associated with the debtor', type: () => [DebtorFocusDebtDto] })
  debts: DebtorFocusDebtDto[];

  @ApiProperty({ description: 'Chronological timeline of events for the debtor', type: () => [DebtorFocusTimelineEventDto] })
  timeline: DebtorFocusTimelineEventDto[];

  @ApiProperty({ description: 'Payment history for the debtor', type: () => [DebtorFocusPaymentHistoryDto] })
  paymentHistory: DebtorFocusPaymentHistoryDto[];

  @ApiProperty({ description: 'List of documents related to the debtor', type: () => [DebtorFocusDocumentDto] })
  documents: DebtorFocusDocumentDto[];

  @ApiProperty({ description: 'Notes added for the debtor', type: () => [DebtorFocusNoteDto] })
  notes: DebtorFocusNoteDto[];

  @ApiProperty({ description: 'List of actions available for the debtor', type: [String] })
  availableActions: string[];

  @ApiProperty({ description: 'Summary statistics for the debtor', type: () => DebtorFocusSummaryDto })
  summary: DebtorFocusSummaryDto;

  @ApiProperty({ description: 'FDCPA compliance flags for the debtor', type: () => FdcpaFlagsDto })
  fdcpaFlags: FdcpaFlagsDto; // Added
}
