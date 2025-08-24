# Player Attendance Statistics Feature

## Overview
Added a comprehensive player attendance statistics table below the existing sessions list on the attendance overview page. This table provides detailed insights into individual player attendance patterns across all active squads.

## Features

### 1. **Player Attendance Summary Table**
- **Location**: Below the existing sessions list on the attendance overview page
- **Purpose**: Track individual player attendance performance
- **Scope**: All players currently in active squads

### 2. **Statistics Displayed**
For each player, the table shows:
- **Player Name & Photo**: Visual identification with profile picture or initials
- **Squads**: All active squads the player belongs to
- **Sessions Attended**: Number of sessions the player actually attended
- **Sessions Eligible**: Total sessions the player was eligible to attend
- **Attendance Rate**: Percentage of eligible sessions attended

### 3. **Smart Filtering**
- **Active Squads Only**: Only shows players currently in active squads
- **Past Sessions Only**: Excludes future sessions from eligibility calculations
- **Squad-Based Eligibility**: Players are only eligible for sessions where their squad was invited

## Technical Implementation

### 1. **Data Fetching**
```javascript
const fetchPlayerAttendanceStats = async () => {
  // Get current date to exclude future sessions
  const currentDate = new Date().toISOString().split('T')[0]
  
  // Fetch all active squad players with squad relationships
  const { data: activePlayers } = await supabase
    .from('players')
    .select(`
      id, first_name, last_name, photo_url,
      player_squads!inner(
        squad_id,
        squads!inner(id, name, is_active)
      )
    `)
    .eq('organization_id', orgId)
    .eq('player_squads.squads.is_active', true)
}
```

### 2. **Eligibility Calculation**
```javascript
// Count sessions this player was eligible to attend
const eligibleSessionsCount = eligibleSessions.filter(session => 
  session.session_squads.some(ss => playerSquadIds.includes(ss.squad_id))
).length
```

### 3. **Attendance Calculation**
```javascript
// Count sessions this player actually attended
const attendedSessionsCount = allAttendance.filter(record => 
  record.player_id === player.id && record.attended
).length

// Calculate attendance percentage
const attendancePercentage = eligibleSessionsCount > 0 
  ? Math.round((attendedSessionsCount / eligibleSessionsCount) * 100) 
  : 0
```

### 4. **Sorting & Display**
- **Primary Sort**: Attendance percentage (descending - highest performers first)
- **Secondary Sort**: Player name (alphabetical)
- **Visual Indicators**: Color-coded progress bars (green ≥80%, yellow ≥60%, red <60%)

## User Experience Features

### 1. **Loading States**
- **Skeleton Loading**: Animated placeholders while data loads
- **Progressive Loading**: Stats appear as they become available
- **Error Handling**: Graceful fallbacks if data fetching fails

### 2. **Visual Design**
- **Responsive Table**: Horizontal scroll on smaller screens
- **Hover Effects**: Row highlighting for better interaction
- **Progress Bars**: Visual representation of attendance rates
- **Color Coding**: Intuitive color scheme for attendance levels

### 3. **Data Presentation**
- **Player Photos**: Profile pictures or initials fallback
- **Squad Information**: Comma-separated list of all active squads
- **Attendance Metrics**: Clear numerical and percentage displays

## Business Logic

### 1. **Eligibility Rules**
- Player must be in an active squad
- Squad must be invited to the session
- Session date must be today or in the past (no future sessions)

### 2. **Attendance Rules**
- Only counts sessions where `attended = true`
- Excludes sessions where attendance wasn't recorded
- Handles players in multiple squads correctly

### 3. **Performance Metrics**
- **High Performers**: 80%+ attendance rate (green)
- **Moderate Performers**: 60-79% attendance rate (yellow)
- **Low Performers**: Below 60% attendance rate (red)

## Data Relationships

### 1. **Database Tables Used**
- `players`: Player information and photos
- `squads`: Squad details and active status
- `player_squads`: Player-squad relationships
- `sessions`: Session information and dates
- `session_squads`: Session-squad invitations
- `session_attendance`: Actual attendance records

### 2. **Key Relationships**
```
players ←→ player_squads ←→ squads
sessions ←→ session_squads ←→ squads
sessions ←→ session_attendance ←→ players
```

## Performance Considerations

### 1. **Efficient Queries**
- **Inner Joins**: Only fetch players in active squads
- **Batch Operations**: Single queries for multiple data types
- **Indexed Fields**: Uses organization_id and date for filtering

### 2. **Async Processing**
- **Non-blocking**: Stats calculation doesn't block UI
- **Progressive Updates**: Data appears as it becomes available
- **Error Isolation**: Individual failures don't break the entire feature

### 3. **Memory Management**
- **State Cleanup**: Proper cleanup of photo URLs
- **Efficient Rendering**: Only re-render when necessary
- **Optimized Loops**: Minimal iterations for data processing

## Use Cases

### 1. **Coaches & Administrators**
- **Performance Tracking**: Identify players with attendance issues
- **Squad Management**: Understand squad participation patterns
- **Intervention Planning**: Target support for low-attendance players

### 2. **Player Development**
- **Progress Monitoring**: Track improvement over time
- **Goal Setting**: Set attendance targets for players
- **Recognition**: Highlight high-performing players

### 3. **Organization Insights**
- **Trend Analysis**: Understand overall attendance patterns
- **Resource Planning**: Plan sessions based on participation rates
- **Communication**: Target messaging to specific attendance groups

## Future Enhancements

### 1. **Additional Metrics**
- **Trend Analysis**: Attendance over time periods
- **Seasonal Patterns**: Monthly/quarterly comparisons
- **Squad Comparisons**: Squad-level attendance analysis

### 2. **Interactive Features**
- **Filtering**: Filter by squad, attendance range, or date
- **Sorting**: Additional sort options (name, squad, etc.)
- **Export**: Download attendance reports

### 3. **Notifications**
- **Low Attendance Alerts**: Automatic notifications for coaches
- **Improvement Tracking**: Celebrate attendance improvements
- **Goal Setting**: Individual attendance targets

## Testing Scenarios

### 1. **Basic Functionality**
- Verify table loads with player data
- Check attendance calculations are correct
- Ensure sorting works properly

### 2. **Edge Cases**
- Players in multiple squads
- Sessions with no attendance records
- Future sessions (should be excluded)
- Inactive squads (should be excluded)

### 3. **Performance**
- Large number of players
- Many sessions and attendance records
- Slow network conditions
- Error handling scenarios

This feature provides valuable insights into player attendance patterns, helping coaches and administrators make data-driven decisions about player development and squad management.
