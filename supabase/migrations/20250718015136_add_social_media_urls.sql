-- Add social media URL fields to organizations table
ALTER TABLE organizations 
ADD COLUMN facebook_url TEXT,
ADD COLUMN instagram_url TEXT;

-- Add social media URL fields to clubs table
ALTER TABLE clubs 
ADD COLUMN facebook_url TEXT,
ADD COLUMN instagram_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN organizations.facebook_url IS 'Facebook page URL for the organization';
COMMENT ON COLUMN organizations.instagram_url IS 'Instagram profile URL for the organization';
COMMENT ON COLUMN clubs.facebook_url IS 'Facebook page URL for the club';
COMMENT ON COLUMN clubs.instagram_url IS 'Instagram profile URL for the club';
