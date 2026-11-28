import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsString, IsNotEmpty, IsEmail } from "class-validator";

// profiles/dto/provision-initial-admin.dto.ts
export class ProvisionInitialAdminDto {
  @ApiProperty({
    description: 'The organization ID from the OrganizationCreated event',
    format: 'uuid',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    description: 'The organization name',
    example: 'Acme Collections',
  })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({
    description: 'Initial admin email address',
    example: 'admin@acme.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Initial admin first name',
    example: 'Jane',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Initial admin last name',
    example: 'Smith',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}
