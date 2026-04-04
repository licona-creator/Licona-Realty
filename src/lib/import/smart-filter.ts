/**
 * Smart Contact Filter Engine
 *
 * Classifies parsed vCard contacts into categories:
 * - people: Valid contacts ready for import
 * - businesses: Company-only entries or matching business patterns
 * - duplicates: Already exist in the database (by phone or email)
 * - insufficient: Missing name AND phone AND email
 *
 * Also handles name cleanup, phone normalization, and birthday parsing.
 */

import type { ParsedContact, ParsedPhone } from './vcard-parser';

export interface ClassifiedContact {
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  phone_type: string;
  all_phones: Array<{ number: string; type: string; normalized: string }>;
  email: string;
  all_emails: Array<{ address: string; type: string }>;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_year: number | null;
  company: string;
  job_title: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  filter_reason?: string;
  duplicate_match?: {
    existing_name: string;
    existing_id: string;
    match_type: 'phone' | 'email';
  };
  _selected: boolean;
}

export interface ClassificationResult {
  people: ClassifiedContact[];
  businesses: ClassifiedContact[];
  duplicates: ClassifiedContact[];
  insufficient: ClassifiedContact[];
}

export interface ExistingContact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
}

// Business name pattern keywords (case-insensitive)
const BUSINESS_KEYWORDS = [
  'llc', 'inc', 'corp', 'ltd', 'co.', 'association', 'foundation',
  'church', 'school', 'university', 'hospital', 'clinic', 'insurance',
  'bank', 'credit union', 'mortgage', 'restaurant', 'pizza', 'burger',
  'taco', 'auto', 'repair', 'plumbing', 'electric', 'hvac', 'dental',
  'salon', 'spa', 'gym', 'storage', 'cleaners', 'laundry', 'airlines',
  'hotel', 'motel',
];

const BUSINESS_PREFIXES = [
  'the ', 'city of ', 'county of ', 'state of ', 'department of ',
];

const TOLL_FREE_AREA_CODES = ['800', '888', '877', '866', '855', '844'];

/**
 * Normalize a phone number by stripping non-digits and removing leading country code.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

/**
 * Check if a name matches known business patterns.
 */
function isBusinessName(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();

  // Check business keywords
  for (const kw of BUSINESS_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }

  // Check business prefixes
  for (const prefix of BUSINESS_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }

  // Single word with no spaces (likely a business like "Walgreens" or "Target")
  if (lower.length > 0 && !lower.includes(' ')) return true;

  return false;
}

/**
 * Check if any phone number has a toll-free area code.
 */
function hasTollFreePhone(phones: ParsedPhone[]): boolean {
  for (const p of phones) {
    const normalized = normalizePhone(p.number);
    if (normalized.length === 10) {
      const areaCode = normalized.substring(0, 3);
      if (TOLL_FREE_AREA_CODES.includes(areaCode)) return true;
    }
  }
  return false;
}

/**
 * Properly capitalize a name: "john smith" -> "John Smith", "JOHN" -> "John"
 */
function capitalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Select the primary phone from a list of phones.
 * Prefer CELL/MOBILE/IPHONE type, otherwise use the first one.
 */
function selectPrimaryPhone(phones: Array<{ number: string; type: string; normalized: string }>): { number: string; type: string; normalized: string } | null {
  if (phones.length === 0) return null;

  const cellTypes = ['CELL', 'MOBILE', 'IPHONE'];
  const cell = phones.find((p) => cellTypes.includes(p.type.toUpperCase()));
  return cell || phones[0];
}

/**
 * Convert a ParsedContact into a ClassifiedContact with normalized fields.
 */
function toClassified(parsed: ParsedContact): ClassifiedContact {
  // Normalize phones
  const allPhones = parsed.phones.map((p) => ({
    number: p.number,
    type: p.type,
    normalized: normalizePhone(p.number),
  }));

  const primary = selectPrimaryPhone(allPhones);

  // Build address line
  let addressLine = '';
  let city = '';
  let state = '';
  let zip = '';
  if (parsed.address) {
    const parts = [parsed.address.po_box, parsed.address.suite, parsed.address.street].filter(Boolean);
    addressLine = parts.join(', ');
    city = parsed.address.city;
    state = parsed.address.state;
    zip = parsed.address.zip;
  }

  return {
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    full_name: parsed.full_name,
    phone: primary ? primary.normalized : '',
    phone_type: primary ? primary.type : '',
    all_phones: allPhones,
    email: parsed.emails.length > 0 ? parsed.emails[0].address : '',
    all_emails: parsed.emails,
    birthday_month: parsed.birthday?.month ?? null,
    birthday_day: parsed.birthday?.day ?? null,
    birthday_year: parsed.birthday?.year ?? null,
    company: parsed.company,
    job_title: parsed.job_title,
    address_line_1: addressLine,
    city,
    state,
    zip_code: zip,
    notes: parsed.notes,
    _selected: true,
  };
}

/**
 * Classify an array of parsed contacts through the smart filter pipeline.
 *
 * @param parsedContacts - Contacts parsed from vCard file
 * @param existingContacts - Current contacts from the database for dedup
 * @returns Classification result with people, businesses, duplicates, insufficient
 */
export function classifyContacts(
  parsedContacts: ParsedContact[],
  existingContacts: ExistingContact[] = []
): ClassificationResult {
  const result: ClassificationResult = {
    people: [],
    businesses: [],
    duplicates: [],
    insufficient: [],
  };

  // Build lookup maps for existing contacts
  const existingPhoneMap = new Map<string, ExistingContact>();
  const existingEmailMap = new Map<string, ExistingContact>();

  for (const ec of existingContacts) {
    if (ec.phone) {
      const normalized = normalizePhone(ec.phone);
      if (normalized.length >= 10) {
        existingPhoneMap.set(normalized.slice(-10), ec);
      }
    }
    if (ec.email) {
      existingEmailMap.set(ec.email.toLowerCase(), ec);
    }
  }

  for (const parsed of parsedContacts) {
    const classified = toClassified(parsed);

    // RULE 1: Insufficient data
    const hasName = !!(classified.first_name || classified.last_name || classified.full_name);
    const hasPhone = classified.all_phones.length > 0;
    const hasEmail = classified.all_emails.length > 0;

    if (!hasName && !hasPhone && !hasEmail) {
      classified.filter_reason = 'Insufficient data (no name, phone, or email)';
      classified._selected = false;
      result.insufficient.push(classified);
      continue;
    }

    // RULE 2: Business detection
    const hasFirstAndLast = !!(classified.first_name && classified.last_name);
    const hasCompany = !!classified.company;
    const isBusiness = detectBusiness(classified, hasFirstAndLast, hasCompany, parsed);

    if (isBusiness) {
      classified._selected = false;
      result.businesses.push(classified);
      continue;
    }

    // RULE 3: Smart name cleanup
    if (!classified.first_name && classified.full_name) {
      const spaceIdx = classified.full_name.indexOf(' ');
      if (spaceIdx > 0) {
        classified.first_name = classified.full_name.substring(0, spaceIdx);
        classified.last_name = classified.full_name.substring(spaceIdx + 1);
      } else {
        classified.first_name = classified.full_name;
      }
    }

    classified.first_name = capitalizeName(classified.first_name);
    classified.last_name = capitalizeName(classified.last_name);
    classified.full_name = [classified.first_name, classified.last_name].filter(Boolean).join(' ');

    // RULE 5: Deduplication
    const dupResult = checkDuplicate(classified, existingPhoneMap, existingEmailMap);
    if (dupResult) {
      classified.duplicate_match = dupResult;
      classified.filter_reason = `Matches ${dupResult.existing_name} by ${dupResult.match_type}`;
      classified._selected = false;
      result.duplicates.push(classified);
      continue;
    }

    // Passed all filters - ready to import
    result.people.push(classified);
  }

  return result;
}

/**
 * Detect if a contact is a business entry.
 */
function detectBusiness(
  classified: ClassifiedContact,
  hasFirstAndLast: boolean,
  hasCompany: boolean,
  parsed: ParsedContact
): boolean {
  // EXCEPTION: has both a company AND first+last name = person who works there
  if (hasCompany && hasFirstAndLast) {
    return false;
  }

  // Company-only entry (has ORG but no personal name)
  if (hasCompany && !classified.first_name && !classified.last_name) {
    classified.filter_reason = 'Business (company-only entry)';
    return true;
  }

  // Check full_name against business patterns
  const nameToCheck = classified.full_name || classified.first_name || classified.last_name;
  if (nameToCheck && isBusinessName(nameToCheck)) {
    // Single-word check: only flag if no first AND last name
    const lower = nameToCheck.toLowerCase().trim();
    const isSingleWord = !lower.includes(' ');

    if (isSingleWord && hasFirstAndLast) {
      // Person with a single-word last name is fine
      return false;
    }

    classified.filter_reason = `Business (name matches pattern: "${nameToCheck}")`;
    return true;
  }

  // Toll-free phone number
  if (hasTollFreePhone(parsed.phones)) {
    classified.filter_reason = 'Business (toll-free phone number)';
    return true;
  }

  return false;
}

/**
 * Check if a contact is a duplicate of an existing contact.
 */
function checkDuplicate(
  classified: ClassifiedContact,
  phoneMap: Map<string, ExistingContact>,
  emailMap: Map<string, ExistingContact>
): ClassifiedContact['duplicate_match'] | null {
  // Check phones
  for (const p of classified.all_phones) {
    const last10 = p.normalized.slice(-10);
    if (last10.length === 10) {
      const existing = phoneMap.get(last10);
      if (existing) {
        return {
          existing_name: `${existing.first_name} ${existing.last_name}`,
          existing_id: existing.id,
          match_type: 'phone',
        };
      }
    }
  }

  // Check emails
  for (const e of classified.all_emails) {
    const lower = e.address.toLowerCase();
    const existing = emailMap.get(lower);
    if (existing) {
      return {
        existing_name: `${existing.first_name} ${existing.last_name}`,
        existing_id: existing.id,
        match_type: 'email',
      };
    }
  }

  return null;
}
