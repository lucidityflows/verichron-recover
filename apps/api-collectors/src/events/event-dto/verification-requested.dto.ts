import { VerificationType } from "@verichron/enums";
import { VerificationRequestedPayload } from "@verichron/events";
import { IsEnum, IsISO8601, IsNotEmpty, IsObject, IsString, IsUUID } from "class-validator";

export class VerificationRequestedDto implements VerificationRequestedPayload {
    @IsUUID()
    @IsNotEmpty()
    verificationId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorProfileId: string;

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsEnum(VerificationType)
    @IsNotEmpty()
    verificationType: VerificationType;

    @IsObject()
    @IsNotEmpty()
    inputData: Record<string, any>;

    @IsISO8601()
    @IsNotEmpty()
    requestedAt: string;

    @IsString()
    @IsNotEmpty()
    requestedBy: string;
}
