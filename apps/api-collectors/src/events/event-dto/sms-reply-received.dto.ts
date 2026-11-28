import { SmsReplyReceivedPayload } from "@verichron/events";
import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, IsArray } from "class-validator";

export class SmsReplyReceivedDto implements SmsReplyReceivedPayload {
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
    @IsNotEmpty()
    replyContent: string;

    @IsString()
    @IsNotEmpty()
    fromPhone: string;

    @IsString()
    @IsNotEmpty()
    toPhone: string;

    @IsString()
    @IsOptional()
    providerMessageId?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    mediaUrls?: string[];
}
