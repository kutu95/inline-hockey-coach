-- Check and create roles tables if they don't exist
-- Run this in your Supabase SQL Editor

-- Check if roles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'roles') THEN
        -- Create roles table
        CREATE TABLE roles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Insert default roles
        INSERT INTO roles (name, description) VALUES
            ('admin', 'Full system access and user management'),
            ('coach', 'Can manage players, sessions, and drills'),
            ('player', 'Read-only access to sessions and drills');
            
        RAISE NOTICE 'Roles table created and populated with default roles';
    ELSE
        RAISE NOTICE 'Roles table already exists';
    END IF;
END $$;

-- Check if user_roles table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        -- Create user_roles table
        CREATE TABLE user_roles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, role_id)
        );
        
        RAISE NOTICE 'User_roles table created';
    ELSE
        RAISE NOTICE 'User_roles table already exists';
    END IF;
END $$;

-- Enable RLS on both tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create basic policies
DO $$
BEGIN
    -- Roles policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'roles' AND policyname = 'Roles are viewable by authenticated users') THEN
        CREATE POLICY "Roles are viewable by authenticated users" ON roles
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    -- User roles policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Users can view their own roles') THEN
        CREATE POLICY "Users can view their own roles" ON user_roles
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can manage all user roles') THEN
        CREATE POLICY "Admins can manage all user roles" ON user_roles
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid() AND r.name = 'admin'
                )
            );
    END IF;
    
    RAISE NOTICE 'Policies created or already exist';
END $$; 