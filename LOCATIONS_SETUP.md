# Locations Feature Setup

## Overview
This feature adds location management to the inline hockey coaching app. Locations belong to organizations and can be selected when creating sessions.

## What's Been Created

### 1. Database Migration (`supabase-migration-locations.sql`)
- **Locations table** with fields:
  - `id` (UUID, primary key)
  - `name` (TEXT, required)
  - `description` (TEXT, optional)
  - `organization_id` (UUID, foreign key to organizations)
  - `created_at` and `updated_at` timestamps

- **Sessions table update**:
  - Added `location_id` column (UUID, foreign key to locations)
  - Added index for performance

- **RLS Policies**:
  - Superadmins can view all locations
  - Organization users (admin/coach) can view locations in their organization
  - Updated sessions policies to work with locations

- **Triggers and Indexes**:
  - Auto-update `updated_at` timestamp
  - Performance indexes on organization_id and name

### 2. React Components

#### `Locations.jsx`
- Full CRUD operations for locations
- Organization-scoped (only shows locations for current organization)
- Form validation and error handling
- Responsive design with loading states

#### `AdminPanel.jsx`
- Navigation hub for admin functions
- Links to Locations and Clubs management
- Organization branding with header

### 3. Updated Components

#### `Sessions.jsx`
- Location selection dropdown when creating/editing sessions
- Links to create locations if none exist
- Displays location name in session list

#### `OrganizationDetail.jsx`
- Admin Panel link already exists in the navigation cards

### 4. Routes Added
- `/organizations/:organizationId/locations` - Locations management
- `/organizations/:organizationId/admin` - Admin panel

## Setup Instructions

### 1. Run the Migration
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-migration-locations.sql`
4. Run the migration

### 2. Verify the Migration
1. Run the verification script `verify-locations-migration.sql` in the SQL Editor
2. Check that all tables, columns, and policies were created correctly

### 3. Test the Feature
1. Navigate to an organization detail page
2. Click on "Admin Panel"
3. Click on "Locations" to manage locations
4. Create a few test locations
5. Go to Sessions and create a new session
6. Verify you can select a location from the dropdown

## Features

### Location Management
- **Create**: Add new locations with name and description
- **Read**: View all locations for the organization
- **Update**: Edit location details
- **Delete**: Remove locations (with confirmation)

### Session Integration
- **Location Selection**: Required field when creating sessions
- **Location Display**: Shows location name in session list
- **Fallback**: Links to create locations if none exist

### Security
- **RLS**: Row Level Security ensures users only see locations in their organization
- **Role-based Access**: Only superadmins and organization admins/coaches can access

### Sample Data
The migration includes sample locations for testing:
- Main Arena
- Training Hall  
- Outdoor Rink

## Usage

### For Superadmins
1. Navigate to Organizations
2. Select an organization
3. Click "Admin Panel"
4. Click "Locations" to manage locations

### For Organization Admins/Coaches
1. Navigate to your organization
2. Click "Admin Panel" 
3. Click "Locations" to manage locations

### Creating Sessions with Locations
1. Go to Sessions
2. Click "Add Session"
3. Select a location from the dropdown (required)
4. Fill in other session details
5. Save the session

## Troubleshooting

### Common Issues

1. **"No locations available" message in Sessions**
   - Create locations first via the Admin Panel
   - Or click the "Create locations first" link

2. **Permission denied errors**
   - Ensure you have the correct role (superadmin, admin, or coach)
   - Check that you're in the correct organization context

3. **Migration errors**
   - Run the verification script to check what was created
   - Check for existing policies that might conflict

### Verification Commands
Run these in the Supabase SQL Editor to verify setup:

```sql
-- Check if locations table exists
SELECT * FROM locations LIMIT 1;

-- Check if sessions has location_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sessions' AND column_name = 'location_id';

-- Check RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'locations';
``` 