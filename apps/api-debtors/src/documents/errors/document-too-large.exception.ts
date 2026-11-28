// document-too-large.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when uploaded file exceeds size limit
 * Error Code: DEBTORS_DOCUMENT_005
 */
export class DocumentTooLargeException extends BaseException {
  constructor(fileSize: number, maxSize: number) {
    super(
      `Document size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes.`,
      HttpStatus.BAD_REQUEST,
      'DEBTORS_DOCUMENT_005'
    );
  }
}