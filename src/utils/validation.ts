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
  return trimmed.length >= 2 && /^[\p{L}\s]+$/u.test(trimmed);
}

/**
 * Checks if a string contains only positive digits (0-9).
 */
export function isValidPositiveDigits(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/.test(trimmed);
}

/**
 * Syrian Phone Number Validation:
 * Must be exactly 10 digits starting with 09 (e.g. 0912345678, 0933112233).
 */
export function isValidSyrianPhone(value: string, required = false): boolean {
  const trimmed = value.trim();
  if (!trimmed) return !required;
  return /^09\d{8}$/.test(trimmed);
}

/**
 * Returns a user-friendly error message for Syrian phone numbers.
 */
export function getSyrianPhoneError(value: string, required = false): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? 'يرجى إدخال رقم الهاتف' : null;
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'رقم الهاتف يجب أن يحتوي على أرقام فقط';
  }
  if (!trimmed.startsWith('09')) {
    return 'يجب أن يبدأ رقم الهاتف بـ 09 (مثال: 0912345678)';
  }
  if (trimmed.length !== 10) {
    return `رقم الهاتف يتألف من 10 أرقام (أدخلت ${trimmed.length} أرقام)`;
  }
  return null;
}

/**
 * Syrian National ID Validation:
 * Must be exactly 11 numeric digits.
 */
export function isValidSyrianNationalId(value: string): boolean {
  const trimmed = value.trim();
  return /^\d{11}$/.test(trimmed);
}

/**
 * Returns a user-friendly error message for Syrian National ID.
 */
export function getSyrianNationalIdError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'يرجى إدخال الرقم الوطني (11 رقماً)';
  }
  if (!/^\d+$/.test(trimmed)) {
    return 'الرقم الوطني يجب أن يحتوي على أرقام فقط';
  }
  if (trimmed.length < 11) {
    return `الرقم الوطني غير مكتمل (${trimmed.length} من 11 رقماً)`;
  }
  if (trimmed.length > 11) {
    return `الرقم الوطني أطول من اللازم (${trimmed.length} من 11 رقماً)`;
  }
  return null;
}
