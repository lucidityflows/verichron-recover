import { DebtCreatedPayload } from "@verichron/events";
import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class DebtCreatedDto implements DebtCreatedPayload {
    @IsUUID()
    @IsNotEmpty()
    debtId: string;

    @IsUUID()
    @IsOptional()
    debtorIdentityId?: string;

    @IsUUID()
    @IsNotEmpty()
    debtorProfileId: string;

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    currency: string;

    @IsString()
    @IsNotEmpty()
    status: string;

    @IsISO8601()
    @IsNotEmpty()
    createdAt: string;
}
