-- Debug Session Save Issue
-- Run this in your Supabase SQL Editor to test different data scenarios

-- 1. First, let's test with the simple case that works (1 text block)
SELECT 'Testing simple case (1 text block):' as info;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[{"block_type": "text", "content": "Simple test", "drill_id": null, "order_index": 0}]'::JSON,
    '[]'::JSON
) as simple_test_result;

-- 2. Test with the complex case that fails (4 blocks)
SELECT 'Testing complex case (4 blocks):' as info;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[
        {"block_type": "heading", "content": "Header 1", "drill_id": null, "order_index": 0},
        {"block_type": "text", "content": "Text 1", "drill_id": null, "order_index": 1},
        {"block_type": "heading", "content": "Header 2", "drill_id": null, "order_index": 2},
        {"block_type": "text", "content": "Text 2", "drill_id": null, "order_index": 3}
    ]'::JSON,
    '[]'::JSON
) as complex_test_result;

-- 3. Check what was actually saved from the complex test
SELECT 'Checking what was saved from complex test:' as info;
SELECT 
    id,
    session_id,
    block_type,
    content,
    drill_id,
    order_index,
    created_at
FROM session_notes_blocks 
WHERE session_id = 'ec2737ea-beb2-480b-8037-d405e58225a9'
ORDER BY order_index;

-- 4. Test with individual block types to isolate the issue
SELECT 'Testing individual block types:' as info;

-- Test heading block
SELECT 'Testing heading block:' as block_type;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[{"block_type": "heading", "content": "Test Heading", "drill_id": null, "order_index": 0}]'::JSON,
    '[]'::JSON
) as heading_test_result;

-- Test text block
SELECT 'Testing text block:' as block_type;
SELECT save_session_planning(
    'ec2737ea-beb2-480b-8037-d405e58225a9'::UUID,
    '[{"block_type": "text", "content": "Test Text", "drill_id": null, "order_index": 0}]'::JSON,
    '[]'::JSON
) as text_test_result;

-- 5. Check the table structure
SELECT 'Table structure for session_notes_blocks:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'session_notes_blocks'
ORDER BY ordinal_position;
