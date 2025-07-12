-- Setup Supabase Storage for organisation logos
-- Run this in your Supabase SQL editor

-- Create storage bucket for organisation logos (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organisation-logos', 'organisation-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the organisation-logos bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'organisation-logos' AND auth.role() = 'authenticated');

-- Allow public read access to files
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'organisation-logos');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'organisation-logos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'organisation-logos' AND auth.role() = 'authenticated');

-- Note: You may need to manually create the 'organisation-logos' bucket in the Supabase Dashboard
-- Go to Storage > Create a new bucket named 'organisation-logos' with public access enabled 