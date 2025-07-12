# RLS Policy Fix Guide

## Overview
The RLS (Row Level Security) policies were causing infinite recursion and 403 errors. This guide will help you fix them properly.

## Step 1: Run the RLS Fix Script
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the `fix-rls-properly.sql` script

This script will:
- Remove all problematic RLS policies
- Create simple, non-recursive policies
- Enable RLS on the necessary tables
- Insert default roles
- Create helper functions
- Test the setup

## Step 2: Assign Admin Role to Your User
1. In the SQL Editor, run the `assign-admin-role.sql` script
2. This will properly assign the admin role to your user ID

## Step 3: Test the Fix
1. Restart your development server
2. Test the UserAdmin page
3. Verify that role fetching works without the hardcoded admin role

## What Was Fixed

### Before (Problematic):
- RLS policies were referencing themselves, causing infinite recursion
- Hardcoded admin role in AuthContext as a temporary workaround
- Complex policies that were difficult to debug

### After (Fixed):
- Simple, non-recursive RLS policies
- Proper role assignment in the database
- Removed hardcoded admin role from AuthContext
- Helper functions for role checking

## New RLS Policies

### user_roles table:
- **Users can view their own roles**: `auth.uid() = user_id`
- **Authenticated users can manage roles**: `auth.role() = 'authenticated'`

### roles table:
- **Roles are viewable by authenticated users**: `auth.role() = 'authenticated'`

## Helper Functions Created

### get_user_roles(user_uuid UUID)
Returns all roles for a specific user.

### has_role(user_uuid UUID, role_name TEXT)
Returns true if a user has a specific role.

## Testing

After running the scripts, you should see:
- No more 403 errors
- Role fetching works properly
- UserAdmin page loads without errors
- Role assignments work correctly

## Next Steps

Once this is working, you can:
1. Add more restrictive RLS policies for production
2. Implement proper admin-only access controls
3. Add role-based UI restrictions
4. Test all role-protected routes

## Troubleshooting

If you still see errors:
1. Check the Supabase logs for specific error messages
2. Verify that the tables exist and have the correct structure
3. Ensure your user ID is correct in the assign-admin-role.sql script
4. Test the helper functions directly in the SQL editor 