-- Fix PDF Export Function (No Coach Check)
-- Run this in your Supabase SQL Editor

-- Update the get_session_pdf_data function to only check organization access
CREATE OR REPLACE FUNCTION get_session_pdf_data(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
    pdf_data JSON;
BEGIN
    -- Check if session exists and user has organization access
    IF NOT EXISTS (
        SELECT 1 FROM sessions 
        WHERE id = session_uuid 
        AND organization_id IN (
            SELECT organization_id FROM user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id IS NOT NULL
        )
    ) THEN
        RAISE NOTICE 'Session access denied for session % and user %', session_uuid, auth.uid();
        RETURN NULL;
    END IF;

    SELECT json_build_object(
        'session', json_build_object(
            'title', s.title,
            'date', s.date,
            'start_time', s.start_time,
            'duration_minutes', s.duration_minutes,
            'location', s.location,
            'description', s.description
        ),
        'planning_content', (
            SELECT json_agg(
                CASE 
                    WHEN snb.block_type = 'drill' AND snb.drill_id IS NOT NULL THEN
                        json_build_object(
                            'type', 'drill',
                            'content', json_build_object(
                                'title', d.title,
                                'description', d.description,
                                'short_description', d.short_description,
                                'min_players', d.min_players,
                                'max_players', d.max_players,
                                'features', d.features,
                                'image_url', d.image_url,
                                'session_notes', snb.content
                            )
                        )
                    ELSE
                        json_build_object(
                            'type', snb.block_type,
                            'content', snb.content
                        )
                END
                ORDER BY snb.order_index
            )
            FROM session_notes_blocks snb
            LEFT JOIN drills d ON d.id = snb.drill_id
            WHERE snb.session_id = session_uuid
        ),
        'session_drills', (
            SELECT json_agg(
                json_build_object(
                    'drill', json_build_object(
                        'title', d.title,
                        'description', d.description,
                        'short_description', d.short_description,
                        'min_players', d.min_players,
                        'max_players', d.max_players,
                        'features', d.features,
                        'image_url', d.image_url
                    ),
                    'duration_minutes', sd.duration_minutes,
                    'notes', sd.notes,
                    'order_index', sd.order_index
                )
                ORDER BY sd.order_index
            )
            FROM session_drills sd
            JOIN drills d ON d.id = sd.drill_id
            WHERE sd.session_id = session_uuid
        )
    ) INTO pdf_data
    FROM sessions s
    WHERE s.id = session_uuid;

    RETURN pdf_data;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error getting session PDF data: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 