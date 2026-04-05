-- Add 'sphere' to track_type enum
-- This value is used throughout the application for sphere-of-influence contacts
-- but was missing from the original PostgreSQL enum definition.

ALTER TYPE track_type ADD VALUE IF NOT EXISTS 'sphere';
