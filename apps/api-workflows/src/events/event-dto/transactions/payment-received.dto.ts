import { IsUUID, IsString, IsNumber, IsEnum, IsISO8601, IsNotEmpty } from "class-validator";
import { PaymentReceivedPayload } from "@verichron/events/dist";
import { PaymentMethod } from "@verichron/enums";


export class PaymentReceivedDto implements PaymentReceivedPayload {

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;
    
    @IsUUID()
    @IsNotEmpty()
    paymentId: string;

    @IsUUID()
    @IsNotEmpty()
    debtId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorId: string;

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
