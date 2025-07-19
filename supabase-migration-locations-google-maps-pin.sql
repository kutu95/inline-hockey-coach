-- Migration: Add Google Maps pin field to locations table
-- This migration adds a google_maps_pin field to store Google Maps pin data

-- Add google_maps_pin column to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_maps_pin TEXT;

-- Add comment to document the field
COMMENT ON COLUMN locations.google_maps_pin IS 'Google Maps pin data (can be a place ID, coordinates, or custom pin data)';

-- Create index for better performance when searching by pin data
CREATE INDEX IF NOT EXISTS idx_locations_google_maps_pin ON locations(google_maps_pin) WHERE google_maps_pin IS NOT NULL;

-- Update existing locations to have a default pin if needed (optional)
-- This is commented out as it's optional and depends on your needs
-- UPDATE locations SET google_maps_pin = 'default_pin_data' WHERE google_maps_pin IS NULL; 