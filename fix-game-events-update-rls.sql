-- =====================================================
-- FIX GAME EVENTS UPDATE RLS POLICY
-- =====================================================
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and click "Run"
-- 4. This will add the missing UPDATE policy for game_events
--
-- =====================================================

-- Add missing UPDATE policy for game_events table
CREATE POLICY "Users can update game events for their sessions" ON game_events
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'game_events' 
ORDER BY policyname;
