-- Create attendance table to track which players attended each session
CREATE TABLE session_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    attended BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, player_id)
);

-- Add RLS policies for session_attendance table
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can view attendance for their sessions
CREATE POLICY "Coaches can view attendance for their sessions" ON session_attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- Policy: Coaches can insert attendance for their sessions
CREATE POLICY "Coaches can insert attendance for their sessions" ON session_attendance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- Policy: Coaches can update attendance for their sessions
CREATE POLICY "Coaches can update attendance for their sessions" ON session_attendance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- Policy: Coaches can delete attendance for their sessions
CREATE POLICY "Coaches can delete attendance for their sessions" ON session_attendance
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_attendance.session_id 
            AND sessions.coach_id = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_attendance_updated_at
    BEFORE UPDATE ON session_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_session_attendance_updated_at(); 