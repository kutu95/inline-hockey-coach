# Game Management Feature Setup

## Overview

The Game Management feature provides a mobile-first interface for real-time game time management during inline hockey games. It includes game clock controls, player management with drag & drop, and event recording.

## Features

### 1. Game Clock Controls
- **Start/Stop Toggle**: Control game play with a single button
- **Dual Timers**: 
  - Game Time: Total elapsed time since game start
  - Play Time: Accumulated active play time (excluding stoppages)
- **Visual Indicators**: Clear status indicators for game state

### 2. Player Management
- **Two-Column Layout**: 
  - Left: Bench (inactive players)
  - Right: On Rink (active players)
- **Drag & Drop**: Move players between bench and rink
- **Player Cards**: Show player name, jersey number, and time statistics
- **Status Tracking**: Track time on bench vs. rink

### 3. Game Events
- **Goal Recording**: 
  - Goal For button (assigns +1 to all rink players)
  - Goal Against button (assigns -1 to all rink players)
- **Score Display**: Large, clear score display
- **End Game**: Close the game session

### 4. Data Recording
- **Event Logging**: All events are recorded with timestamps
- **Player Statistics**: Track individual player time and performance
- **Game Statistics**: Goals, play time, and game duration

## Database Schema

### Tables Created

1. **game_events**: Records all game events
   - `id`: UUID primary key
   - `session_id`: References sessions table
   - `event_type`: Type of event (play_start, play_stop, player_on, player_off, goal_for, goal_against, game_end)
   - `player_id`: Player involved (NULL for non-player events)
   - `event_time`: When the event occurred
   - `game_time_seconds`: Game time when event occurred
   - `play_time_seconds`: Total play time when event occurred
   - `metadata`: Additional event data (JSONB)

2. **game_sessions**: Tracks active game state
   - `id`: UUID primary key
   - `session_id`: References sessions table
   - `is_active`: Whether game is currently active
   - `game_start_time`: When the game started
   - `current_play_start_time`: When current play period started
   - `total_play_time_seconds`: Total accumulated play time
   - `goals_for`: Goals scored for
   - `goals_against`: Goals scored against

3. **game_player_status**: Tracks player positions
   - `id`: UUID primary key
   - `session_id`: References sessions table
   - `player_id`: References players table
   - `status`: 'bench' or 'rink'
   - `status_start_time`: When status changed
   - `total_rink_time_seconds`: Total accumulated rink time
   - `current_shift_time_seconds`: Time in current shift/bench

## Setup Instructions

### 1. Database Migration

Run the SQL migration file in your Supabase SQL editor:

```sql
-- Run the contents of supabase-migration-game-management.sql
```

### 2. Route Configuration

The route is already configured in `src/App.jsx`:

```javascript
<Route 
  path="/sessions/:sessionId/game-management" 
  element={
    <RoleProtectedRoute requiredRoles={['coach', 'admin', 'superadmin']}>
      <GameManagement />
    </RoleProtectedRoute>
  } 
/>
```

### 3. Session Integration

The "Manage Game" link is automatically added to session details pages for sessions with `event_type = 'game'`.

## Usage

### 1. Accessing Game Management

1. Navigate to a session with `event_type = 'game'`
2. Click the "Manage Game" button in the session details
3. The game management interface will open

### 2. Starting a Game

1. Click "Start Game" to begin the game session
2. The game clock will start running
3. All squad players will be placed on the bench initially

### 3. Managing Players

1. **Drag players** from bench to rink to put them in play
2. **Drag players** from rink to bench to take them out
3. **Player cards** show current status and time information

### 4. Recording Events

1. **Goal For**: Click when your team scores
2. **Goal Against**: Click when opponent scores
3. **End Game**: Click to finish the game session

### 5. Game Clock Control

1. **Start Play**: Click to begin active play (play time accumulates)
2. **Stop Play**: Click to pause play (play time stops)
3. **Game Time**: Always runs from game start
4. **Play Time**: Only runs during active play periods

## Mobile Optimization

### 1. Screen Wake Lock

The interface includes features to prevent auto-sleep:
- Wake Lock API (when supported)
- Minimal animation to keep screen active
- Touch-friendly button sizes (44px minimum)

### 2. Responsive Design

- **Mobile-first**: Optimized for mobile devices
- **Touch-friendly**: Large touch targets for drag & drop
- **Landscape support**: Optimized for landscape orientation
- **High DPI**: Crisp rendering on high-resolution displays

### 3. Performance

- **Efficient updates**: Minimal re-renders
- **Smooth animations**: CSS transitions for drag & drop
- **Memory management**: Proper cleanup of intervals

## Technical Details

### 1. State Management

- **Game State**: Tracks game session, timers, and player positions
- **Player State**: Manages bench and rink player lists
- **Event State**: Handles drag & drop and event recording

### 2. Data Flow

1. **Load Session**: Fetch session and squad data
2. **Initialize Game**: Create game session record
3. **Track Events**: Record all player movements and game events
4. **Update State**: Real-time updates to UI and database

### 3. Error Handling

- **Database Errors**: Graceful error handling with user feedback
- **Network Issues**: Retry logic for failed operations
- **State Recovery**: Maintain state during navigation

## Security

### 1. Row Level Security (RLS)

All tables have RLS policies that ensure:
- Users can only access their own organization's data
- Coaches can only manage their own sessions
- Players can only view their own statistics

### 2. Role-Based Access

- **Coaches**: Full access to game management
- **Admins**: Full access to all game management
- **Superadmins**: Full access to all game management
- **Players**: No access to game management

## Troubleshooting

### 1. Common Issues

- **Import Errors**: Ensure all imports are correct
- **Database Errors**: Check RLS policies and table permissions
- **Mobile Issues**: Test on actual mobile devices

### 2. Performance Issues

- **Slow Loading**: Check database indexes
- **Memory Leaks**: Ensure proper cleanup of intervals
- **UI Lag**: Optimize re-renders and state updates

### 3. Mobile Issues

- **Auto-sleep**: Ensure wake lock is working
- **Touch Issues**: Check touch event handling
- **Layout Issues**: Test on various screen sizes

## Future Enhancements

### 1. Planned Features

- **Period Management**: Track game periods
- **Penalty Tracking**: Record penalties and power plays
- **Advanced Statistics**: More detailed player analytics
- **Export Features**: Export game data to various formats

### 2. Integration Opportunities

- **Live Scoring**: Real-time score updates
- **Video Integration**: Link to game videos
- **Statistics Dashboard**: Comprehensive game analytics
- **Team Management**: Advanced roster management

## Support

For issues or questions:
1. Check the console for error messages
2. Verify database permissions
3. Test on different devices
4. Check network connectivity

The Game Management feature is designed to be robust, mobile-friendly, and easy to use for coaches managing inline hockey games.
