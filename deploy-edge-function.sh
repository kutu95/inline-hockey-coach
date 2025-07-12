#!/bin/bash

echo "🚀 Deploying Edge Function for Server-Side Email Sending"
echo ""

echo "📋 Prerequisites:"
echo "1. Make sure you're logged into Supabase CLI"
echo "2. Docker Desktop is installed and running (for CLI deployment)"
echo "3. Or use the Supabase Dashboard method (recommended)"
echo ""

echo "🔧 Current Setup:"
echo "- Project: iktybklkggzmcynibhbl"
echo "- Function: send-invitation-email"
echo "- Environment variables: ✅ Set"
echo ""

echo "📝 Deployment Options:"
echo ""
echo "Option 1: Deploy via Supabase Dashboard (Recommended)"
echo "1. Go to: https://supabase.com/dashboard/project/iktybklkggzmcynibhbl"
echo "2. Navigate to Edge Functions"
echo "3. Click 'Create a new function'"
echo "4. Name: send-invitation-email"
echo "5. Copy the code from supabase/functions/send-invitation-email/index.ts"
echo "6. Click Deploy"
echo ""

echo "Option 2: Install Docker and Deploy via CLI"
echo "1. Install Docker Desktop: https://docs.docker.com/desktop/"
echo "2. Start Docker Desktop"
echo "3. Run: supabase functions deploy send-invitation-email"
echo ""

echo "Option 3: Manual Deployment"
echo "1. Go to Supabase Dashboard > Edge Functions"
echo "2. Create new function with the code provided in DEPLOY_EDGE_FUNCTION.md"
echo ""

echo "✅ Environment Variables are already set:"
echo "- RESEND_API_KEY: ✅"
echo "- SITE_URL: ✅"
echo ""

echo "🧪 Test the function after deployment:"
echo "node test-edge-function.js"
echo ""

echo "📖 Full instructions: DEPLOY_EDGE_FUNCTION.md" 