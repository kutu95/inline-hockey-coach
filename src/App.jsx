import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from '../components/Login'
import Dashboard from '../components/Dashboard'
import PlayerList from '../components/PlayerList'
import AddPlayer from '../components/AddPlayer'
import ViewPlayer from '../components/ViewPlayer'
import EditPlayer from '../components/EditPlayer'
import Clubs from '../components/Clubs'
import Squads from '../components/Squads'
import ViewSquad from '../components/ViewSquad'
import Sessions from '../components/Sessions'
import SessionsCalendar from '../components/SessionsCalendar'
import SessionAttendance from '../components/SessionAttendance'
import Drills from '../components/Drills'
import UserAdmin from '../components/UserAdmin'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
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

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }
  
  return user ? <Navigate to="/dashboard" replace /> : children
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
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
