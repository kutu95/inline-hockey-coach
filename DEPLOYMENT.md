# Deployment Guide for Vercel

## Overview

This app is now configured to deploy on Vercel with email functionality using serverless functions.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Resend Account**: Sign up at [resend.com](https://resend.com) for email functionality
3. **Supabase Project**: Your existing Supabase project

## Environment Variables

Set these environment variables in your Vercel project:

### Required Variables

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Resend (for email functionality)
RESEND_API_KEY=your_resend_api_key

# Site URL (for production)
VITE_SITE_URL=https://your-domain.vercel.app
VITE_API_BASE_URL=https://your-domain.vercel.app
```

### Optional Variables

```bash
# For local development
VITE_SITE_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:5173
```

## Deployment Steps

### 1. Connect to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### 2. Set Environment Variables

In your Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all the required variables listed above

### 3. Deploy

```bash
# Deploy to production
vercel --prod
```

## Email Functionality

The email functionality is now handled by Vercel serverless functions:

- **API Route**: `/api/send-invitation`
- **File**: `api/send-invitation.js`
- **Function**: Handles player invitations via Resend

### Testing Email

1. **Local Development**: 
   - Start the dev server: `npm run dev`
   - Email API will work locally

2. **Production**:
   - Deploy to Vercel
   - Set `RESEND_API_KEY` environment variable
   - Test invitation functionality

## Domain Configuration

### For Production Email

When you have your final domain:

1. **Add domain to Resend**:
   - Go to [resend.com/domains](https://resend.com/domains)
   - Add and verify your domain

2. **Update email configuration**:
   - Edit `api/send-invitation.js`
   - Change `from` address to use your domain
   - Redeploy

### Example Domain Update

```javascript
// In api/send-invitation.js
from: 'Inline Hockey Coach <noreply@yourdomain.com>'
```

## File Structure

```
├── api/
│   └── send-invitation.js    # Vercel serverless function
├── src/
│   └── lib/
│       └── email.js          # Email service library
├── vercel.json               # Vercel configuration
└── DEPLOYMENT.md            # This file
```

## Troubleshooting

### Email Not Sending

1. **Check Resend API Key**: Ensure `RESEND_API_KEY` is set in Vercel
2. **Check Domain**: For production, verify your domain in Resend
3. **Check Logs**: View function logs in Vercel dashboard

### API Errors

1. **CORS Issues**: The API includes CORS headers for cross-origin requests
2. **Timeout**: Function timeout is set to 30 seconds
3. **Environment Variables**: Ensure all required variables are set

### Local Development

For local development, the API will work with the dev server. The email library automatically detects the environment and uses the appropriate endpoint.

## Migration from Express Server

The old `server.js` Express server is no longer needed. The email functionality has been migrated to Vercel serverless functions.

**Files to remove after deployment**:
- `server.js` (Express server)
- Any references to `localhost:3001`

## Security Notes

- API routes are automatically protected by Vercel
- Environment variables are encrypted
- CORS is configured for your domain
- Rate limiting is handled by Vercel

## Cost Considerations

- **Vercel**: Free tier includes 100GB bandwidth and 100 serverless function executions per day
- **Resend**: Free tier includes 3,000 emails per month
- **Supabase**: Free tier includes 500MB database and 50,000 monthly active users

For higher usage, consider upgrading your plans accordingly. 