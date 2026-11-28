import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { BaseResponseDto } from '../../core/dto/base-response.dto';
import { AddressCategory } from '@verichron/enums';
import { IOrganizationAddressResponse } from '@verichron/contracts';

/**
 * Response DTO for organization address data
 */
@Exclude()
export class AddressResponseDto extends BaseResponseDto implements IOrganizationAddressResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;

  @Expose()
  @ApiProperty({
    description: 'Street address line 1',
    example: '123 Main Street',
  })
  street1!: string;

  @Expose()
  @ApiProperty({
    description: 'Street address line 2',
    example: 'Suite 400',
    required: false,
  })
  street2?: string;

  @Expose()
  @ApiProperty({
    description: 'Street address line 3',
    example: 'Building B',
    required: false,
  })
  street3?: string;

  @Expose()
  @ApiProperty({
    description: 'City',
    example: 'New York',
  })
  city!: string;

  @Expose()
  @ApiProperty({
    description: 'State abbreviation',
    example: 'NY',
  })
  state!: string;

  @Expose()
  @ApiProperty({
    description: 'Postal code / ZIP code',
    example: '10001',
  })
  postalCode!: string;

  @Expose()
  @ApiProperty({
    description: 'Country code',
    example: 'US',
  })
  country!: string;

  @Expose()
  @ApiProperty({
    description: 'Latitude for geocoding',
    example: 40.7128,
    required: false,
  })
  latitude?: number;

  @Expose()
  @ApiProperty({
    description: 'Longitude for geocoding',
    example: -74.006,
    required: false,
  })
  longitude?: number;

  @Expose()
  @ApiProperty({
    description: 'Is this the primary address for the organization',
    example: true,
  })
  isPrimary!: boolean;

  @Expose()
  @ApiProperty({
    description: 'Address category/type',
    enum: AddressCategory,
    enumName: 'AddressCategory',
    example: AddressCategory.HEADQUARTERS,
  })
  addressCategory!: AddressCategory;
}
