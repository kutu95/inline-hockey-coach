-- Add animation_data_path column to media_attachments table
ALTER TABLE media_attachments 
ADD COLUMN IF NOT EXISTS animation_data_path TEXT,
ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT false;

-- Add comment to explain the new column
COMMENT ON COLUMN media_attachments.animation_data_path IS 'Path to the JSON file containing complete animation data for editing';
COMMENT ON COLUMN media_attachments.is_editable IS 'Flag indicating if this media contains editable animation data'; 