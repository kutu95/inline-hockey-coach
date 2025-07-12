# Multi-Tenant Organization Setup

This document explains how to set up and use the multi-tenant organization system for the Inline Hockey Coach app.

## Overview

The app now supports multiple hockey organizations, each with their own isolated data. Users, players, clubs, squads, sessions, and drills are all associated with an organization and are only visible to users within that organization.

## Roles

### Superadmin
- Can manage all organizations
- Can view and manage all data across all organizations
- Has access to the Organizations management page
- Can create, edit, and delete organizations

### Admin
- Can manage users, players, clubs, squads, sessions, and drills within their own organization
- Cannot see data from other organizations
- Cannot manage organizations

### Coach
- Can manage players, clubs, squads, sessions, and drills within their own organization
- Cannot see data from other organizations

### Player
- Can view their own profile and sessions within their organization
- Cannot see data from other organizations

## Database Changes

### New Tables
- `organizations` - Stores organization information

### Updated Tables
All existing tables now have an `organization_id` column:
- `users`
- `players`
- `clubs`
- `squads`
- `sessions`
- `drills`
- `invitations`

### New Functions
- `get_user_organization(user_uuid)` - Returns the organization ID for a user
- `is_superadmin(user_uuid)` - Returns true if user has superadmin role

### Updated RLS Policies
All tables now have organization-based Row Level Security policies that ensure users can only access data within their own organization (unless they are superadmin).

## Setup Instructions

### 1. Run Database Migration
Execute the organization migration script:
```sql
-- Run supabase-migration-organizations.sql
```

### 2. Set Up Initial Data
Execute the setup script to create a default organization and assign existing data:
```sql
-- Run setup-organizations.sql
```

### 3. Create Superadmin User
To create a superadmin user, run this SQL (replace with actual email):
```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'your-email@example.com' AND r.role_name = 'superadmin'
ON CONFLICT DO NOTHING;
```

### 4. Test the Setup
1. Log in as a superadmin user
2. Navigate to the Organizations page
3. Create additional organizations as needed
4. Assign users to different organizations

## Usage

### For Superadmins
1. **Manage Organizations**: Go to `/organizations` to create, edit, and delete organizations
2. **View All Data**: Superadmins can see all data across all organizations
3. **Assign Users**: Users can be assigned to different organizations by updating their `organization_id`

### For Admins and Coaches
1. **Organization Isolation**: Users can only see data within their own organization
2. **Normal Operations**: All existing functionality works the same, but is scoped to their organization

### For Players
1. **Limited Access**: Players can only see their own profile and sessions within their organization
2. **No Cross-Organization Access**: Players cannot see data from other organizations

## Security

### Row Level Security (RLS)
All tables have RLS policies that ensure:
- Users can only access data within their own organization
- Superadmins can access all data
- Players can only access their own profile and relevant sessions

### Organization Isolation
- Data is completely isolated between organizations
- Users cannot accidentally access data from other organizations
- All queries automatically filter by organization

## Adding New Organizations

### Via Superadmin Interface
1. Log in as a superadmin
2. Go to `/organizations`
3. Click "Add Organization"
4. Fill in the organization details
5. Save the organization

### Via Database
```sql
INSERT INTO organizations (name, description, contact_email, website_url)
VALUES ('New Hockey Club', 'Description here', 'contact@club.com', 'https://club.com');
```

## Assigning Users to Organizations

### Via Database
```sql
UPDATE users 
SET organization_id = 'organization-uuid-here'
WHERE email = 'user@example.com';
```

### Via Superadmin Interface
1. Go to User Administration
2. Edit the user
3. Select the organization from the dropdown
4. Save changes

## Troubleshooting

### Users Can't See Data
- Check that the user has an `organization_id` set
- Verify the user's organization has data
- Check that RLS policies are working correctly

### Superadmin Can't Access Organizations Page
- Verify the user has the `superadmin` role
- Check that the role was properly assigned in the `user_roles` table

### Data Isolation Issues
- Verify that all tables have the `organization_id` column
- Check that RLS policies are enabled and working
- Ensure all queries include organization filtering

## Migration Notes

### Existing Data
- All existing data will be assigned to a default organization
- No data will be lost during the migration
- Users can continue using the app normally

### Performance
- Organization filtering adds minimal overhead
- Indexes are created on `organization_id` columns for performance
- Queries remain efficient with proper indexing

## Future Enhancements

### Potential Features
- Organization-specific branding and themes
- Organization-specific email templates
- Organization-specific drill libraries
- Cross-organization tournaments and events
- Organization analytics and reporting 