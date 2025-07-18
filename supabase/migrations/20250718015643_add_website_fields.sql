-- Add website URL field to clubs table
ALTER TABLE clubs 
ADD COLUMN website_url TEXT;

-- Add website URL field to locations table
ALTER TABLE locations 
ADD COLUMN website_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN clubs.website_url IS 'Website URL for the club';
COMMENT ON COLUMN locations.website_url IS 'Website URL for the location';
