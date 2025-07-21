-- Create media_attachments table for storing drill and session media files
CREATE TABLE IF NOT EXISTS media_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_type TEXT NOT NULL CHECK (file_type IN ('video', 'audio', 'image', 'animation')),
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    duration_seconds INTEGER, -- For video/audio files
    frame_count INTEGER, -- For animations
    frame_rate INTEGER, -- For animations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create drill_media table to link media to drills
CREATE TABLE IF NOT EXISTS drill_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_attachments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(drill_id, media_id)
);

-- Create session_media table to link media to sessions
CREATE TABLE IF NOT EXISTS session_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_attachments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, media_id)
);

-- Add RLS policies for media_attachments table
ALTER TABLE media_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view media attachments
CREATE POLICY "Authenticated users can view media attachments" ON media_attachments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert media attachments
CREATE POLICY "Authenticated users can insert media attachments" ON media_attachments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update media attachments
CREATE POLICY "Authenticated users can update media attachments" ON media_attachments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete media attachments
CREATE POLICY "Authenticated users can delete media attachments" ON media_attachments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add RLS policies for drill_media table
ALTER TABLE drill_media ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view drill media
CREATE POLICY "Authenticated users can view drill media" ON drill_media
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert drill media
CREATE POLICY "Authenticated users can insert drill media" ON drill_media
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete drill media
CREATE POLICY "Authenticated users can delete drill media" ON drill_media
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add RLS policies for session_media table
ALTER TABLE session_media ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view session media
CREATE POLICY "Authenticated users can view session media" ON session_media
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert session media
CREATE POLICY "Authenticated users can insert session media" ON session_media
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can delete session media
CREATE POLICY "Authenticated users can delete session media" ON session_media
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_attachments_file_type ON media_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_drill_media_drill_id ON drill_media(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_media_media_id ON drill_media(media_id);
CREATE INDEX IF NOT EXISTS idx_session_media_session_id ON session_media(session_id);
CREATE INDEX IF NOT EXISTS idx_session_media_media_id ON session_media(media_id);

-- Create trigger to update updated_at timestamp for media_attachments
CREATE OR REPLACE FUNCTION update_media_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_attachments_updated_at
    BEFORE UPDATE ON media_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_media_attachments_updated_at(); 