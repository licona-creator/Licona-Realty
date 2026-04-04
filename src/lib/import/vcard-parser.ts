/**
 * vCard (.vcf) Parser Library
 *
 * Parses iPhone-exported vCard files containing 500+ contacts.
 * Handles:
 * - BEGIN:VCARD / END:VCARD boundaries
 * - Folded lines (continuation lines starting with space/tab)
 * - Quoted-printable encoding (=XX hex codes)
 * - Multiple phone numbers and emails with type labels
 * - PHOTO fields are skipped entirely (base64 image data)
 * - Various birthday formats (YYYY-MM-DD, YYYYMMDD, --MM-DD)
 * - Semicolon-delimited address fields
 */

export interface ParsedPhone {
  number: string;
  type: string; // CELL, HOME, WORK, etc.
}

export interface ParsedEmail {
  address: string;
  type: string;
}

export interface ParsedAddress {
  po_box: string;
  suite: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ParsedBirthday {
  month: number;
  day: number;
  year: number | null;
}

export interface ParsedContact {
  first_name: string;
  last_name: string;
  full_name: string;
  phones: ParsedPhone[];
  emails: ParsedEmail[];
  birthday: ParsedBirthday | null;
  company: string;
  job_title: string;
  address: ParsedAddress | null;
  notes: string;
}

/**
 * Unfold continuation lines per RFC 6350.
 * Lines that start with a space or tab are continuations of the previous line.
 */
function unfoldLines(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

/**
 * Decode quoted-printable encoded strings.
 * Converts =XX hex codes back to characters and handles soft line breaks (=\n).
 */
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

/**
 * Extract the type label from a vCard property parameter string.
 * e.g. "TYPE=CELL" or "type=home" or "CELL" (Apple shorthand)
 */
function extractType(params: string): string {
  const upper = params.toUpperCase();

  // Look for TYPE= parameter
  const typeMatch = upper.match(/TYPE=([A-Z_]+)/);
  if (typeMatch) return typeMatch[1];

  // Apple-style shorthand: just the type name as a parameter
  const knownTypes = ['CELL', 'MOBILE', 'HOME', 'WORK', 'FAX', 'PAGER', 'VOICE', 'MAIN', 'IPHONE', 'OTHER'];
  for (const t of knownTypes) {
    if (upper.includes(t)) return t;
  }

  return 'OTHER';
}

/**
 * Check if a line is a PHOTO property (should be skipped).
 * PHOTO lines contain base64 image data that can span many lines.
 */
function isPhotoLine(line: string): boolean {
  return line.toUpperCase().startsWith('PHOTO');
}

/**
 * Parse a single vCard block into a ParsedContact.
 */
function parseVCard(block: string): ParsedContact {
  const contact: ParsedContact = {
    first_name: '',
    last_name: '',
    full_name: '',
    phones: [],
    emails: [],
    birthday: null,
    company: '',
    job_title: '',
    address: null,
    notes: '',
  };

  const lines = block.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.startsWith('BEGIN:') || line.startsWith('END:') || line.startsWith('VERSION:')) {
      continue;
    }

    // Skip PHOTO fields entirely
    if (isPhotoLine(line)) continue;

    // Split property name/params from value
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const propPart = line.substring(0, colonIdx);
    let value = line.substring(colonIdx + 1);

    // Check for quoted-printable encoding
    if (propPart.toUpperCase().includes('ENCODING=QUOTED-PRINTABLE')) {
      value = decodeQuotedPrintable(value);
    }

    const propName = propPart.split(';')[0].toUpperCase();
    const params = propPart.substring(propName.length);

    switch (propName) {
      case 'N': {
        // N:Last;First;Middle;Prefix;Suffix
        const parts = value.split(';');
        contact.last_name = (parts[0] || '').trim();
        contact.first_name = (parts[1] || '').trim();
        break;
      }

      case 'FN': {
        contact.full_name = value.trim();
        break;
      }

      case 'TEL': {
        const phoneType = extractType(params);
        const number = value.trim();
        if (number) {
          contact.phones.push({ number, type: phoneType });
        }
        break;
      }

      case 'EMAIL': {
        const emailType = extractType(params);
        const address = value.trim();
        if (address) {
          contact.emails.push({ address, type: emailType });
        }
        break;
      }

      case 'BDAY': {
        contact.birthday = parseBirthday(value.trim());
        break;
      }

      case 'ORG': {
        // ORG can have semicolon-separated divisions
        contact.company = value.split(';')[0].trim();
        break;
      }

      case 'TITLE': {
        contact.job_title = value.trim();
        break;
      }

      case 'ADR': {
        // ADR:PO Box;Suite;Street;City;State;ZIP;Country
        const parts = value.split(';');
        contact.address = {
          po_box: (parts[0] || '').trim(),
          suite: (parts[1] || '').trim(),
          street: (parts[2] || '').trim(),
          city: (parts[3] || '').trim(),
          state: (parts[4] || '').trim(),
          zip: (parts[5] || '').trim(),
          country: (parts[6] || '').trim(),
        };
        break;
      }

      case 'NOTE': {
        contact.notes = value.trim();
        break;
      }
    }
  }

  // Fallback: if no first/last name from N field, derive from FN
  if (!contact.first_name && !contact.last_name && contact.full_name) {
    const spaceIdx = contact.full_name.indexOf(' ');
    if (spaceIdx > 0) {
      contact.first_name = contact.full_name.substring(0, spaceIdx);
      contact.last_name = contact.full_name.substring(spaceIdx + 1);
    } else {
      contact.first_name = contact.full_name;
    }
  }

  // If full_name was not set, build it from first + last
  if (!contact.full_name && (contact.first_name || contact.last_name)) {
    contact.full_name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  }

  return contact;
}

/**
 * Parse a birthday string from various vCard formats.
 */
function parseBirthday(value: string): ParsedBirthday | null {
  if (!value) return null;

  // Format: --MM-DD (year unknown, common on iPhone)
  const noYearMatch = value.match(/^--(\d{2})-(\d{2})$/);
  if (noYearMatch) {
    return {
      month: parseInt(noYearMatch[1], 10),
      day: parseInt(noYearMatch[2], 10),
      year: null,
    };
  }

  // Format: YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10),
      year: parseInt(isoMatch[1], 10),
    };
  }

  // Format: YYYYMMDD
  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return {
      month: parseInt(compactMatch[2], 10),
      day: parseInt(compactMatch[3], 10),
      year: parseInt(compactMatch[1], 10),
    };
  }

  return null;
}

/**
 * Parse a complete vCard file containing one or more contacts.
 *
 * @param fileContent - The raw text content of a .vcf file
 * @returns An array of parsed contact objects
 */
export function parseVCardFile(fileContent: string): ParsedContact[] {
  // First unfold continuation lines
  const unfolded = unfoldLines(fileContent);

  // Split into individual vCard blocks
  const blocks: string[] = [];
  const regex = /BEGIN:VCARD[\s\S]*?END:VCARD/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(unfolded)) !== null) {
    blocks.push(match[0]);
  }

  return blocks.map(parseVCard);
}
