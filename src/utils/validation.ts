/**
 * Sanitizes input text to allow ONLY Unicode letters (Arabic/English) and spaces.
 */
export function sanitizeName(value: string): string {
  return value.replace(/[^\p{L}\s]/gu, '');
}

/**
 * Sanitizes input text to allow ONLY positive numeric digits (0-9).
 */
export function sanitizePositiveDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Checks if a name string is valid (non-empty and contains only letters and spaces).
 */
export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^[\p{L}\s]+$/u.test(trimmed);
}

/**
 * Checks if a string contains only positive digits (0-9).
 */
export function isValidPositiveDigits(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/.test(trimmed);
}
