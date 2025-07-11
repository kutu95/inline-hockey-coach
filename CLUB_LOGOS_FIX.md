# Secure Image Display with Signed URLs

## Problem
Club logos and player photos were not displaying properly because the storage buckets were set to **Private** with RLS policies, but images need to be accessible to display in the browser.

## Solution: Signed URLs (Implemented)

We've implemented signed URLs for both club logos and player photos. This approach:

- Keeps storage buckets private for security
- Generates temporary signed URLs for image access
- Automatically refreshes URLs when they expire
- Provides fallback to original URLs if signed URL generation fails
- Ensures player photos remain secure and private

### Code Changes Made:

#### Club Logos:
- Updated `Clubs.jsx` to use signed URLs for uploads and display
- Updated `PlayerList.jsx` to use signed URLs for club logos
- Updated `ViewPlayer.jsx` to use signed URLs for club logos  
- Updated `ViewSquad.jsx` to use signed URLs for club logos

#### Player Photos:
- Updated `AddPlayer.jsx` to use signed URLs for photo uploads
- Updated `EditPlayer.jsx` to use signed URLs for photo uploads
- Updated `PlayerList.jsx` to use signed URLs for player photos
- Updated `ViewPlayer.jsx` to use signed URLs for player photos
- Updated `ViewSquad.jsx` to use signed URLs for player photos
- Updated `SessionAttendance.jsx` to use signed URLs for player photos

## Security Benefits

**Signed URLs provide:**
- **Privacy**: Player photos are only accessible to authenticated users
- **Temporary Access**: URLs expire after a set time (7 days for display, 1 year for uploads)
- **User Isolation**: Each user can only access their own uploaded files
- **Fallback Security**: If signed URL generation fails, original URLs are used as fallback

## Storage Bucket Configuration

Both `club-logos` and `player-photos` buckets should remain **Private** with RLS policies:

### RLS Policies for club-logos:
```sql
-- Users can upload their own club logos
CREATE POLICY "Users can upload their own club logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'club-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own club logos
CREATE POLICY "Users can view their own club logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'club-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### RLS Policies for player-photos:
```sql
-- Users can upload their own player photos
CREATE POLICY "Users can upload their own player photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own player photos
CREATE POLICY "Users can view their own player photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'player-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Testing

After implementation:
1. Upload a new club logo - verify it displays in the club list
2. Upload a new player photo - verify it displays in player lists and views
3. Verify images display in squad views and session attendance
4. Verify images are not accessible without authentication

The images should now display properly while maintaining security and privacy. 