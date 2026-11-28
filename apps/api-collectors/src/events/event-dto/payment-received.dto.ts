import { PaymentMethod } from "@verichron/enums";
import { PaymentReceivedPayload } from "@verichron/events";
import { IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator";

export class PaymentReceivedDto implements PaymentReceivedPayload {
    @IsUUID()
    @IsNotEmpty()
    paymentId: string;

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorId: string;

    @IsUUID()
    @IsNotEmpty()
    debtId: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    currency: string;

    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;

    @IsISO8601()
    @IsNotEmpty()
    receivedAt: string;
}
