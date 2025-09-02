import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from '../components/Login'
import AcceptInvitation from '../components/AcceptInvitation'
import ResetPassword from '../components/ResetPassword'
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
import SessionPlanner from '../components/SessionPlanner'
import SessionPDFExport from '../components/SessionPDFExport'
import ViewSession from '../components/ViewSession'
import EditSession from '../components/EditSession'
import Drills from '../components/Drills'
import EditDrill from '../components/EditDrill'
import AddDrill from '../components/AddDrill'
import UserAdmin from '../components/UserAdmin'
import Organisations from '../components/Organisations'
import OrganizationDetail from '../components/OrganizationDetail'
import Locations from '../components/Locations'
import AdminPanel from '../components/AdminPanel'
import Reports from '../components/Reports'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import RoleBasedRedirect from '../components/RoleBasedRedirect'
import UserRoleManagement from '../components/UserRoleManagement'
import PlayerEditRoute from '../components/PlayerEditRoute'
import OrganizationPlayerEditRoute from '../components/OrganizationPlayerEditRoute'
import DrillDesigner from '../components/DrillDesigner'
import DrillDesignerV2 from '../components/DrillDesignerV2'
import ViewDrill from '../components/ViewDrill'
import SessionTemplatesList from '../components/SessionTemplatesList'
import SessionTemplateEditor from '../components/SessionTemplateEditor'
import SessionTemplateView from '../components/SessionTemplateView'
import StrengthConditioning from '../components/StrengthConditioning'
import StrengthConditioningPhase1 from '../components/StrengthConditioningPhase1'
import StrengthConditioningPhase2 from '../components/StrengthConditioningPhase2'
import StrengthConditioningPhase3 from '../components/StrengthConditioningPhase3'
import StrengthConditioningPhase4 from '../components/StrengthConditioningPhase4'
import StrengthConditioningPhase5 from '../components/StrengthConditioningPhase5'
import StrengthConditioningPhase0 from '../components/StrengthConditioningPhase0'
import AuthErrorBoundary from '../components/AuthErrorBoundary'
import AuthErrorHandler from '../components/AuthErrorHandler'
import AccessDenied from '../components/AccessDenied'
import './App.css'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading, authError, userRoles, hasRole } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  // If there's an auth error, let the AuthErrorHandler deal with it
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Special handling for dashboard route - only superadmin should access it
  if (window.location.pathname === '/dashboard' && userRoles.length > 0 && !hasRole('superadmin')) {
    return <Navigate to="/" replace />
  }
  
  return children
}

// Public Route Component (redirects based on user role if already logged in)
const PublicRoute = ({ children }) => {
  const { user, userRoles, loading, authError } = useAuth()
  
  console.log('PublicRoute: user:', !!user, 'userRoles:', userRoles, 'loading:', loading)
  
  if (loading) {
    console.log('PublicRoute: Still loading, showing spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  // If there's an auth error, let the AuthErrorHandler deal with it
  if (authError) {
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
  
  // If user exists but has no roles and we're not loading, redirect to dashboard as fallback
  if (user && userRoles.length === 0 && !loading) {
    console.log('PublicRoute: User exists but has no roles, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }
  
  // If user exists but we're still loading roles, show loading
  if (user && loading) {
    console.log('PublicRoute: User exists but still loading roles')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  // If no user, show the login page
  console.log('PublicRoute: No user, showing login page')
  return children
}

function App() {
  return (
    <AuthProvider>
      <AuthErrorBoundary>
        <Router>
          <div className="App">
            <AuthErrorHandler />
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
              path="/reset-password" 
              element={<ResetPassword />} 
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
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <OrganizationDetail />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Organization-scoped routes */}
            <Route 
              path="/organisations/:orgId/players" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <PlayerList />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/players/add" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <AddPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/players/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <ViewPlayer />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/players/:id/edit" 
              element={
                <OrganizationPlayerEditRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <EditPlayer />
                </OrganizationPlayerEditRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/squads" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <Squads />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/squads/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <ViewSquad />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <Sessions />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/drills" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <Drills />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/drills/add" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <AddDrill />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/drills/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <ViewDrill />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/drills/:drillId/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <EditDrill />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/clubs" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <Clubs />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/clubs/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <ViewClub />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/attendance" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <OrganizationAttendance />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions/:sessionId/attendance" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <SessionAttendance />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions/:sessionId/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin']}>
                  <EditSession />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions/:sessionId" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <ViewSession />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions/:sessionId/planner" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <SessionPlanner />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/session-templates" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <SessionTemplatesList />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/session-templates/new" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <SessionTemplateEditor />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/session-templates/:templateId" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <SessionTemplateView />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/session-templates/:templateId/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <SessionTemplateEditor />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions/calendar" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach', 'player']}>
                  <SessionsCalendar />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/sessions/:sessionId/pdf" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
                  <SessionPDFExport />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/locations" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin']}>
                  <Locations />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/admin" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin']}>
                  <AdminPanel />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/organisations/:orgId/reports" 
              element={
                <RoleProtectedRoute requiredRoles={['superadmin', 'admin', 'coach']}>
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
            <Route 
              path="/user-role-management/:userId" 
              element={
                <RoleProtectedRoute requiredRoles={['admin', 'superadmin']}>
                  <UserRoleManagement />
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
                <PlayerEditRoute requiredRoles={['coach', 'admin']}>
                  <EditPlayer />
                </PlayerEditRoute>
              } 
            />
            <Route 
              path="/clubs" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin', 'player']}>
                  <Clubs />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/clubs/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin', 'player']}>
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
              path="/sessions/:sessionId/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['admin']}>
                  <EditSession />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sessions/:sessionId" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin', 'player']}>
                  <ViewSession />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sessions/:sessionId/planner" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <SessionPlanner />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/session-templates" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <SessionTemplatesList />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/session-templates/new" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <SessionTemplateEditor />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/session-templates/:templateId" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <SessionTemplateView />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/session-templates/:templateId/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <SessionTemplateEditor />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/sessions/:sessionId/pdf" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <SessionPDFExport />
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
            <Route 
              path="/drills/add" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <AddDrill />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/drills/:id" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin', 'superadmin', 'player']}>
                  <ViewDrill />
                </RoleProtectedRoute>
              } 
            />
            <Route 
              path="/drills/:drillId/edit" 
              element={
                <RoleProtectedRoute requiredRoles={['coach', 'admin']}>
                  <EditDrill />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Organization-scoped Drill Designer - restricted to admin, superadmin, and coach */}
            <Route 
              path="/organisations/:orgId/drill-designer/:drillId?" 
              element={
                <RoleProtectedRoute requiredRoles={['admin', 'superadmin', 'coach']}>
                  <DrillDesigner />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Organization-scoped Drill Designer V2 - restricted to admin, superadmin, and coach */}
            <Route 
              path="/organisations/:orgId/drill-designer-v2/:drillId?" 
              element={
                <RoleProtectedRoute requiredRoles={['admin', 'superadmin', 'coach']}>
                  <DrillDesignerV2 />
                </RoleProtectedRoute>
              } 
            />
            
            {/* Strength & Conditioning Program - available to all authenticated users */}
            <Route 
              path="/strength-conditioning" 
              element={
                <ProtectedRoute>
                  <StrengthConditioning />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/strength-conditioning/phase-1" 
              element={
                <ProtectedRoute>
                  <StrengthConditioningPhase1 />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/strength-conditioning/phase-2" 
              element={
                <ProtectedRoute>
                  <StrengthConditioningPhase2 />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/strength-conditioning/phase-3" 
              element={
                <ProtectedRoute>
                  <StrengthConditioningPhase3 />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/strength-conditioning/phase-4" 
              element={
                <ProtectedRoute>
                  <StrengthConditioningPhase4 />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/strength-conditioning/phase-5" 
              element={
                <ProtectedRoute>
                  <StrengthConditioningPhase5 />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/strength-conditioning/phase-0" 
              element={
                <ProtectedRoute>
                  <StrengthConditioningPhase0 />
                </ProtectedRoute>
              } 
            />
            
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/" element={<RoleBasedRedirect />} />
          </Routes>
        </div>
      </Router>
        </AuthErrorBoundary>
    </AuthProvider>
  )
}

export default App
