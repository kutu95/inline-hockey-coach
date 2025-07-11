# Role-Based Security Setup Guide

This guide will help you set up and administer user access for your inline hockey coach app.

## 1. Database Setup

First, run the roles migration in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase-migration-roles.sql
```

This will create:
- `roles` table with admin, coach, and player roles
- `user_roles` table for many-to-many relationships
- RLS policies for security
- Helper functions for role checking

## 2. Initial Admin Setup

After running the migration, you need to assign the admin role to your first user:

1. **Get your user ID:**
   - Go to your Supabase Dashboard → Authentication → Users
   - Find your email and copy the user ID

2. **Assign admin role:**
   ```sql
   -- Replace 'your-user-id' with your actual user ID
   INSERT INTO user_roles (user_id, role_id)
   SELECT 'your-user-id', id FROM roles WHERE name = 'admin';
   ```

## 3. Using the User Administration Interface

Once you have admin access:

1. **Access the admin panel:**
   - Log into your app
   - You should see a "User Administration" card on the dashboard
   - Click it to go to `/admin/users`

2. **Manage user roles:**
   - View all registered users
   - Check/uncheck roles for each user
   - Roles are applied immediately

## 4. Role Permissions

### Admin Role
- Full system access
- User administration
- All coach and player features

### Coach Role
- Player management (add, edit, view)
- Club management
- Squad management
- Session scheduling and management
- Drill creation and management
- Attendance tracking

### Player Role
- View sessions (read-only)
- View drills (read-only)
- No editing capabilities

## 5. Testing the System

1. **Create test users:**
   - Sign up with different email addresses
   - Assign different roles to each

2. **Test access control:**
   - Try accessing different pages with different roles
   - Verify that users can only see what they should

## 6. Troubleshooting

### If you can't access the admin panel:
- Make sure you've assigned the admin role to your user
- Check the browser console for any errors
- Verify the database migration ran successfully

### If role changes aren't working:
- Check that the RLS policies are in place
- Verify the helper functions exist
- Ensure you're logged in as an admin

### If users can't see their assigned features:
- Check that the user has the correct roles assigned
- Verify the role checking functions are working
- Check the browser console for errors

## 7. Security Notes

- All role checks happen on both client and server side
- RLS policies ensure database-level security
- Users can only see and modify data they're authorized for
- Role assignments are logged and auditable

## 8. Adding New Roles

To add a new role:

1. **Add to database:**
   ```sql
   INSERT INTO roles (name, description) 
   VALUES ('new_role', 'Description of new role');
   ```

2. **Update RLS policies** as needed

3. **Update the frontend** to include the new role in route protection

## 9. Best Practices

- Always assign roles through the admin interface
- Regularly audit user roles
- Use the principle of least privilege
- Test role changes thoroughly
- Keep role descriptions up to date

## 10. API Usage

The role system provides these helper functions:

```javascript
const { hasRole, hasAnyRole, hasAllRoles } = useAuth()

// Check for specific role
if (hasRole('admin')) { ... }

// Check for any of multiple roles
if (hasAnyRole(['coach', 'admin'])) { ... }

// Check for all roles
if (hasAllRoles(['coach', 'admin'])) { ... }
```

This system provides a robust foundation for managing user access in your inline hockey coach application! 