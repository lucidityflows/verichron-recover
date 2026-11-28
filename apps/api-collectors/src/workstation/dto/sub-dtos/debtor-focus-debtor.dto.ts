import { ApiProperty } from '@nestjs/swagger';
import { IDebtorFocusDebtor } from '@verichron/contracts'; // Only import interface from contracts
import { PreferredContactMethod, OptOutStatus } from '@verichron/enums'; // Import enums from enums
import { AddressDto } from './address.dto'; // Import new DTO
import { EmailDto } from './email.dto';     // Import new DTO
import { PhoneDto } from './phone.dto';     // Import new DTO

export class DebtorFocusDebtorDto implements IDebtorFocusDebtor {
  @ApiProperty({ description: "Debtor's unique identifier", example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: "Debtor's first name", example: 'John' })
  firstName: string;

  @ApiProperty({ description: "Debtor's last name", example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: "Debtor's primary email address", type: () => EmailDto, nullable: true })
  email: EmailDto | null; // Changed to use EmailDto

  @ApiProperty({ description: "Debtor's primary phone number", type: () => PhoneDto, nullable: true })
  phone: PhoneDto | null; // Changed to use PhoneDto

  @ApiProperty({ description: "Debtor's primary address", type: () => AddressDto, nullable: true })
  address: AddressDto | null; // Changed to use AddressDto

  @ApiProperty({ description: "Debtor's date of birth", example: '1980-01-15T00:00:00.000Z', nullable: true })
  dateOfBirth: Date | null;

  @ApiProperty({ description: 'Last 4 digits of SSN', example: '1234', nullable: true })
  ssnLast4: string | null;

  @ApiProperty({ description: 'Tags associated with the debtor', example: ['high-risk', 'payment-plan'], type: [String] })
  tags: string[];

  @ApiProperty({ description: 'General notes about the debtor', example: 'Called on 2025-11-20, promised payment.', nullable: true })
  notes: string | null;

  @ApiProperty({
    description: 'The preferred method of contact',
    enum: PreferredContactMethod,
    enumName: 'PreferredContactMethod',
    example: PreferredContactMethod.PHONE,
  })
  preferredContactMethod: PreferredContactMethod;

  @ApiProperty({ description: 'The preferred time of day to contact', example: 'morning', nullable: true })
  preferredContactTime: string | null;

  @ApiProperty({ description: 'Flag to indicate if debtor should not be contacted', example: false })
  doNotContact: boolean;

  @ApiProperty({ description: 'Current bankruptcy status, if any', example: 'Chapter 7', nullable: true })
  bankruptcyStatus: string | null;

  @ApiProperty({ description: 'Date the debtor was reported as deceased', example: '2023-05-10T00:00:00.000Z', nullable: true })
  deceasedDate: Date | null;

  @ApiProperty({
    description: 'Communication opt-out status',
    enum: OptOutStatus,
    enumName: 'OptOutStatus',
    example: OptOutStatus.NONE,
  })
  optOutStatus: OptOutStatus;

  @ApiProperty({ description: 'Information about the debtor\'s attorney', example: null, nullable: true })
  attorneyInfo: any | null; // Added based on orchestrator error
}