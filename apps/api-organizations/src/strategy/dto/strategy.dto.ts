import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsString, IsEnum, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthorityRoleType } from '../entities/approval-threshold.entity';

export class SettlementMatrixRowDto {
  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  minBalance!: number;

  @ApiProperty({ example: 500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBalance?: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  minAgeDays!: number;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAgeDays?: number;

  @ApiProperty({ example: 25.00 })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercent!: number;
}

export class UpdateSettlementStrategyDto {
  @ApiProperty({ type: [SettlementMatrixRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementMatrixRowDto)
  matrix!: SettlementMatrixRowDto[];

  @ApiProperty({ example: 'STRATEGY', description: 'Mandatory Audit Reason Code' })
  @IsString()
  reasonCode!: string;

  @ApiProperty({ example: 'Quarterly review', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ApprovalThresholdDto {
  @ApiProperty({ enum: AuthorityRoleType, enumName: 'AuthorityRoleType' })
  @IsEnum(AuthorityRoleType)
  roleType!: AuthorityRoleType;

  @ApiProperty({ example: 20.00 })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxDiscountPercent!: number;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDollarAmount?: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  maxPlanDurationMonths!: number;

  @ApiProperty({ example: 10.00 })
  @IsNumber()
  @Min(0)
  @Max(100)
  minDownPaymentPercent!: number;
}

export class UpdateApprovalLadderDto {
  @ApiProperty({ type: [ApprovalThresholdDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalThresholdDto)
  thresholds!: ApprovalThresholdDto[];

  @ApiProperty({ example: 'STRATEGY' })
  @IsString()
  reasonCode!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
