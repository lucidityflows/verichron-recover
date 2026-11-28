import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { UserEntity } from './user.entity';
import { PhoneCategory } from '@verichron/enums';

@Entity('user_phone_numbers')
export class UserPhoneNumberEntity {
  @ApiProperty({ description: 'The unique identifier for the phone number record.', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ApiProperty({ description: 'The ID of the user this phone number belongs to.', format: 'uuid' })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({ description: 'Indicates if this is the user\'s primary phone number.', default: false })
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ApiProperty({ description: 'The phone number.', example: '15551234567' })
  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  @ApiProperty({ enum: PhoneCategory, description: 'The category of the phone number.', example: PhoneCategory.MOBILE })
  @Column({ name: 'category', type: 'enum', enum: PhoneCategory, default: PhoneCategory.MOBILE })
  category: PhoneCategory;

  @ApiProperty({ description: 'The timestamp when the phone number record was created.' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'The timestamp when the phone number record was last updated.' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne('UserEntity', (user: UserEntity) => user.phoneNumbers)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
