-- Game Videos Migration
-- This migration adds support for uploading and linking MP4 game video clips to session plans

-- 1. Create game_videos table
CREATE TABLE IF NOT EXISTS game_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    duration_seconds INTEGER,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_videos_organization_id ON game_videos(organization_id);
CREATE INDEX IF NOT EXISTS idx_game_videos_created_by ON game_videos(created_by);
CREATE INDEX IF NOT EXISTS idx_game_videos_session_id ON game_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_game_videos_created_at ON game_videos(created_at);

-- 3. Enable RLS for game_videos table
ALTER TABLE game_videos ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for game_videos
-- Allow users to view videos from their organization or their own videos
CREATE POLICY "Users can view game videos from their organization" ON game_videos
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
        OR created_by = auth.uid()
    );

-- Allow users to insert videos for their organization or as personal videos
CREATE POLICY "Users can insert game videos for their organization" ON game_videos
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
        OR created_by = auth.uid()
    );

-- Allow users to update their own videos or videos from their organization
CREATE POLICY "Users can update game videos from their organization" ON game_videos
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
        OR created_by = auth.uid()
    );

-- Allow users to delete their own videos or videos from their organization
CREATE POLICY "Users can delete game videos from their organization" ON game_videos
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
        OR created_by = auth.uid()
    );

-- 5. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_videos_updated_at
    BEFORE UPDATE ON game_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_game_videos_updated_at();

-- 6. Add video block type to session_notes_blocks
-- First, check if the constraint exists and drop it if it does
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'session_notes_blocks_block_type_check'
    ) THEN
        ALTER TABLE session_notes_blocks DROP CONSTRAINT session_notes_blocks_block_type_check;
    END IF;
    
    -- Add the new constraint with video support
    ALTER TABLE session_notes_blocks ADD CONSTRAINT session_notes_blocks_block_type_check 
    CHECK (block_type IN ('text', 'drill', 'heading', 'list', 'video'));
    
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists, do nothing
        NULL;
END $$;

-- 7. Create storage bucket for game videos (if it doesn't exist)
-- Note: This will be created via Supabase dashboard or CLI
-- The bucket should be named 'game-videos' and set to private

-- 8. Create function to get videos for a session
CREATE OR REPLACE FUNCTION get_session_videos(session_uuid UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gv.id,
        gv.title,
        gv.description,
        gv.file_name,
        gv.file_size,
        gv.mime_type,
        gv.storage_path,
        gv.duration_seconds,
        gv.created_at
    FROM game_videos gv
    WHERE gv.session_id = session_uuid
    ORDER BY gv.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to search videos by title/description
CREATE OR REPLACE FUNCTION search_game_videos(
    search_term TEXT,
    org_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    storage_path TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gv.id,
        gv.title,
        gv.description,
        gv.file_name,
        gv.file_size,
        gv.mime_type,
        gv.storage_path,
        gv.duration_seconds,
        gv.created_at
    FROM game_videos gv
    WHERE (
        gv.title ILIKE '%' || search_term || '%'
        OR gv.description ILIKE '%' || search_term || '%'
    )
    AND (
        org_id IS NULL 
        OR gv.organization_id = org_id
        OR gv.created_by = auth.uid()
    )
    ORDER BY gv.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add comments for documentation
COMMENT ON TABLE game_videos IS 'Stores metadata for uploaded game video clips';
COMMENT ON COLUMN game_videos.storage_path IS 'Path to video file in Supabase storage bucket';
COMMENT ON COLUMN game_videos.duration_seconds IS 'Duration of video in seconds (extracted from metadata)';
COMMENT ON COLUMN game_videos.session_id IS 'Optional link to a specific session';

-- 11. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON game_videos TO authenticated;
