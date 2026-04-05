-- Fix contacts where last_name was incorrectly set to first_name during vCard import.
-- This happened because the buildRow function used: last_name: lastName || firstName || 'Contact'
-- which fell back to firstName when lastName was empty string (falsy).
UPDATE contacts
SET last_name = '', updated_at = now()
WHERE import_source = 'iphone_vcf'
  AND first_name = last_name
  AND first_name != ''
  AND is_deleted = false;
