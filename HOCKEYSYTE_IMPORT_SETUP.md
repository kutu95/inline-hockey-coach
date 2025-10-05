# HockeySyte Import Feature Setup Guide

This guide explains how to set up and use the HockeySyte import feature to automatically import player data from hockeysyte.com team pages.

## Overview

The HockeySyte import feature allows superadmins to:
1. Scrape player data from hockeysyte.com team pages
2. Import players into existing or new organizations
3. Add players to existing or new squads
4. Handle duplicate detection and data validation

## Features

### Web Scraping
- Automatically extracts player information from hockeysyte.com team pages
- Handles various HTML structures and data formats
- Filters out staff members (coaches, managers, etc.)
- Validates scraped data before import

### Import Process
- **Step 1**: Enter HockeySyte team URL
- **Step 2**: Preview scraped player data
- **Step 3**: Select or create organization and squad
- **Step 4**: Import players with detailed results

### Data Handling
- **Duplicate Detection**: Checks for existing players by name and organization
- **Data Validation**: Ensures required fields are present
- **Error Handling**: Graceful handling of import errors
- **Results Summary**: Detailed report of import success/failures

## Setup Instructions

### 1. Database Requirements

Ensure your database has the following tables with proper relationships:
- `clubs` (organizations)
- `squads` (teams within organizations)
- `players` (individual players)
- `player_squads` (player-team relationships)

### 2. File Structure

The following files are required for the import feature:

```
src/
├── utils/
│   └── hockeysyteScraper.js          # Scraping utility functions
├── components/
│   └── HockeySyteImportDialog.jsx    # Import dialog component
supabase/
└── functions/
    └── scrape-hockeysyte/
        └── index.ts                   # Supabase Edge Function
```

### 3. Edge Function (Recommended)

The Supabase Edge Function (`scrape-hockeysyte`) handles:
- CORS-free web scraping
- HTML parsing and data extraction
- JSON data extraction from modern web apps
- Multiple fallback parsing methods
- Server-side execution with proper error handling

**Deployment**: See `HOCKEYSYTE_EDGE_FUNCTION_SETUP.md` for deployment instructions.

### 4. Dashboard Integration

The import feature is accessible from the superadmin dashboard:
- Green "Import from HockeySyte" button
- Requires superadmin role
- Opens import dialog with step-by-step process

## Usage Instructions

### Step 1: Access Import Feature
1. Log in as a superadmin
2. Navigate to the Dashboard
3. Click "Import from HockeySyte" button

### Step 2: Enter Team URL
1. Enter the full HockeySyte team page URL
2. Example: `https://ilha.hockeysyte.com/team/936`
3. Click "Scrape Team" to extract player data

### Step 3: Preview Players
1. Review the scraped player data
2. Verify jersey numbers, names, and player types
3. Click "Continue to Import" to proceed

### Step 4: Select Organization & Squad
1. **Organization**: Select existing or create new
2. **Squad**: Select existing or create new
3. Click "Import Players" to complete the process

### Step 5: Review Results
1. View import summary (imported/updated/skipped/errors)
2. Review individual player details
3. Check any error messages
4. Click "Close" to finish

## Data Format

### Scraped Player Data
```javascript
{
  jerseyNumber: 11,        // Jersey number (integer)
  firstName: "Steven",     // First name
  lastName: "Adams",       // Last name
  playerType: "Skater",    // "Skater" or "Goalie"
  fullName: "Steven Adams" // Combined name
}
```

### Import Results
```javascript
{
  imported: 5,             // New players created
  updated: 2,              // Existing players updated
  skipped: 1,              // Players already in squad
  errors: [],              // Array of error objects
  players: [...]           // Array of processed players
}
```

## Supported URLs

The scraper supports URLs in the format:
- `https://ilha.hockeysyte.com/team/[TEAM_ID]`
- `https://hockeysyte.com/team/[TEAM_ID]`
- Other hockeysyte.com subdomains

## Error Handling

### Common Issues
1. **Invalid URL**: Must be from hockeysyte.com domain
2. **Network Errors**: Check internet connection and URL accessibility
3. **Parsing Errors**: Website structure may have changed
4. **Database Errors**: Check database connectivity and permissions

### Troubleshooting
1. **No Players Found**: Website structure may have changed
2. **Import Failures**: Check database permissions and data validation
3. **Duplicate Players**: System automatically handles duplicates
4. **Missing Data**: Some fields may be optional (jersey numbers, etc.)

## Security Considerations

### Access Control
- Only superadmins can access the import feature
- All scraping is done server-side to avoid CORS issues
- User authentication required for all operations

### Data Validation
- Input validation for URLs and user data
- Sanitization of scraped data
- Duplicate detection to prevent data corruption

### Rate Limiting
- Consider implementing rate limiting for scraping requests
- Respect website terms of service
- Use appropriate delays between requests if needed

## Customization

### Parsing Logic
The scraper uses multiple parsing methods:
1. JSON data extraction from page state
2. Script tag content parsing
3. HTML structure parsing with regex
4. Fallback pattern matching

### Data Mapping
You can customize the data mapping in `hockeysyteScraper.js`:
- Player type detection logic
- Field name mappings
- Validation rules
- Default values

### UI Customization
The import dialog can be customized in `HockeySyteImportDialog.jsx`:
- Step-by-step process flow
- Validation messages
- Success/error handling
- UI styling and layout

## Monitoring

### Event Logging
All import activities are logged through the event logging system:
- User actions (URL entry, import initiation)
- Data operations (player creation, updates)
- Error events and troubleshooting

### Performance Metrics
Monitor the following metrics:
- Scraping success rate
- Import completion time
- Error frequency and types
- User adoption and usage patterns

## Future Enhancements

### Planned Features
1. **Batch Import**: Import multiple teams at once
2. **Scheduled Imports**: Automatic periodic updates
3. **Data Sync**: Keep player data synchronized
4. **Advanced Filtering**: More sophisticated player filtering
5. **Custom Parsing**: Support for other hockey websites

### Technical Improvements
1. **Caching**: Cache scraped data to reduce API calls
2. **Parallel Processing**: Import multiple teams simultaneously
3. **Better Error Recovery**: Retry failed operations
4. **Data Backup**: Backup before bulk imports

## Support

For technical support or feature requests:
1. Check the console logs for detailed error messages
2. Review the event logs for import history
3. Test with different team URLs to isolate issues
4. Contact the development team for assistance

## Version History

- **v1.0.0**: Initial implementation with basic scraping and import
- **v1.1.0**: Added advanced parsing methods and error handling
- **v1.2.0**: Improved UI/UX and validation logic
