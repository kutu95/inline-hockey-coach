import { supabase } from '../lib/supabase'

/**
 * Event Logger - Tracks user activities for superadmin monitoring
 * 
 * Logs:
 * - User authentication (login/logout)
 * - Page navigation/access
 * - Data modifications (create, update, delete)
 * - System events
 */

const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn', 
  ERROR: 'error',
  DEBUG: 'debug'
}

const EVENT_TYPES = {
  AUTH_LOGIN: 'auth_login',
  AUTH_LOGOUT: 'auth_logout',
  PAGE_ACCESS: 'page_access',
  DATA_CREATE: 'data_create',
  DATA_UPDATE: 'data_update',
  DATA_DELETE: 'data_delete',
  SYSTEM_EVENT: 'system_event'
}

class EventLogger {
  constructor() {
    this.currentUser = null
    this.sessionId = null
  }

  // Initialize logger with current user
  initialize(user, sessionId) {
    this.currentUser = user
    this.sessionId = sessionId
  }

  // Core logging method
  async log(eventType, details, level = LOG_LEVELS.INFO) {
    try {
      if (!this.currentUser) {
        console.warn('EventLogger: No current user set, skipping log')
        return
      }

      // Skip logging if we're on the event-logs page to avoid recursive logging
      if (window.location.pathname.includes('/event-logs')) {
        return
      }

      // Enhance details with user email for better identification
      const enhancedDetails = {
        ...(typeof details === 'string' ? { message: details } : details),
        user_email: this.currentUser.email
      }

      const logEntry = {
        user_id: this.currentUser.id,
        session_id: this.sessionId,
        event_type: eventType,
        level: level,
        details: JSON.stringify(enhancedDetails),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ip_address: null, // Could be populated from server-side if needed
        page_url: window.location.href,
        page_title: document.title
      }

      // Insert into database
      const { error } = await supabase
        .from('event_logs')
        .insert([logEntry])

      if (error) {
        console.error('Failed to log event:', error)
      }
    } catch (error) {
      console.error('EventLogger error:', error)
    }
  }

  // Authentication events
  logLogin(details = {}) {
    return this.log(EVENT_TYPES.AUTH_LOGIN, {
      message: 'User logged in',
      ...details
    })
  }

  logLogout(details = {}) {
    return this.log(EVENT_TYPES.AUTH_LOGOUT, {
      message: 'User logged out',
      ...details
    })
  }

  // Page access events
  logPageAccess(pageName, details = {}) {
    return this.log(EVENT_TYPES.PAGE_ACCESS, {
      page: pageName,
      message: `Accessed ${pageName}`,
      ...details
    })
  }

  // Data modification events
  logDataCreate(tableName, recordId, details = {}) {
    return this.log(EVENT_TYPES.DATA_CREATE, {
      table: tableName,
      record_id: recordId,
      message: `Created record in ${tableName}`,
      ...details
    })
  }

  logDataUpdate(tableName, recordId, details = {}) {
    return this.log(EVENT_TYPES.DATA_UPDATE, {
      table: tableName,
      record_id: recordId,
      message: `Updated record in ${tableName}`,
      ...details
    })
  }

  logDataDelete(tableName, recordId, details = {}) {
    return this.log(EVENT_TYPES.DATA_DELETE, {
      table: tableName,
      record_id: recordId,
      message: `Deleted record from ${tableName}`,
      ...details
    })
  }

  // System events
  logSystemEvent(message, details = {}, level = LOG_LEVELS.INFO) {
    return this.log(EVENT_TYPES.SYSTEM_EVENT, {
      message,
      ...details
    }, level)
  }

  // Utility methods
  logError(message, error, details = {}) {
    return this.log(EVENT_TYPES.SYSTEM_EVENT, {
      message,
      error: error?.message || error,
      stack: error?.stack,
      ...details
    }, LOG_LEVELS.ERROR)
  }

  logWarning(message, details = {}) {
    return this.log(EVENT_TYPES.SYSTEM_EVENT, {
      message,
      ...details
    }, LOG_LEVELS.WARN)
  }
}

// Create singleton instance
const eventLogger = new EventLogger()

export default eventLogger
export { LOG_LEVELS, EVENT_TYPES }
