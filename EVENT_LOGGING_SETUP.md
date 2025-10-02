# Event Logging System Setup

This document describes the comprehensive event logging system implemented for the inline hockey coach application. The system tracks user activities, authentication events, page access, and data modifications for superadmin monitoring.

## Overview

The event logging system provides:
- **User Activity Tracking**: Login/logout, page access, data modifications
- **Superadmin Monitoring**: Comprehensive logs viewable only by superadmins
- **Security Auditing**: Track who did what, when, and from where
- **System Monitoring**: Error tracking and system events
- **Performance Insights**: User behavior patterns and system usage

## Components

### 1. EventLogger Utility (`src/utils/eventLogger.js`)

Core logging service that handles all event recording:

```javascript
import eventLogger from '../utils/eventLogger'

// Log user login
eventLogger.logLogin({ user_email: user.email })

// Log page access
eventLogger.logPageAccess('Game Stats', { session_id: '123' })

// Log data modification
eventLogger.logDataUpdate('game_events', eventId, { 
  old_value: 'old', 
  new_value: 'new' 
})

// Log system events
eventLogger.logSystemEvent('Database connection restored')
```

### 2. React Hooks (`src/hooks/useEventLogger.js`)

Easy integration hooks for React components:

```javascript
import { useEventLogger, usePageLogger, useDataLogger } from '../hooks/useEventLogger'

const MyComponent = () => {
  // Automatically tracks page access
  usePageLogger('My Page')
  
  // Provides data logging functions
  const { logCreate, logUpdate, logDelete } = useDataLogger()
  
  // Use in event handlers
  const handleSave = async () => {
    await saveData()
    logUpdate('my_table', recordId, { changes: 'made' })
  }
}
```

### 3. EventLogs Component (`components/EventLogs.jsx`)

Superadmin-only interface for viewing logs:
- **Filters**: Event type, log level, user, date range, search
- **Pagination**: Handles large log volumes
- **Real-time**: Shows latest events first
- **Export**: Can be extended for log export functionality

### 4. Database Schema (`supabase-migration-event-logs.sql`)

Comprehensive database structure:
- **event_logs table**: Stores all logged events
- **RLS policies**: Only superadmins can access logs
- **Indexes**: Optimized for performance
- **Cleanup functions**: Automatic old log removal
- **Statistics functions**: Event analytics

## Installation Steps

### 1. Run Database Migration

Execute the migration in your Supabase SQL editor:

```sql
-- Run the contents of supabase-migration-event-logs.sql
```

### 2. Verify RLS Policies

Ensure the RLS policies are correctly applied:

```sql
-- Check that only superadmins can access event logs
SELECT * FROM event_logs; -- Should only work for superadmin users
```

### 3. Test the System

1. **Login as superadmin**
2. **Navigate to Dashboard**
3. **Click "View Event Logs"**
4. **Verify logs are being recorded**

## Event Types Tracked

### Authentication Events
- `auth_login`: User login with details
- `auth_logout`: User logout with session info

### Page Access Events
- `page_access`: Every page visit with URL and referrer
- Tracked automatically via `usePageLogger()` hook

### Data Modification Events
- `data_create`: New records created
- `data_update`: Existing records modified
- `data_delete`: Records deleted

### System Events
- `system_event`: Application errors, warnings, info messages

## Integration Examples

### Basic Page Logging

```javascript
import { usePageLogger } from '../src/hooks/useEventLogger'

const GameStats = () => {
  usePageLogger('Game Stats') // Automatically logs page access
  
  return <div>...</div>
}
```

### Data Modification Logging

```javascript
import { useDataLogger } from '../src/hooks/useEventLogger'

const PlayerForm = () => {
  const { logCreate, logUpdate } = useDataLogger()
  
  const handleSave = async (playerData) => {
    const result = await savePlayer(playerData)
    
    if (playerData.id) {
      logUpdate('players', playerData.id, {
        fields_changed: Object.keys(playerData)
      })
    } else {
      logCreate('players', result.id, {
        player_name: playerData.name
      })
    }
  }
}
```

### Error Logging

```javascript
import eventLogger from '../utils/eventLogger'

try {
  await riskyOperation()
} catch (error) {
  eventLogger.logError('Failed to save player data', error, {
    player_id: playerId,
    operation: 'save_player'
  })
}
```

## Security Considerations

### Access Control
- **Superadmin Only**: Event logs are only accessible by users with `superadmin` role
- **RLS Policies**: Database-level security ensures data protection
- **No Sensitive Data**: Passwords and sensitive information are never logged

### Data Privacy
- **User Consent**: Logging is transparent and for legitimate system monitoring
- **Data Retention**: Automatic cleanup of logs older than 90 days
- **Minimal Data**: Only necessary information is logged

### Performance
- **Asynchronous Logging**: Logging doesn't block user operations
- **Indexed Queries**: Database optimized for log retrieval
- **Pagination**: Handles large log volumes efficiently

## Monitoring & Maintenance

### Log Cleanup

The system includes automatic cleanup functions:

```sql
-- Manual cleanup of old logs
SELECT cleanup_old_event_logs();

-- View log statistics
SELECT * FROM get_event_log_stats(
  NOW() - INTERVAL '7 days',  -- Start date
  NOW()                        -- End date
);
```

### Performance Monitoring

Monitor log table size and query performance:

```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('event_logs'));

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read 
FROM pg_stat_user_indexes 
WHERE tablename = 'event_logs';
```

## Troubleshooting

### Common Issues

1. **No logs appearing**
   - Check RLS policies are correctly applied
   - Verify user has superadmin role
   - Check browser console for JavaScript errors

2. **Performance issues**
   - Ensure indexes are created
   - Check for large log volumes
   - Consider running cleanup functions

3. **Missing events**
   - Verify hooks are properly integrated
   - Check eventLogger initialization
   - Review browser console for errors

### Debug Mode

Enable debug logging by adding to browser console:

```javascript
// Check if eventLogger is working
console.log('EventLogger initialized:', !!window.eventLogger)

// Test logging
eventLogger.logSystemEvent('Debug test', { test: true })
```

## Future Enhancements

### Planned Features
- **Log Export**: CSV/JSON export functionality
- **Real-time Notifications**: Alert on critical events
- **Advanced Analytics**: User behavior insights
- **Log Archiving**: Long-term storage solutions
- **Custom Dashboards**: Visual log analytics

### Integration Opportunities
- **External Monitoring**: Integration with monitoring services
- **Alert Systems**: Email/SMS notifications for critical events
- **Audit Reports**: Automated compliance reporting
- **Performance Metrics**: System performance tracking

## Support

For issues or questions about the event logging system:
1. Check this documentation
2. Review the database migration
3. Test with superadmin account
4. Check browser console for errors
5. Verify RLS policies in Supabase
