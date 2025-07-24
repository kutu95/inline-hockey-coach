# Inline Hockey Coach App

A comprehensive web application for managing inline hockey teams, players, sessions, and drills.

## Features

- **Team Management**: Create and manage teams, squads, and players
- **Session Planning**: Plan and track training sessions with detailed drills
- **Drill Library**: Extensive library of hockey drills with animations
- **Attendance Tracking**: Track player attendance and performance
- **Role-Based Access**: Multi-tenant system with role-based permissions
- **AI Integration**: AI-powered drill generation and session planning
- **PDF Export**: Generate session reports and player profiles

## Version Management

This project includes automatic version incrementing. Every time you commit and push to GitHub, the minor version number is automatically incremented.

### How it works:
- **Pre-commit hook**: Automatically runs before each commit
- **Version increment**: Minor version number is incremented (e.g., 1.0.0 → 1.1.0)
- **Automatic commit**: Updated package.json is automatically added to the commit

### Manual version increment:
```bash
npm run increment-version
```

### Current version: 0.2.0

## Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run development server: `npm run dev`

### Build
```bash
npm run build
```

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Custom components with Konva for animations
- **PDF Generation**: jsPDF with AutoTable
- **Email**: Resend API
- **AI**: OpenAI API integration
