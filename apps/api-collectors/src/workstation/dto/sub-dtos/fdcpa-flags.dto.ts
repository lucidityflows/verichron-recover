import { ApiProperty } from '@nestjs/swagger';
import { IFdcpaFlags } from '@verichron/contracts';

export class FdcpaFlagsDto implements IFdcpaFlags {
  @ApiProperty({ description: 'True if the debtor is deceased', example: false })
  isDeceased: boolean;

  @ApiProperty({ description: 'True if the debtor has filed for bankruptcy', example: false })
  isBankrupt: boolean;

  @ApiProperty({ description: 'True if the debtor has issued a cease and desist', example: false })
  hasCeaseAndDesist: boolean;

  @ApiProperty({ description: 'True if there is an active dispute on the debt', example: false })
  hasDispute: boolean;

  @ApiProperty({ description: 'True if the debtor is represented by an attorney', example: false })
  isRepresented: boolean;
}
