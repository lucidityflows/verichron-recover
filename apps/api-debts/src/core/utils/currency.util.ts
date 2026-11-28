/**
 * Currency utility functions for safe decimal arithmetic.
 *
 * These utilities avoid floating-point precision errors by working
 * with integers (cents) internally, then converting to decimal strings.
 *
 * This is crucial for financial applications where precision is required.
 *
 * @example
 * // Safe addition
 * addCurrency('123.45', '67.89', '10.00'); // '201.34'
 *
 * // Safe subtraction
 * subtractCurrency('100.00', '45.67'); // '54.33'
 *
 * // Safe multiplication
 * multiplyCurrency('12.50', 3); // '37.50'
 */

/**
 * Safely add multiple currency values using integer arithmetic.
 *
 * Converts each value to cents, performs integer addition, then
 * converts back to dollars with 2 decimal places.
 *
 * @param values - Currency values as strings (e.g., "123.45") or numbers
 * @returns Sum as string with 2 decimal places (e.g., "246.90")
 */
export function addCurrency(...values: (string | number)[]): string {
  const totalCents = values.reduce((sum: number, value) => {
    const cents = Math.round(parseFloat(String(value)) * 100);
    return sum + cents;
  }, 0);

  return (totalCents / 100).toFixed(2);
}

/**
 * Safely subtract one currency value from another using integer arithmetic.
 *
 * @param minuend - Value to subtract from (e.g., "100.00")
 * @param subtrahend - Value to subtract (e.g., "45.67")
 * @returns Difference as string with 2 decimal places (e.g., "54.33")
 */
export function subtractCurrency(
  minuend: string | number,
  subtrahend: string | number,
): string {
  const minuendCents = Math.round(parseFloat(String(minuend)) * 100);
  const subtrahendCents = Math.round(parseFloat(String(subtrahend)) * 100);

  return ((minuendCents - subtrahendCents) / 100).toFixed(2);
}

/**
 * Safely multiply a currency value by a scalar using integer arithmetic.
 *
 * @param value - Currency value (e.g., "12.50")
 * @param multiplier - Scalar to multiply by (e.g., 3)
 * @returns Product as string with 2 decimal places (e.g., "37.50")
 */
export function multiplyCurrency(
  value: string | number,
  multiplier: number,
): string {
  const cents = Math.round(parseFloat(String(value)) * 100);
  const productCents = Math.round(cents * multiplier);

  return (productCents / 100).toFixed(2);
}

/**
 * Convert a currency value to cents (integer representation).
 *
 * Useful when you need to work with integer values for calculations.
 *
 * @param value - Currency value (e.g., "12.50")
 * @returns Value in cents as integer (e.g., 1250)
 */
export function toCents(value: string | number): number {
  return Math.round(parseFloat(String(value)) * 100);
}

/**
 * Convert cents to currency string with 2 decimal places.
 *
 * @param cents - Value in cents (e.g., 1250)
 * @returns Currency string (e.g., "12.50")
 */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
