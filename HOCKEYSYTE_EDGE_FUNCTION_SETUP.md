# HockeySyte Edge Function Setup Guide

This guide explains how to deploy the HockeySyte scraping Edge Function to enable real-time web scraping from hockeysyte.com.

## Overview

The HockeySyte import feature now includes a Supabase Edge Function that handles server-side web scraping, avoiding CORS issues and providing reliable data extraction.

## Current Status

✅ **Edge Function Created**: `supabase/functions/scrape-hockeysyte/index.ts`
✅ **Client Integration**: Updated scraper utility with Edge Function support
✅ **Fallback System**: Mock data when Edge Function is not deployed
✅ **Error Handling**: Graceful fallback to mock data for testing

## Deployment Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/iktybklkggzmcynibhbl
   - Go to **Edge Functions** section

2. **Create New Function**:
   - Click **Create a new function**
   - Name: `scrape-hockeysyte`
   - Copy the code from `supabase/functions/scrape-hockeysyte/index.ts`

3. **Deploy**:
   - Click **Deploy** to make the function live

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref iktybklkggzmcynibhbl

# Deploy the function
supabase functions deploy scrape-hockeysyte
```

## Testing the Edge Function

### After Deployment

1. **Test the Import Feature**:
   - Go to Dashboard → "Import from HockeySyte"
   - Enter a valid team URL (e.g., `https://ilha.hockeysyte.com/team/936`)
   - Click "Scrape Team"

2. **Check Console Logs**:
   - Open browser developer tools
   - Look for success messages:
     ```
     Successfully scraped players via Edge Function: [...]
     ```

3. **Verify Data**:
   - The preview should show real player data instead of mock data
   - Player names, jersey numbers, and types should be accurate

### Expected Behavior

**With Edge Function Deployed**:
- ✅ Real player data scraped from hockeysyte.com
- ✅ No CORS issues
- ✅ Accurate player information
- ✅ Proper error handling

**Without Edge Function (Fallback)**:
- ⚠️ Mock data displayed for testing
- ✅ Import process still works
- ✅ Database integration functional

## Troubleshooting

### Edge Function Not Working

**Check Function Status**:
1. Go to Supabase Dashboard → Edge Functions
2. Verify `scrape-hockeysyte` function is deployed and active
3. Check function logs for errors

**Common Issues**:
- **Function not deployed**: Deploy the function using the steps above
- **Permission errors**: Ensure function has proper permissions
- **Timeout errors**: Increase function timeout in Supabase settings

### Import Process Issues

**Check Console Logs**:
```javascript
// Look for these messages in browser console:
"Scraping team URL: https://ilha.hockeysyte.com/team/936"
"Successfully scraped players via Edge Function: [...]"
// OR
"Edge Function not available or failed: [...]"
"Using mock data for testing"
```

**Network Issues**:
- Check if hockeysyte.com is accessible
- Verify URL format is correct
- Ensure internet connection is stable

## Function Features

### Web Scraping Capabilities

1. **Multiple Parsing Methods**:
   - JSON data extraction from page state
   - Script tag content parsing
   - HTML structure parsing with regex
   - Fallback pattern matching

2. **Data Validation**:
   - Player name extraction and cleaning
   - Jersey number parsing
   - Player type detection (Skater/Goalie)
   - Staff member filtering

3. **Error Handling**:
   - Graceful failure recovery
   - Multiple fallback strategies
   - Detailed error logging

### Supported Data Formats

**Input**: HockeySyte team page URLs
```
https://ilha.hockeysyte.com/team/936
```

**Output**: Structured player data
```javascript
[
  {
    jerseyNumber: 11,
    firstName: "Steven",
    lastName: "Adams", 
    playerType: "Skater",
    fullName: "Steven Adams"
  },
  // ... more players
]
```

## Security Considerations

### Access Control
- Edge Function is only accessible via Supabase client
- Requires authenticated user session
- No direct external access

### Rate Limiting
- Supabase handles rate limiting automatically
- Function timeout prevents long-running requests
- Respects website terms of service

### Data Privacy
- No player data is stored by the Edge Function
- Scraped data is only used for import process
- Temporary data processing only

## Performance

### Optimization
- Efficient HTML parsing algorithms
- Minimal data processing
- Fast response times
- Automatic cleanup of temporary data

### Monitoring
- Function execution logs in Supabase Dashboard
- Performance metrics available
- Error tracking and reporting

## Future Enhancements

### Planned Features
1. **Caching**: Cache scraped data to reduce API calls
2. **Batch Processing**: Support for multiple team scraping
3. **Data Sync**: Keep player data synchronized
4. **Advanced Parsing**: Support for other hockey websites

### Technical Improvements
1. **Better Error Recovery**: Retry failed operations
2. **Data Backup**: Backup before bulk imports
3. **Performance Monitoring**: Real-time metrics
4. **Custom Parsing**: User-configurable parsing rules

## Support

### Getting Help
1. **Check Logs**: Review function logs in Supabase Dashboard
2. **Test URLs**: Verify team URLs are accessible
3. **Console Output**: Check browser console for error messages
4. **Documentation**: Refer to this guide for troubleshooting

### Common Solutions
- **Function not found**: Redeploy the Edge Function
- **Permission denied**: Check Supabase project permissions
- **Timeout errors**: Increase function timeout settings
- **Data parsing issues**: Check website structure changes

## Version History

- **v1.0.0**: Initial Edge Function implementation
- **v1.1.0**: Added multiple parsing methods and fallbacks
- **v1.2.0**: Improved error handling and logging
- **v1.3.0**: Enhanced data validation and filtering
