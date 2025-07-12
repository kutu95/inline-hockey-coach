# Server-Side Role Functions Setup

## Overview

To fix the hanging issue with role fetching, I've created server-side database functions that handle role checking more efficiently. This moves the heavy lifting to the database level instead of client-side queries.

## Database Functions

Run the following SQL in your Supabase SQL editor:

```sql
-- Run the contents of supabase-functions-user-roles.sql
```

This creates:
- `get_user_roles(user_uuid)` - Returns array of role names for a user
- `user_has_role(user_uuid, role_name)` - Checks if user has specific role
- `user_has_any_role(user_uuid, role_names)` - Checks if user has any of specified roles
- `user_has_all_roles(user_uuid, role_names)` - Checks if user has all specified roles

## Benefits

1. **Performance**: Single database call instead of multiple queries
2. **Security**: Server-side execution with proper permissions
3. **Reliability**: No client-side timeouts or hanging
4. **Efficiency**: Optimized database queries

## How It Works

The AuthContext now uses the `get_user_roles` function to fetch roles in a single call:

```javascript
const { data, error } = await supabase.rpc('get_user_roles', {
  user_uuid: userId
})
```

This replaces the previous complex client-side queries that were causing the hanging issue.

## Testing

After running the database functions:

1. **Refresh your application**
2. **Check the browser console** - should see "Fetched roles: [...]" instead of timeout errors
3. **Verify role-based access** - admin, coach, and player features should work correctly

## Troubleshooting

If you still see issues:

1. **Check database permissions** - Ensure the functions are accessible to authenticated users
2. **Verify role data** - Make sure users have roles assigned in the `user_roles` table
3. **Check console logs** - Look for any error messages in the browser console

The server-side approach should resolve the hanging issue and provide much better performance for role checking. 