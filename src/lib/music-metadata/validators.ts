/**
 * Music Metadata Validators
 *
 * Ported from Django Music Publisher (DMP) validators.py
 * Original: https://github.com/matijakolaric-com/django-music-publisher
 *
 * Validates industry-standard music identifiers with proper checksum verification:
 *   - ISRC  (ISO 3901)         — International Standard Recording Code
 *   - ISWC  (ISO 15707)        — International Standard Musical Work Code
 *   - IPI Name Number          — Interested Party Information (modulo-101)
 *   - IPI Base Number          — IPI Base with check digit
 *   - ISNI  (ISO 27729)        — International Standard Name Identifier (ISO 7064 MOD 97-10)
 *   - EAN   (ISO/IEC 15420)    — 13-digit barcode
 *   - DPID  (DDEX)             — DDEX Party Identifier
 *   - CWR Title                — CWR-safe character set
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type ValidatorFn = (value: string) => ValidationResult;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip all whitespace from a string */
function strip(value: string): string {
  return value.replace(/\s/g, "");
}

/** Return a failed ValidationResult */
function fail(error: string): ValidationResult {
  return { valid: false, error };
}

/** Return a passed ValidationResult */
function pass(): ValidationResult {
  return { valid: true };
}

// ---------------------------------------------------------------------------
// CWR Title Validator
// ---------------------------------------------------------------------------

/**
 * Validates that a title contains only CWR-safe characters.
 * CWR allows: A-Z, 0-9, space, and a defined set of punctuation.
 * Lowercase is accepted and will be treated as uppercase in CWR output.
 */
export function validateCwrTitle(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return fail("Title must not be empty.");
  }
  // CWR character set: letters, digits, space, and common punctuation
  const CWR_SAFE = /^[A-Za-z0-9 !#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~"]*$/;
  if (!CWR_SAFE.test(value)) {
    return fail(
      "Title contains characters not allowed in CWR. Use only ASCII letters, digits, and standard punctuation."
    );
  }
  if (value.length > 60) {
    return fail("Title must be 60 characters or fewer for CWR compliance.");
  }
  return pass();
}

// ---------------------------------------------------------------------------
// ISRC Validator  (ISO 3901)
// ---------------------------------------------------------------------------

/**
 * Validates an ISRC (International Standard Recording Code).
 *
 * Format: CC-XXX-YY-NNNNN
 *   CC    — 2-letter country code
 *   XXX   — 3-char registrant code (alphanumeric)
 *   YY    — 2-digit year
 *   NNNNN — 5-digit designation code
 *
 * Accepts with or without hyphens.
 *
 * @example validateIsrc("USRC17607839") // valid
 * @example validateIsrc("US-RC1-76-07839") // valid
 */
export function validateIsrc(value: string): ValidationResult {
  if (!value) return fail("ISRC must not be empty.");

  // Normalise: remove hyphens and spaces, uppercase
  const normalised = strip(value).replace(/-/g, "").toUpperCase();

  if (normalised.length !== 12) {
    return fail(
      `ISRC must be 12 characters (without hyphens), got ${normalised.length}.`
    );
  }

  // CC: 2 uppercase letters
  if (!/^[A-Z]{2}/.test(normalised)) {
    return fail("ISRC country code (first 2 chars) must be letters.");
  }

  // XXX: 3 alphanumeric chars
  if (!/^[A-Z]{2}[A-Z0-9]{3}/.test(normalised)) {
    return fail("ISRC registrant code (chars 3-5) must be alphanumeric.");
  }

  // YY: 2 digits
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{2}/.test(normalised)) {
    return fail("ISRC year (chars 6-7) must be digits.");
  }

  // NNNNN: 5 digits
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normalised)) {
    return fail("ISRC designation code (last 5 chars) must be digits.");
  }

  return pass();
}

/**
 * Normalise an ISRC to the canonical hyphenated format: CC-XXX-YY-NNNNN
 */
export function normaliseIsrc(value: string): string | null {
  const normalised = strip(value).replace(/-/g, "").toUpperCase();
  if (normalised.length !== 12) return null;
  return `${normalised.slice(0, 2)}-${normalised.slice(2, 5)}-${normalised.slice(5, 7)}-${normalised.slice(7)}`;
}

// ---------------------------------------------------------------------------
// ISWC Validator  (ISO 15707)
// ---------------------------------------------------------------------------

/**
 * Validates an ISWC (International Standard Musical Work Code).
 *
 * Format: T-NNNNNNNNN-C
 *   T     — literal "T"
 *   N×9   — 9-digit work identifier
 *   C     — 1-digit check digit (modulo-101)
 *
 * Check digit algorithm (modulo-101):
 *   sum = Σ(digit[i] × (i+1))  for i = 0..8
 *   check = (101 - (sum % 101)) % 101
 *
 * @example validateIswc("T-034524680-1") // valid
 */
export function validateIswc(value: string): ValidationResult {
  if (!value) return fail("ISWC must not be empty.");

  // Normalise: remove hyphens, dots, spaces; uppercase
  const normalised = strip(value).replace(/[-. ]/g, "").toUpperCase();

  if (!/^T\d{10}$/.test(normalised)) {
    return fail(
      "ISWC must be in format T-NNNNNNNNN-C (T followed by 10 digits)."
    );
  }

  const digits = normalised.slice(1); // 9 work digits + 1 check digit
  const workDigits = digits.slice(0, 9);
  const checkDigit = parseInt(digits[9], 10);

  // Modulo-101 check digit calculation
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(workDigits[i], 10) * (i + 1);
  }
  const expectedCheck = (101 - (sum % 101)) % 101;

  if (checkDigit !== expectedCheck) {
    return fail(
      `ISWC check digit is invalid. Expected ${expectedCheck}, got ${checkDigit}.`
    );
  }

  return pass();
}

/**
 * Normalise an ISWC to the canonical format: T-NNNNNNNNN-C
 */
export function normaliseIswc(value: string): string | null {
  const normalised = strip(value).replace(/[-. ]/g, "").toUpperCase();
  if (!/^T\d{10}$/.test(normalised)) return null;
  return `T-${normalised.slice(1, 10)}-${normalised[10]}`;
}

// ---------------------------------------------------------------------------
// IPI Name Number Validator  (modulo-101)
// ---------------------------------------------------------------------------

/**
 * Validates an IPI Name Number (Interested Party Information).
 *
 * Format: 11 digits
 * Check digit: last digit, modulo-101 algorithm
 *   sum = Σ(digit[i] × (i+1))  for i = 0..9
 *   check = (101 - (sum % 101)) % 101
 *
 * @example validateIpiName("00014107338") // valid
 */
export function validateIpiName(value: string): ValidationResult {
  if (!value) return fail("IPI Name Number must not be empty.");

  const normalised = strip(value).replace(/\s/g, "");

  if (!/^\d{11}$/.test(normalised)) {
    return fail("IPI Name Number must be exactly 11 digits.");
  }

  const digits = normalised.split("").map(Number);
  const checkDigit = digits[10];

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (i + 1);
  }
  const expectedCheck = (101 - (sum % 101)) % 101;

  if (checkDigit !== expectedCheck) {
    return fail(
      `IPI Name Number check digit is invalid. Expected ${expectedCheck}, got ${checkDigit}.`
    );
  }

  return pass();
}

// ---------------------------------------------------------------------------
// IPI Base Number Validator
// ---------------------------------------------------------------------------

/**
 * Validates an IPI Base Number.
 *
 * Format: I-NNNNNNNNN-C
 *   I     — literal "I"
 *   N×9   — 9-digit base identifier
 *   C     — 1-digit check digit (modulo-101, same as ISWC)
 *
 * @example validateIpiBase("I-000000229-7") // valid
 */
export function validateIpiBase(value: string): ValidationResult {
  if (!value) return fail("IPI Base Number must not be empty.");

  const normalised = strip(value).replace(/[-. ]/g, "").toUpperCase();

  if (!/^I\d{10}$/.test(normalised)) {
    return fail(
      "IPI Base Number must be in format I-NNNNNNNNN-C (I followed by 10 digits)."
    );
  }

  const digits = normalised.slice(1); // 9 base digits + 1 check digit
  const baseDigits = digits.slice(0, 9);
  const checkDigit = parseInt(digits[9], 10);

  // Same modulo-101 algorithm as ISWC
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(baseDigits[i], 10) * (i + 1);
  }
  const expectedCheck = (101 - (sum % 101)) % 101;

  if (checkDigit !== expectedCheck) {
    return fail(
      `IPI Base Number check digit is invalid. Expected ${expectedCheck}, got ${checkDigit}.`
    );
  }

  return pass();
}

// ---------------------------------------------------------------------------
// ISNI Validator  (ISO 27729 / ISO 7064 MOD 97-10)
// ---------------------------------------------------------------------------

/**
 * Validates an ISNI (International Standard Name Identifier).
 *
 * Format: 16 digits (last may be 'X' representing 10)
 * Check algorithm: ISO 7064 MOD 97-10
 *   Treat the 16-char string as a number; valid if (number % 97) === 1
 *
 * @example validateIsni("0000000121707484") // valid
 */
export function validateIsni(value: string): ValidationResult {
  if (!value) return fail("ISNI must not be empty.");

  // Normalise: remove spaces and hyphens, uppercase
  const normalised = strip(value).replace(/[\s-]/g, "").toUpperCase();

  if (!/^\d{15}[\dX]$/.test(normalised)) {
    return fail(
      "ISNI must be 16 characters: 15 digits followed by a digit or 'X'."
    );
  }

  // Replace trailing X with 10 for check calculation
  const checkStr = normalised.replace(/X$/, "10");

  // ISO 7064 MOD 97-10: process in chunks to avoid BigInt overflow in JS
  let remainder = 0;
  for (const char of checkStr) {
    remainder = (remainder * 10 + parseInt(char, 10)) % 97;
  }

  if (remainder !== 1) {
    return fail("ISNI check digit is invalid (ISO 7064 MOD 97-10 failed).");
  }

  return pass();
}

/**
 * Normalise an ISNI to the canonical grouped format: NNNN NNNN NNNN NNNN
 */
export function normaliseIsni(value: string): string | null {
  const normalised = strip(value).replace(/[\s-]/g, "").toUpperCase();
  if (!/^\d{15}[\dX]$/.test(normalised)) return null;
  return `${normalised.slice(0, 4)} ${normalised.slice(4, 8)} ${normalised.slice(8, 12)} ${normalised.slice(12)}`;
}

// ---------------------------------------------------------------------------
// EAN Validator  (ISO/IEC 15420 — 13-digit barcode)
// ---------------------------------------------------------------------------

/**
 * Validates a 13-digit EAN barcode (European Article Number / GTIN-13).
 *
 * Check digit algorithm:
 *   sum = Σ(digit[i] × weight[i])  where weight alternates 1, 3, 1, 3...
 *   check = (10 - (sum % 10)) % 10
 *
 * @example validateEan("4006381333931") // valid
 */
export function validateEan(value: string): ValidationResult {
  if (!value) return fail("EAN must not be empty.");

  const normalised = strip(value).replace(/[\s-]/g, "");

  if (!/^\d{13}$/.test(normalised)) {
    return fail("EAN must be exactly 13 digits.");
  }

  const digits = normalised.split("").map(Number);
  const checkDigit = digits[12];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const expectedCheck = (10 - (sum % 10)) % 10;

  if (checkDigit !== expectedCheck) {
    return fail(
      `EAN check digit is invalid. Expected ${expectedCheck}, got ${checkDigit}.`
    );
  }

  return pass();
}

// ---------------------------------------------------------------------------
// DPID Validator  (DDEX Party Identifier)
// ---------------------------------------------------------------------------

/**
 * Validates a DPID (DDEX Party Identifier).
 *
 * Format: PADPIDA + alphanumeric suffix (total 13 chars)
 * The prefix "PADPIDA" is mandatory; followed by 6 alphanumeric characters.
 *
 * @example validateDpid("PADPIDA2011062301O") // valid (18 chars total)
 */
export function validateDpid(value: string): ValidationResult {
  if (!value) return fail("DPID must not be empty.");

  const normalised = strip(value).toUpperCase();

  if (!normalised.startsWith("PADPIDA")) {
    return fail('DPID must start with "PADPIDA".');
  }

  const suffix = normalised.slice(7);
  if (suffix.length === 0) {
    return fail('DPID must have characters after "PADPIDA".');
  }

  if (!/^[A-Z0-9]+$/.test(suffix)) {
    return fail("DPID suffix must contain only alphanumeric characters.");
  }

  return pass();
}

// ---------------------------------------------------------------------------
// Composite validator factory
// ---------------------------------------------------------------------------

export type ValidatorType =
  | "title"
  | "isrc"
  | "iswc"
  | "ipi_name"
  | "ipi_base"
  | "isni"
  | "ean"
  | "dpid";

/**
 * Factory function that returns the appropriate validator for a given type.
 * Mirrors DMP's CWRFieldValidator class pattern.
 *
 * @example
 *   const validate = getValidator("isrc");
 *   const result = validate("USRC17607839");
 */
export function getValidator(type: ValidatorType): ValidatorFn {
  switch (type) {
    case "title":
      return validateCwrTitle;
    case "isrc":
      return validateIsrc;
    case "iswc":
      return validateIswc;
    case "ipi_name":
      return validateIpiName;
    case "ipi_base":
      return validateIpiBase;
    case "isni":
      return validateIsni;
    case "ean":
      return validateEan;
    case "dpid":
      return validateDpid;
    default:
      throw new Error(`Unknown validator type: ${type}`);
  }
}

// ---------------------------------------------------------------------------
// Convenience: validate and throw
// ---------------------------------------------------------------------------

/**
 * Validates a value and throws a descriptive Error if invalid.
 * Useful in API route handlers and server actions.
 *
 * @example
 *   assertValid("isrc", "USRC17607839"); // passes silently
 *   assertValid("iswc", "T-bad-value");  // throws Error
 */
export function assertValid(type: ValidatorType, value: string): void {
  const result = getValidator(type)(value);
  if (!result.valid) {
    throw new Error(`Invalid ${type.toUpperCase()}: ${result.error}`);
  }
}

// ---------------------------------------------------------------------------
// Batch validator for form objects
// ---------------------------------------------------------------------------

export interface WorkIdentifiers {
  iswc?: string | null;
  isrc?: string | null;
  ipiName?: string | null;
  ipiBase?: string | null;
  isni?: string | null;
}

/**
 * Validates all identifiers on a work/recording object.
 * Returns a map of field → error message (empty map = all valid).
 *
 * @example
 *   const errors = validateWorkIdentifiers({ iswc: "T-bad", isrc: "USRC17607839" });
 *   // errors.iswc = "ISWC must be in format T-NNNNNNNNN-C..."
 */
export function validateWorkIdentifiers(
  identifiers: WorkIdentifiers
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (identifiers.iswc) {
    const r = validateIswc(identifiers.iswc);
    if (!r.valid) errors.iswc = r.error!;
  }

  if (identifiers.isrc) {
    const r = validateIsrc(identifiers.isrc);
    if (!r.valid) errors.isrc = r.error!;
  }

  if (identifiers.ipiName) {
    const r = validateIpiName(identifiers.ipiName);
    if (!r.valid) errors.ipiName = r.error!;
  }

  if (identifiers.ipiBase) {
    const r = validateIpiBase(identifiers.ipiBase);
    if (!r.valid) errors.ipiBase = r.error!;
  }

  if (identifiers.isni) {
    const r = validateIsni(identifiers.isni);
    if (!r.valid) errors.isni = r.error!;
  }

  return errors;
}