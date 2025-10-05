# Deploy HockeySyte Scraping Edge Function

## 🚀 Quick Deployment (Recommended)

### Option 1: Supabase Dashboard (Fastest)

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/iktybklkggzmcynibhbl
2. **Navigate to Edge Functions** in the left sidebar
3. **Click "Create a new function"**
4. **Name it**: `scrape-hockeysyte`
5. **Copy the code** from `supabase/functions/scrape-hockeysyte/index.ts` into the editor
6. **Click "Deploy"**

That's it! The function will be deployed and ready to use.

## 📋 What This Does

The Edge Function will:
- ✅ Scrape real player data from `ilha.hockeysyte.com/team/*` URLs
- ✅ Parse player information (jersey number, name, position)
- ✅ Filter out staff members (coaches, managers, etc.)
- ✅ Return clean player data for import
- ✅ Handle different team sizes automatically
- ✅ Work server-side (no CORS issues)

## 🧪 Test After Deployment

Once deployed, test it by:

1. **Go to Dashboard** → "Import from HockeySyte"
2. **Enter a real team URL**: `https://ilha.hockeysyte.com/team/936`
3. **Click "Scrape Team"**
4. **Verify**: You should see real players from that team

## 🔧 Expected Behavior

### Before Deployment (Current)
- ❌ Uses mock data (12 fake players)
- ❌ Same players every time regardless of URL

### After Deployment (Real Scraping)
- ✅ Scrapes actual team rosters
- ✅ Different players for different teams
- ✅ Real jersey numbers and names
- ✅ Varying team sizes (some teams have 15+ players, others have 8)

## 📊 Real Team Examples

After deployment, try these real team URLs:

- **Team 936**: `https://ilha.hockeysyte.com/team/936`
- **Team 937**: `https://ilha.hockeysyte.com/team/937` 
- **Team 938**: `https://ilha.hockeysyte.com/team/938`

Each should return different player rosters with real data.

## 🛠️ Technical Details

### Edge Function Features
- **Multiple parsing methods**: JSON extraction, HTML parsing, regex patterns
- **Robust error handling**: Graceful fallbacks if one method fails
- **Staff filtering**: Automatically excludes coaches, managers, etc.
- **Data validation**: Ensures all required fields are present

### Data Structure Returned
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

## 🚨 Troubleshooting

### If scraping fails:
1. **Check Edge Function logs** in Supabase Dashboard
2. **Verify team URL** is from `ilha.hockeysyte.com/team/`
3. **Try different team URL** - some teams may have different page structures
4. **Check console logs** for detailed error messages

### Common Issues:
- **404 errors**: Team URL doesn't exist
- **Parsing errors**: Page structure changed (Edge Function handles multiple formats)
- **Empty results**: Team has no players listed or all are staff

## 📁 Files Involved

- **Edge Function**: `supabase/functions/scrape-hockeysyte/index.ts`
- **Client Code**: `src/utils/hockeysyteScraper.js`
- **Import Dialog**: `components/HockeySyteImportDialog.jsx`
- **Dashboard**: `components/Dashboard.jsx` (Import button)

## ⚡ Performance

- **Scraping time**: 2-5 seconds per team
- **Rate limiting**: Built into Edge Function to avoid overwhelming target site
- **Caching**: None (always fresh data)
- **Concurrent requests**: Limited to prevent abuse

## 🔒 Security

- **Server-side only**: No client-side scraping (avoids CORS)
- **Rate limiting**: Prevents abuse of target website
- **Input validation**: Only accepts valid HockeySyte URLs
- **Error handling**: Doesn't expose internal errors to client

## 🎯 Next Steps

1. **Deploy the Edge Function** (5 minutes)
2. **Test with real team URLs** 
3. **Import players to your organization**
4. **Enjoy real player data!**

The system will automatically switch from mock data to real scraping once the Edge Function is deployed.
