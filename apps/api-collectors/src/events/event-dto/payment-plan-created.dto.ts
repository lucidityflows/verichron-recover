import { PaymentFrequency } from "@verichron/enums";
import { PaymentPlanCreatedPayload } from "@verichron/events";
import { IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsUUID } from "class-validator";

export class PaymentPlanCreatedDto implements PaymentPlanCreatedPayload {
    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorProfileId: string;

    @IsUUID()
    @IsNotEmpty()
    paymentPlanId: string;

    @IsISO8601()
    @IsNotEmpty()
    startDate: string;

    @IsISO8601()
    @IsNotEmpty()
    endDate: string;

    @IsNumber()
    @IsNotEmpty()
    installmentAmount: number;

    @IsEnum(PaymentFrequency)
    @IsNotEmpty()
    frequency: PaymentFrequency;

    @IsNumber()
    @IsNotEmpty()
    totalAmount: number;

    @IsISO8601()
    @IsNotEmpty()
    createdAt: string;
}
