import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import eventLogger from '../utils/eventLogger'

/**
 * Custom hook for integrating event logging into React components
 * Automatically initializes the logger with current user and session
 */
export const useEventLogger = () => {
  const { user } = useAuth()

  // Initialize logger when user changes
  useEffect(() => {
    if (user) {
      // Generate a session ID for this browser session
      const sessionId = sessionStorage.getItem('sessionId') || 
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      if (!sessionStorage.getItem('sessionId')) {
        sessionStorage.setItem('sessionId', sessionId)
      }

      eventLogger.initialize(user, sessionId)
      
      // Log login event
      eventLogger.logLogin({
        user_email: user.email,
        login_time: new Date().toISOString()
      })
    } else {
      // Log logout event if user was previously logged in
      if (eventLogger.currentUser) {
        eventLogger.logLogout({
          logout_time: new Date().toISOString()
        })
      }
      eventLogger.initialize(null, null)
    }
  }, [user])

  return eventLogger
}

/**
 * Hook for logging page access
 * Call this in page components to automatically log page visits
 */
export const usePageLogger = (pageName) => {
  const { user } = useAuth()

  useEffect(() => {
    if (user && pageName) {
      // Skip logging page access for event-logs page
      if (!window.location.pathname.includes('/event-logs')) {
        eventLogger.logPageAccess(pageName, {
          page_url: window.location.href,
          page_title: document.title,
          referrer: document.referrer || null
        })
      }
    }
  }, [user, pageName])
}

/**
 * Hook for logging data operations
 * Provides helper functions for logging CRUD operations
 */
export const useDataLogger = () => {
  const logCreate = (tableName, recordId, details = {}) => {
    eventLogger.logDataCreate(tableName, recordId, details)
  }

  const logUpdate = (tableName, recordId, details = {}) => {
    eventLogger.logDataUpdate(tableName, recordId, details)
  }

  const logDelete = (tableName, recordId, details = {}) => {
    eventLogger.logDataDelete(tableName, recordId, details)
  }

  return {
    logCreate,
    logUpdate,
    logDelete
  }
}
