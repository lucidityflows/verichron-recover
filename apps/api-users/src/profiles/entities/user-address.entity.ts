import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UserEntity } from './user.entity';
import { AddressCategory } from '@verichron/enums';


@Entity('user_addresses')
export class UserAddressEntity {
  @ApiProperty({ description: 'The unique identifier for the address record.', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id'} )
  id: string;

  @ApiProperty({ description: 'The ID of the user this address belongs to.', format: 'uuid' })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255, name: 'street1' })
  street1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'street2' })
  street2?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'street3' })
  street3?: string;

  @Column({ type: 'varchar', length: 100, name: 'city' })
  city!: string;

  @Column({ type: 'varchar', length: 2, name: 'state' })
  state!: string;

  @Column({ type: 'varchar', length: 10, name: 'postal_code' })
  postalCode!: string;

  @Column({ type: 'varchar', length: 2, default: 'US', name: 'country' })
  country!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'latitude' })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'longitude' })
  longitude?: number;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;

  @Column({
    type: 'enum',
    enum: AddressCategory,
    name: 'address_category',
  })
  addressCategory!: AddressCategory;

  @ApiProperty({ description: 'The timestamp when the address record was created.' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'The timestamp when the address record was last updated.' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne('UserEntity', (user: UserEntity) => user.addresses)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
