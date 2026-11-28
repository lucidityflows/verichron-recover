/**
 * Shared validation utilities
 */

/**
 * Email validation regex (RFC 5322 simplified)
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * US Tax ID / EIN validation regex (XX-XXXXXXX format)
 */
export const TAX_ID_REGEX = /^\d{2}-\d{7}$/;

/**
 * Phone number validation regex (various formats)
 */
export const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;

/**
 * URL validation regex
 */
export const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates a US Tax ID / EIN
 */
export function isValidTaxId(taxId: string): boolean {
  return TAX_ID_REGEX.test(taxId.trim());
}

/**
 * Validates a phone number
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url.trim());
}

/**
 * Validates required field (not empty)
 */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validates minimum length
 */
export function hasMinLength(value: string, min: number): boolean {
  return value.trim().length >= min;
}

/**
 * Validates maximum length
 */
export function hasMaxLength(value: string, max: number): boolean {
  return value.trim().length <= max;
}

/**
 * Validates string length range
 */
export function hasLengthBetween(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

/**
 * Formats Tax ID to XX-XXXXXXX format
 */
export function formatTaxId(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
}

/**
 * Formats phone number to (XXX) XXX-XXXX format
 */
export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  taxId: 'Tax ID must be in XX-XXXXXXX format',
  phone: 'Please enter a valid phone number',
  url: 'Please enter a valid URL',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  lengthBetween: (min: number, max: number) => `Must be between ${min} and ${max} characters`,
};

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Comprehensive field validator
 */
export function validateField(
  value: any,
  rules: {
    required?: boolean;
    email?: boolean;
    taxId?: boolean;
    phone?: boolean;
    url?: boolean;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => boolean;
    customMessage?: string;
  }
): ValidationResult {
  // Required check
  if (rules.required && !isRequired(value)) {
    return { isValid: false, error: VALIDATION_MESSAGES.required };
  }

  // Skip other validations if not required and empty
  if (!rules.required && !isRequired(value)) {
    return { isValid: true };
  }

  const stringValue = String(value);

  // Email validation
  if (rules.email && !isValidEmail(stringValue)) {
    return { isValid: false, error: VALIDATION_MESSAGES.email };
  }

  // Tax ID validation
  if (rules.taxId && !isValidTaxId(stringValue)) {
    return { isValid: false, error: VALIDATION_MESSAGES.taxId };
  }

  // Phone validation
  if (rules.phone && !isValidPhone(stringValue)) {
    return { isValid: false, error: VALIDATION_MESSAGES.phone };
  }

  // URL validation
  if (rules.url && !isValidUrl(stringValue)) {
    return { isValid: false, error: VALIDATION_MESSAGES.url };
  }

  // Min length
  if (rules.minLength !== undefined && !hasMinLength(stringValue, rules.minLength)) {
    return { isValid: false, error: VALIDATION_MESSAGES.minLength(rules.minLength) };
  }

  // Max length
  if (rules.maxLength !== undefined && !hasMaxLength(stringValue, rules.maxLength)) {
    return { isValid: false, error: VALIDATION_MESSAGES.maxLength(rules.maxLength) };
  }

  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    return { isValid: false, error: rules.customMessage || 'Validation failed' };
  }

  return { isValid: true };
}
