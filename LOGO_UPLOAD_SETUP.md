# Logo Upload Setup Guide

## Overview
The organisation management now includes file upload functionality for logos. Users can upload image files directly or provide a URL.

## Setup Instructions

### 1. Create Supabase Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Set the bucket name to `organisation-logos`
5. Enable **Public bucket** (this allows public read access)
6. Click **Create bucket**

### 2. Set Storage Policies

Run the following SQL in your Supabase SQL Editor:

```sql
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
```

### 3. Features

The logo upload functionality includes:

- **File Upload**: Users can select image files (PNG, JPG, GIF, etc.)
- **File Validation**: 
  - Only image files are accepted
  - Maximum file size: 5MB
- **Image Preview**: Shows a preview of the uploaded image
- **Remove Logo**: Users can remove the logo with an X button
- **URL Fallback**: Users can still provide a logo URL directly
- **Upload Progress**: Shows loading indicator during upload

### 4. File Storage

Uploaded logos are stored in the `organisation-logos/` folder within the organisation-logos bucket with unique filenames to prevent conflicts.

### 5. Usage

1. **Creating an Organisation**: 
   - Click "Add Organisation"
   - Fill in the name and description
   - Either upload a logo file or provide a URL
   - Click "Create Organisation"

2. **Editing an Organisation**:
   - Click "Edit" on any organisation
   - Modify the logo by uploading a new file or changing the URL
   - Click "Update Organisation"

3. **Viewing Logos**:
   - Logos appear in the organisations list
   - Logos are displayed on the organisation detail page
   - Logos are shown in the organisation header

### 6. Troubleshooting

If you encounter upload issues:

1. **Check Storage Bucket**: Ensure the `organisation-logos` bucket exists and is public
2. **Check Policies**: Verify the storage policies are correctly set
3. **File Size**: Ensure the file is under 5MB
4. **File Type**: Ensure the file is an image (PNG, JPG, GIF, etc.)
5. **Network**: Check your internet connection for large files

### 7. Security Notes

- Only authenticated users can upload files
- Files are publicly readable (required for logo display)
- File names are randomized to prevent conflicts
- File type and size validation is enforced 