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
            <Route 
              path="/players" 
              element={
                <ProtectedRoute>
                  <PlayerList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/players/add" 
              element={
                <ProtectedRoute>
                  <AddPlayer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/players/:id" 
              element={
                <ProtectedRoute>
                  <ViewPlayer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/players/:id/edit" 
              element={
                <ProtectedRoute>
                  <EditPlayer />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clubs" 
              element={
                <ProtectedRoute>
                  <Clubs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/squads" 
              element={
                <ProtectedRoute>
                  <Squads />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/squads/:id" 
              element={
                <ProtectedRoute>
                  <ViewSquad />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sessions" 
              element={
                <ProtectedRoute>
                  <Sessions />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sessions/calendar" 
              element={
                <ProtectedRoute>
                  <SessionsCalendar />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/sessions/:sessionId/attendance" 
              element={
                <ProtectedRoute>
                  <SessionAttendance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/drills" 
              element={
                <ProtectedRoute>
                  <Drills />
                </ProtectedRoute>
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
