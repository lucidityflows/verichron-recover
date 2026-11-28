import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import type { UserMembershipEntity } from './user-membership.entity';
import type { UserEmailEntity } from './user-email.entity';
import type { UserAddressEntity } from './user-address.entity';
import type { UserPhoneNumberEntity } from './user-phone-number.entity';
import { UserStatus } from '@verichron/enums';

@Entity('users')
export class UserEntity {
  @ApiProperty({
    description: 'The unique identifier for the user.',
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ApiProperty({ description: "The user's first name.", example: 'John' })
  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @ApiProperty({ description: "The user's middle name", example: "Ezekial"})
  @Column({ name: 'middle_name', type: 'varchar', length: 255, nullable: true })
  middleName: string | null;

  @ApiProperty({ description: "The user's last name.", example: 'Doe' })
  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @ApiProperty({ description: "The user's name suffix.", example: "Jr."})
  @Column({ name: 'suffix', type: 'varchar', length: 255, nullable: true })
  suffix: string | null;

  @ApiProperty({
    description: "The user's unique email address.",
    example: 'john.doe@example.com',
    format: 'email',
  })
  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  @Exclude()
  passwordHash: string | null;

  @ApiProperty({
    description: 'The current status of the user account.',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @Column({ name: 'status', type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ name: 'invitation_token', type: 'varchar', nullable: true })
  @Exclude()
  invitationToken: string | null;

  @Column({ name: 'invitation_expires_at', type: 'timestamp', nullable: true })
  invitationExpiresAt: Date | null;

  @Column({ name: 'password_reset_token', type: 'varchar', nullable: true })
  @Exclude()
  passwordResetToken: string | null;

  @Column({ name: 'password_reset_expires_at', type: 'timestamp', nullable: true })
  passwordResetExpiresAt: Date | null;

  @OneToMany('UserMembershipEntity', (membership: UserMembershipEntity) => membership.user)
  memberships: UserMembershipEntity[];

  @OneToMany('UserEmailEntity', (email: UserEmailEntity) => email.user)
  emails: UserEmailEntity[];

  @OneToMany('UserAddressEntity', (address: UserAddressEntity) => address.user)
  addresses: UserAddressEntity[];

  @OneToMany('UserPhoneNumberEntity', (phoneNumber: UserPhoneNumberEntity) => phoneNumber.user)
  phoneNumbers: UserPhoneNumberEntity[];

  @ApiProperty({ description: 'The timestamp when the user record was created.' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'The timestamp when the user record was last updated.' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
