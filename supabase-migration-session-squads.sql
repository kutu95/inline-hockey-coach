-- Migration to add session-squad relationships
-- This allows sessions to be assigned to specific squads

-- Create session_squads junction table
CREATE TABLE IF NOT EXISTS session_squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, squad_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_squads_session_id ON session_squads(session_id);
CREATE INDEX IF NOT EXISTS idx_session_squads_squad_id ON session_squads(squad_id);

-- Add RLS policies for session_squads table
ALTER TABLE session_squads ENABLE ROW LEVEL SECURITY;

-- Policy for coaches to manage session-squad relationships for their sessions
CREATE POLICY "Coaches can manage session-squad relationships for their sessions" ON session_squads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_squads.session_id
            AND s.coach_id = auth.uid()
        )
    );

-- Policy for superadmins to manage session-squad relationships for their organizations
CREATE POLICY "Superadmins can manage session-squad relationships for their organizations" ON session_squads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_squads.session_id
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND r.name = 'superadmin'
            )
        )
    );

-- Policy for admins to manage session-squad relationships for their organizations
CREATE POLICY "Admins can manage session-squad relationships for their organizations" ON session_squads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.id = session_squads.session_id
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                AND r.name = 'admin'
                AND ur.organization_id = s.organization_id
            )
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_squads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_session_squads_updated_at
    BEFORE UPDATE ON session_squads
    FOR EACH ROW
    EXECUTE FUNCTION update_session_squads_updated_at(); 