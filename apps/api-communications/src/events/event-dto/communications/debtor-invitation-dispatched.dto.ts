import { IsNotEmpty, IsUUID, IsEmail } from 'class-validator';
import type { DebtorInvitationDispatchedPayload } from '@verichron/events';

export class DebtorInvitationDispatchedDto implements DebtorInvitationDispatchedPayload {
    
    @IsUUID()
    @IsNotEmpty()
    debtorProfileId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorIdentityId: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

}