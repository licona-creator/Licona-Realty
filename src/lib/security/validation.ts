/**
 * Input Validation and Sanitization
 *
 * Server-side validation for all input fields. Client-side validation
 * is a UX convenience only — this is the security boundary.
 *
 * All inputs validated before database writes.
 * SQL injection protected via Supabase parameterized queries.
 * XSS protected via DOMPurify sanitization.
 */

import DOMPurify from 'isomorphic-dompurify';

// ============================================
// Email Validation (RFC 5322 simplified)
// ============================================

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): { valid: boolean; sanitized: string } {
  const trimmed = email.trim().toLowerCase();
  return {
    valid: EMAIL_REGEX.test(trimmed) && trimmed.length <= 254,
    sanitized: trimmed,
  };
}

// ============================================
// Phone Validation (E.164 format)
// ============================================

const PHONE_E164_REGEX = /^\+[1-9]\d{1,14}$/;

export function validatePhone(phone: string): { valid: boolean; sanitized: string } {
  // Strip all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // If no country code, assume US (+1)
  const withCountry = cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;
  return {
    valid: PHONE_E164_REGEX.test(withCountry),
    sanitized: withCountry,
  };
}

// ============================================
// UUID Validation
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

// ============================================
// Password Validation
// ============================================

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 12) errors.push('Must be at least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('Must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Must contain at least one number');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Must contain at least one special character');
  }

  let strength: PasswordValidation['strength'] = 'weak';
  if (errors.length === 0) {
    if (password.length >= 20) strength = 'strong';
    else if (password.length >= 16) strength = 'good';
    else strength = 'fair';
  }

  return { valid: errors.length === 0, errors, strength };
}

// ============================================
// Text Sanitization (XSS prevention)
// ============================================

export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function sanitizePlainText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// ============================================
// File Upload Validation
// ============================================

// Magic bytes for allowed file types
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],  // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // ZIP-based (docx)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]], // ZIP-based (xlsx)
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export interface FileValidation {
  valid: boolean;
  error: string | null;
}

export async function validateFile(
  file: File,
  allowedTypes: string[]
): Promise<FileValidation> {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size of 25MB' };
  }

  // Check declared MIME type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }

  // Validate magic bytes
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const signatures = FILE_SIGNATURES[file.type];

  if (signatures) {
    const matchesMagicBytes = signatures.some((sig) =>
      sig.every((byte, i) => bytes[i] === byte)
    );
    if (!matchesMagicBytes) {
      return {
        valid: false,
        error: 'File content does not match its declared type',
      };
    }
  }

  return { valid: true, error: null };
}

// Allowed document upload types
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

// ============================================
// General Input Sanitization
// ============================================

export function sanitizeInput(input: string, maxLength = 1000): string {
  // Trim, limit length, remove null bytes, and sanitize
  return sanitizePlainText(input.trim().slice(0, maxLength).replace(/\0/g, ''));
}

// ============================================
// ZIP code validation
// ============================================

export function validateZipCode(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip.trim());
}

// ============================================
// Currency/Number validation
// ============================================

export function validatePositiveNumber(value: unknown): boolean {
  const num = Number(value);
  return !isNaN(num) && num >= 0 && isFinite(num);
}
