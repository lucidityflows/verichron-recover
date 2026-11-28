import { ApiProperty } from '@nestjs/swagger';
import { IAuthOrganizationListResponse, IOrganizationSelection } from '@verichron/contracts';

class OrganizationSelectionDto implements IOrganizationSelection {
  @ApiProperty({ description: 'The ID of the organization', type: 'string', nullable: true })
  organizationId: string | null;

  @ApiProperty({ description: 'The name of the organization', type: 'string', nullable: true })
  organizationName: string | null;

  @ApiProperty({ description: 'The user\'s role in the organization' })
  role: string;
}

export class AuthOrganizationListResponseDto implements IAuthOrganizationListResponse {
  @ApiProperty({
    description: 'A list of organizations the user is a member of',
    type: [OrganizationSelectionDto],
  })
  organizations: OrganizationSelectionDto[];
}
