import { EmailReplyReceivedPayload } from "@verichron/events";
import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, IsEmail } from "class-validator";

export class EmailReplyReceivedDto implements EmailReplyReceivedPayload {
    @IsUUID()
    @IsNotEmpty()
    logId: string;

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorId: string;

    @IsISO8601()
    @IsNotEmpty()
    repliedAt: string;

    @IsString()
    @IsOptional()
    subject?: string;

    @IsString()
    @IsOptional()
    replyContent?: string;

    @IsEmail()
    @IsNotEmpty()
    fromEmail: string;

    @IsEmail()
    @IsNotEmpty()
    toEmail: string;

    @IsString()
    @IsOptional()
    providerMessageId?: string;
}
