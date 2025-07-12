-- Link Existing Data to First Organization
-- Run this script after creating your first organization

-- Step 1: Get the first organization ID
DO $$
DECLARE
    first_org_id UUID;
BEGIN
    -- Get the first organization (the one you just created)
    SELECT id INTO first_org_id FROM organizations ORDER BY created_at ASC LIMIT 1;
    
    IF first_org_id IS NULL THEN
        RAISE EXCEPTION 'No organizations found. Please create an organization first.';
    END IF;
    
    RAISE NOTICE 'Linking data to organization ID: %', first_org_id;
    
    -- Step 2: Temporarily disable triggers to avoid updated_at conflicts
    -- Disable all triggers temporarily
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE TRIGGER %I', 
                      trigger_record.event_object_table, 
                      trigger_record.trigger_name);
    END LOOP;
    
    -- Step 3: Link all existing data to the first organization
    UPDATE clubs SET organization_id = first_org_id WHERE organization_id IS NULL;
    UPDATE players SET organization_id = first_org_id WHERE organization_id IS NULL;
    UPDATE squads SET organization_id = first_org_id WHERE organization_id IS NULL;
    UPDATE sessions SET organization_id = first_org_id WHERE organization_id IS NULL;
    UPDATE drills SET organization_id = first_org_id WHERE organization_id IS NULL;
    UPDATE attendance SET organization_id = first_org_id WHERE organization_id IS NULL;
    
    -- Step 4: Re-enable all triggers
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE TRIGGER %I', 
                      trigger_record.event_object_table, 
                      trigger_record.trigger_name);
    END LOOP;
    
    RAISE NOTICE 'Successfully linked all existing data to organization ID: %', first_org_id;
    
    -- Step 5: Show summary of linked data
    RAISE NOTICE 'Summary of linked data:';
    RAISE NOTICE '- Clubs: %', (SELECT COUNT(*) FROM clubs WHERE organization_id = first_org_id);
    RAISE NOTICE '- Players: %', (SELECT COUNT(*) FROM players WHERE organization_id = first_org_id);
    RAISE NOTICE '- Squads: %', (SELECT COUNT(*) FROM squads WHERE organization_id = first_org_id);
    RAISE NOTICE '- Sessions: %', (SELECT COUNT(*) FROM sessions WHERE organization_id = first_org_id);
    RAISE NOTICE '- Drills: %', (SELECT COUNT(*) FROM drills WHERE organization_id = first_org_id);
    RAISE NOTICE '- Attendance records: %', (SELECT COUNT(*) FROM attendance WHERE organization_id = first_org_id);
    
END $$;

-- Success message
SELECT 'Data linking completed successfully!' as status; 