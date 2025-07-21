-- Check animation data for drill d6a4c9dd-09aa-4315-a032-b19b1346d14e
-- This query will show us if the animation was properly saved with all required data

-- First, let's check if the drill exists
SELECT 
    'Drill Info' as info_type,
    id,
    name,
    description,
    created_at
FROM drills 
WHERE id = 'd6a4c9dd-09aa-4315-a032-b19b1346d14e';

-- Check if there are any media attachments linked to this drill
SELECT 
    'Drill Media Link' as info_type,
    dm.id as drill_media_id,
    dm.drill_id,
    dm.media_id,
    dm.created_at
FROM drill_media dm
WHERE dm.drill_id = 'd6a4c9dd-09aa-4315-a032-b19b1346d14e';

-- Check the media_attachments table for animation data
SELECT 
    'Media Attachment' as info_type,
    ma.id,
    ma.title,
    ma.description,
    ma.file_type,
    ma.file_name,
    ma.storage_path,
    ma.animation_data_path,
    ma.is_editable,
    ma.frame_count,
    ma.frame_rate,
    ma.duration_seconds,
    ma.created_at,
    ma.updated_at
FROM media_attachments ma
INNER JOIN drill_media dm ON ma.id = dm.media_id
WHERE dm.drill_id = 'd6a4c9dd-09aa-4315-a032-b19b1346d14e'
AND ma.file_type = 'animation';

-- Check if the animation_data_path column exists in the media_attachments table
SELECT 
    'Schema Check' as info_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'media_attachments' 
AND column_name = 'animation_data_path';

-- Check all animation media attachments to see the pattern
SELECT 
    'All Animation Media' as info_type,
    ma.id,
    ma.title,
    ma.file_type,
    ma.storage_path,
    ma.animation_data_path,
    ma.is_editable,
    ma.created_at
FROM media_attachments ma
WHERE ma.file_type = 'animation'
ORDER BY ma.created_at DESC
LIMIT 10; 