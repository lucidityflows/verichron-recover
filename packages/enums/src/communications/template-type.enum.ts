/**
 * Template Type Enum
 *
 * Represents communication types that have renderable content templates.
 * These are communications where we use Handlebars/similar to generate
 * content from a template + context variables.
 *
 * - EMAIL: HTML/text templates with subject and body
 * - SMS: Plain text templates (character limits apply)
 * - LETTER: Rich text/HTML templates for print formatting
 *
 * Note: CALL is NOT included because phone calls don't use templates -
 * they're manual interactions logged for compliance/analytics.
 */
export enum TemplateType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  LETTER = 'LETTER',
}
