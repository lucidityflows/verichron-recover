// apps/api-debtors/src/profiles/errors/email-conflict.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';
/**
 * * Exception thrown when an email is already associated with a different debtor identity.
 * * Error Code: DEBTORS_PROFILE_009
 **/

export class EmailConflictException extends BaseException {
    constructor(email: string) {
    super(
        `Email '${email}' is already associated with a different debtor.`,
        HttpStatus.CONFLICT,
        'DEBTORS_PROFILE_009'
    );
}}
