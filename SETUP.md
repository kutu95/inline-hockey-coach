# Supabase Authentication Setup

This project uses Supabase for authentication. Follow these steps to set up your environment:

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be created

## 2. Get Your Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon/public key

## 3. Set Up Environment Variables

Create a `.env` file in the root of your project with:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase credentials.

## 4. Configure Authentication

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Configure your site URL (e.g., `http://localhost:5173` for development)
3. Add redirect URLs if needed

## 5. Start the Development Server

```bash
npm run dev
```

## Features

The login component includes:

- **Sign In**: Email and password authentication
- **Sign Up**: New user registration with email confirmation
- **Password Reset**: Email-based password reset functionality
- **Protected Routes**: Automatic redirection based on auth state
- **Loading States**: Proper loading indicators during auth operations
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on mobile and desktop

## Usage

1. Navigate to `/login` to access the authentication page
2. Sign up with a new account or sign in with existing credentials
3. After successful authentication, you'll be redirected to `/dashboard`
4. Use the "Sign Out" button to log out

## Security Notes

- All authentication is handled securely through Supabase
- Passwords are never stored locally
- Session management is handled automatically
- Environment variables are required for security 