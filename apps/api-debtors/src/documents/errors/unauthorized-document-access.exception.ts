
// unauthorized-document-access.exception.ts
import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a user attempts to access a document they don't have permission for
 * Error Code: DEBTORS_DOCUMENT_002
 */
export class UnauthorizedDocumentAccessException extends BaseException {
  constructor(documentId: string, organizationId: string) {
    super(
      `Organization '${organizationId}' does not have access to document '${documentId}'.`,
      HttpStatus.FORBIDDEN,
      'DEBTORS_DOCUMENT_002'
    );
  }
}
