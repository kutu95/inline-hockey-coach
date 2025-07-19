-- Create storage bucket for media files (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media files
CREATE POLICY "Media files are viewable by authenticated users" ON storage.objects
    FOR SELECT USING (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload media files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'media' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update media files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'media' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete media files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'media' AND
        auth.role() = 'authenticated'
    );

-- Note: You may also need to manually create the bucket in Supabase Dashboard:
-- Go to Storage > Create a new bucket named 'media' with private access 