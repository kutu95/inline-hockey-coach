import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from '../components/Login'
import AcceptInvitation from '../components/AcceptInvitation'
import Dashboard from '../components/Dashboard'
import PlayerList from '../components/PlayerList'
import PlayerProfile from '../components/PlayerProfile'
import AddPlayer from '../components/AddPlayer'
import ViewPlayer from '../components/ViewPlayer'
import EditPlayer from '../components/EditPlayer'
import Clubs from '../components/Clubs'
import ViewClub from '../components/ViewClub'
import Squads from '../components/Squads'
import ViewSquad from '../components/ViewSquad'
import Sessions from '../components/Sessions'
import SessionsCalendar from '../components/SessionsCalendar'
import SessionAttendance from '../components/SessionAttendance'
import OrganizationAttendance from '../components/OrganizationAttendance'
import Drills from '../components/Drills'
import UserAdmin from '../components/UserAdmin'
import Organisations from '../components/Organisations'
import OrganizationDetail from '../components/OrganizationDetail'
import Locations from '../components/Locations'
import AdminPanel from '../components/AdminPanel'
import Reports from '../components/Reports'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import RoleBasedRedirect from '../components/RoleBasedRedirect'
import './App.css'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" replace />
}

// Public Route Component (redirects based on user role if already logged in)
const PublicRoute = ({ children }) => {
  const { user, userRoles, loading } = useAuth()
  
  console.log('PublicRoute: user:', !!user, 'userRoles:', userRoles, 'loading:', loading)
  
  if (loading) {
    console.log('PublicRoute: Still loading, showing spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  // If user exists and roles are loaded, redirect based on role
  if (user && userRoles.length > 0) {
    console.log('PublicRoute: User exists and roles loaded, redirecting')
    return <RoleBasedRedirect />
  }
  
  // If user exists but has no roles, redirect to dashboard as fallback
  if (user && userRoles.length === 0) {
    console.log('PublicRoute: User exists but has no roles, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }
  
  // If no user, show the login page
  console.log('PublicRoute: No user, showing login page')
  return children
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/accept-invitation" 
              element={<AcceptInvitation />} 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/player-profile" 
              element={
                <RoleProtectedRoute requiredRoles={['player']}>
                  <PlayerProfile />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Superadmin-only routes */}
            <Route 
              path="/organisations" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <Organisations />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <OrganizationDetail />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Organization-scoped routes */}
            <Route 
              path="/organisations/:orgId/players" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <PlayerList />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/players/add" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <AddPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/players/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <ViewPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/players/:id/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <EditPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/squads" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <Squads />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/squads/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <ViewSquad />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <Sessions />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/drills" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <Drills />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/clubs" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <Clubs />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/clubs/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <ViewClub />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/attendance" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <OrganizationAttendance />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions/:sessionId/attendance" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <SessionAttendance />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/locations" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <Locations />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/admin" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <AdminPanel />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/reports" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin']}>
                  <Reports />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Admin-only routes */}
            <Route 
              path="/admin/users" 
              element={
                <RoleProtectedRoute requiredRoles={['admin']}>
                  <UserAdmin />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Coach and Admin routes */}
            <Route 
              path="/players" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <PlayerList />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/players/add" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <AddPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/players/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <ViewPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/players/:id/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <EditPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/clubs" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <Clubs />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/clubs/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <ViewClub />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/squads" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <Squads />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/squads/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <ViewSquad />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sessions" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin', 'player']}>
                  <Sessions />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sessions/calendar" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin', 'player']}>
                  <SessionsCalendar />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sessions/:sessionId/attendance" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <SessionAttendance />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/drills" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin', 'player']}>
                  <Drills />
                </RoleProtectedRoute>
              } 
            />
            <Route path="/" element={<RoleBasedRedirect />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
