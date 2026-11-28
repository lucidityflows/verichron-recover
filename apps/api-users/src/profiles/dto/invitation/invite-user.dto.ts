import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { IInviteUser } from '@verichron/contracts';

export class InviteUserDto implements IInviteUser {
  @ApiProperty({
    description: 'The email address of the user to invite.',
    example: 'new.employee@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'The first name of the invited user.',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'The last name of the invited user.',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'The ID of the role to assign to the new user within the organization.',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    format: 'uuid',
  })
  @IsUUID()
  roleId: string;

  // Optional: If you ever support inviting users to other orgs (future)
  // @ApiPropertyOptional({
  //   description: 'The organization to invite the user to. Defaults to the requesting user\'s organization.',
  //   format: 'uuid',
  // })
  // @IsOptional()
  // @IsUUID()
  // organizationId?: string;
}


// @Post()
// @ApiOperation({ 
//   summary: 'Invite a new user to your organization',
//   description: 'Creates a user in PENDING status and sends an invitation email. The user will be added to the organization extracted from your JWT.'
// })
// async inviteUser(
//   @Body() dto: InviteUserDto,
//   @OrganizationId() organizationId: string, // ← Extracted from JWT
// ) {
//   return this.profilesService.inviteUser(dto, organizationId);
// }