# Photo Upload, Accreditations, and Club Logos Setup Instructions

## Database Migration

Run the following SQL in your Supabase SQL editor:

```sql
-- Add photo_url column to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add accreditations column and migrate position data
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS accreditations TEXT[] DEFAULT '{}';

-- Update existing position data to accreditations
UPDATE public.players 
SET accreditations = CASE 
  WHEN position = 'Skater' THEN ARRAY['skater']
  WHEN position = 'Goalie' THEN ARRAY['goalie']
  ELSE ARRAY['skater'] -- Default fallback
END
WHERE accreditations IS NULL OR array_length(accreditations, 1) IS NULL;

-- Drop the old position column
ALTER TABLE public.players DROP COLUMN IF EXISTS position;

-- Add a check constraint to ensure only valid accreditations are used
ALTER TABLE public.players ADD CONSTRAINT valid_accreditations 
CHECK (accreditations <@ ARRAY['skater', 'goalie', 'coach', 'referee']);

-- Add logo_url column to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Make jersey_number and birthdate optional (nullable)
ALTER TABLE public.players ALTER COLUMN jersey_number DROP NOT NULL;
ALTER TABLE public.players ALTER COLUMN birthdate DROP NOT NULL;

## Storage Bucket Setup

### Player Photos Bucket
1. Go to your Supabase dashboard
2. Navigate to Storage
3. Click "Create a new bucket"
4. Name it `player-photos`
5. Set it to **Private** (not public)
6. Enable Row Level Security (RLS)

### Club Logos Bucket
1. Go to your Supabase dashboard
2. Navigate to Storage
3. Click "Create a new bucket"
4. Name it `club-logos`
5. Set it to **Private** (not public)
6. Enable Row Level Security (RLS)

## Storage RLS Policies

### Player Photos Bucket Policies

Add these policies to the `player-photos` bucket:

#### Policy for uploading photos (INSERT)
```sql
CREATE POLICY "Users can upload their own player photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy for viewing photos (SELECT)
```sql
CREATE POLICY "Users can view their own player photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy for updating photos (UPDATE)
```sql
CREATE POLICY "Users can update their own player photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy for deleting photos (DELETE)
```sql
CREATE POLICY "Users can delete their own player photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Club Logos Bucket Policies

Add these policies to the `club-logos` bucket:

#### Policy for uploading logos (INSERT)
```sql
CREATE POLICY "Users can upload their own club logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'club-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy for viewing logos (SELECT)
```sql
CREATE POLICY "Users can view their own club logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'club-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy for updating logos (UPDATE)
```sql
CREATE POLICY "Users can update their own club logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'club-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy for deleting logos (DELETE)
```sql
CREATE POLICY "Users can delete their own club logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'club-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Features Added

### Photo Upload
- Photo upload in Add Player form
- Photo upload in Edit Player form (with current photo display)
- Photo display in Player List (with fallback initials)
- Photo display in Player View page
- File validation (image types only, max 5MB)
- Photo preview before upload
- Automatic file naming with timestamps
- User-specific storage folders for security

### Accreditations System
- Multiple accreditations per player (skater, goalie, coach, referee)
- Checkbox selection in Add/Edit forms
- Color-coded badges in Player List and View pages
- Validation to ensure at least one accreditation is selected
- Migration from old position field to new accreditations array

### Club Logo System
- Logo upload in Add/Edit Club forms
- Logo display in Club List with fallback initials
- Logo display in Player List and View pages
- File validation (image types only, max 5MB)
- Logo preview before upload
- Automatic file naming with timestamps
- User-specific storage folders for security 