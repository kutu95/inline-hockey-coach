# 🎥 Game Videos Setup Guide

This guide will help you set up the new game video upload and linking functionality for your session plans.

## 📋 **What's New**

- **Video Upload**: Upload MP4 game video clips (up to 100MB)
- **Session Integration**: Link videos to any section of your session plans
- **Video Player**: Built-in video player with controls and metadata
- **Organization Support**: Videos can be shared within your organization

## 🚀 **Setup Steps**

### **Step 1: Run Database Migration**

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-migration-game-videos.sql`
4. Click **Run** to execute the migration

This will create:
- `game_videos` table for storing video metadata
- RLS policies for secure access
- Helper functions for video management

### **Step 2: Create Storage Bucket**

1. In your **Supabase Dashboard**, go to **Storage**
2. Click **Create a new bucket**
3. Set **Bucket name** to: `game-videos`
4. Set **Public bucket** to: **No** (private bucket for security)
5. Click **Create bucket**

### **Step 3: Set Storage Policies**

The migration will automatically create RLS policies, but you may need to set storage policies:

1. Go to **Storage** → **Policies**
2. Find the `game-videos` bucket
3. Ensure these policies exist:
   - **SELECT**: Allow authenticated users to view videos
   - **INSERT**: Allow authenticated users to upload videos
   - **UPDATE**: Allow authenticated users to update videos
   - **DELETE**: Allow authenticated users to delete videos

## 🎯 **How to Use**

### **Uploading Videos**

1. **Open Session Planner**: Go to any session and click "Edit Plan"
2. **Add Video Block**: Click the **+ Video** button
3. **Upload Video**: 
   - Drag & drop MP4 files or click to browse
   - Add title and description
   - Click "Upload Video"
4. **Add to Plan**: Choose whether to add the video directly to your session plan

### **Adding Videos to Session Plans**

1. **In Session Planner**: Click **+ Video** button
2. **Select Video**: Choose from your uploaded videos or upload a new one
3. **Add Notes**: Add session-specific notes for the video
4. **Save Plan**: Save your session plan with the embedded video

### **Viewing Videos in Sessions**

1. **View Session**: Open any session with video blocks
2. **Play Videos**: Click play on any embedded video
3. **Session Notes**: View session-specific notes below each video

## 🔧 **Features**

### **Video Player**
- **Controls**: Play, pause, volume, fullscreen
- **Progress Bar**: Click to seek through video
- **Metadata**: File size, format, duration, upload date
- **Responsive**: Works on desktop and mobile

### **Video Management**
- **Organization Scoped**: Videos are shared within your organization
- **Personal Videos**: Users can also upload personal videos
- **Search**: Find videos by title or description
- **Session Linking**: Videos can be linked to specific sessions

### **File Support**
- **Formats**: MP4, AVI, MOV, and other video formats
- **Size Limit**: Up to 100MB per video
- **Storage**: Secure Supabase storage with signed URLs

## 🛡️ **Security & Permissions**

### **Access Control**
- **Organization Members**: Can view and upload videos for their organization
- **Personal Videos**: Users can manage their own videos
- **Session Access**: Videos are only visible to users with session access

### **Storage Security**
- **Private Bucket**: Videos are not publicly accessible
- **Signed URLs**: Temporary access URLs with expiration
- **RLS Policies**: Database-level access control

## 🐛 **Troubleshooting**

### **Common Issues**

**Video won't upload:**
- Check file size (must be under 100MB)
- Ensure file is a valid video format
- Check browser console for errors

**Video won't play:**
- Verify storage bucket exists and is named `game-videos`
- Check RLS policies are set correctly
- Ensure user has proper permissions

**Database errors:**
- Run the migration script completely
- Check that all tables were created
- Verify RLS policies are in place

### **Debug Steps**

1. **Check Console**: Look for error messages in browser console
2. **Verify Storage**: Confirm `game-videos` bucket exists
3. **Check Policies**: Ensure storage and database policies are set
4. **Test Permissions**: Try with different user accounts

## 📱 **Mobile Support**

- **Responsive Design**: Video player adapts to screen size
- **Touch Controls**: Optimized for mobile devices
- **File Upload**: Works on mobile browsers
- **Performance**: Optimized for mobile networks

## 🔄 **Future Enhancements**

- **Video Thumbnails**: Auto-generated preview images
- **Video Categories**: Organize videos by type or topic
- **Bulk Upload**: Upload multiple videos at once
- **Video Editing**: Basic trim and crop functionality
- **Analytics**: Track video views and engagement

## 📞 **Support**

If you encounter issues:

1. **Check this guide** for common solutions
2. **Review console errors** for specific error messages
3. **Verify setup steps** were completed correctly
4. **Check Supabase logs** for backend errors

---

**Happy Video Planning! 🏒🎥**
