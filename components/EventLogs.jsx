import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const EventLogs = ({ orgId }) => {
  const { user, hasRole } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    eventType: 'all',
    level: 'all',
    userId: 'all',
    dateRange: '7', // days
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  })
  const [playerProfiles, setPlayerProfiles] = useState({})

  // Check if user is superadmin
  useEffect(() => {
    if (user && !hasRole('superadmin')) {
      setError('Access denied. Only superadmins can view event logs.')
      setLoading(false)
    }
  }, [user, hasRole])

  // Fetch player profiles for display
  const fetchPlayerProfiles = async (userIds) => {
    if (userIds.length === 0) return {}
    
    try {
      const { data: players, error } = await supabase
        .from('players')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds)
      
      if (error) {
        console.error('Error fetching player profiles:', error)
        return {}
      }
      
      const profileMap = {}
      players.forEach(player => {
        profileMap[player.user_id] = {
          id: player.user_id,
          name: `${player.first_name} ${player.last_name}`.trim(),
          first_name: player.first_name,
          last_name: player.last_name
        }
      })
      
      return profileMap
    } catch (error) {
      console.error('Error in fetchPlayerProfiles:', error)
      return {}
    }
  }

  // Load event logs
  const loadEventLogs = async () => {
    if (!hasRole('superadmin')) return

    try {
      setLoading(true)
      setError(null)

      // Build query - we'll fetch user data separately for now
      let query = supabase
        .from('event_logs')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters.eventType !== 'all') {
        query = query.eq('event_type', filters.eventType)
      }
      
      if (filters.level !== 'all') {
        query = query.eq('level', filters.level)
      }
      
      if (filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId)
      }

      // Date range filter
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(filters.dateRange))
      query = query.gte('timestamp', startDate.toISOString())
      query = query.lte('timestamp', endDate.toISOString())

      // Search filter
      if (filters.search) {
        query = query.or(`details->message.ilike.%${filters.search}%,page_title.ilike.%${filters.search}%,page_url.ilike.%${filters.search}%`)
      }

      // Pagination and ordering
      const from = (pagination.page - 1) * pagination.limit
      const to = from + pagination.limit - 1
      
      query = query
        .order('timestamp', { ascending: false })
        .range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setLogs(data || [])
      setPagination(prev => ({ ...prev, total: count || 0 }))

      // Fetch player profiles for the logs
      if (data && data.length > 0) {
        const uniqueUserIds = [...new Set(data.map(log => log.user_id).filter(Boolean))]
        const profiles = await fetchPlayerProfiles(uniqueUserIds)
        setPlayerProfiles(profiles)
      }
    } catch (err) {
      console.error('Error loading event logs:', err)
      setError('Failed to load event logs: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load logs when component mounts or filters change
  useEffect(() => {
    loadEventLogs()
  }, [filters, pagination.page])

  // Get unique event types for filter
  const getEventTypes = () => [
    'all', 'auth_login', 'auth_logout', 'page_access', 
    'data_create', 'data_update', 'data_delete', 'system_event'
  ]

  // Get unique log levels for filter
  const getLogLevels = () => ['all', 'info', 'warn', 'error', 'debug']

  // Get unique users for filter
  const getUniqueUsers = () => {
    const users = new Map()
    logs.forEach(log => {
      if (log.user_id) {
        const player = playerProfiles[log.user_id]
        const userEmail = log.details?.user_email
        users.set(log.user_id, {
          id: log.user_id,
          email: userEmail || 'Unknown Email',
          name: player?.name || `User ${log.user_id.substring(0, 8)}`
        })
      }
    })
    return Array.from(users.values())
  }

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-AU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Get level badge color
  const getLevelBadgeColor = (level) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800'
      case 'warn': return 'bg-yellow-100 text-yellow-800'
      case 'info': return 'bg-blue-100 text-blue-800'
      case 'debug': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get event type badge color
  const getEventTypeBadgeColor = (eventType) => {
    switch (eventType) {
      case 'auth_login': return 'bg-green-100 text-green-800'
      case 'auth_logout': return 'bg-orange-100 text-orange-800'
      case 'page_access': return 'bg-purple-100 text-purple-800'
      case 'data_create': return 'bg-blue-100 text-blue-800'
      case 'data_update': return 'bg-yellow-100 text-yellow-800'
      case 'data_delete': return 'bg-red-100 text-red-800'
      case 'system_event': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!hasRole('superadmin')) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Logs</h1>
            <div className="text-center py-12">
              <div className="text-red-600 text-lg mb-4">Access Denied</div>
              <p className="text-gray-500">Only superadmins can view event logs.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src="/Backcheck_small.png"
                  alt="Backcheck Logo"
                  className="h-8 w-auto"
                />
                <h1 className="text-2xl font-bold text-gray-900">Event Logs</h1>
              </div>
              <Link
                to="/dashboard"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {error && (
            <div className="px-6 py-4">
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Event Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {getEventTypes().map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Log Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Log Level
                </label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {getLogLevels().map(level => (
                    <option key={level} value={level}>
                      {level === 'all' ? 'All Levels' : level.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User
                </label>
                <select
                  value={filters.userId}
                  onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Users</option>
                  {getUniqueUsers().map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              {/* Search Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search logs..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading event logs...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No event logs found for the selected filters.</div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Message
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Page
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Page URL
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.user_id ? (
                              <div className="font-medium">
                                {playerProfiles[log.user_id]?.name || `User ${log.user_id.substring(0, 8)}`}
                              </div>
                            ) : (
                              <span className="text-gray-500">System</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeBadgeColor(log.event_type)}`}>
                              {log.event_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(log.level)}`}>
                              {log.level.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={log.details?.message || 'No message'}>
                              {log.details?.message || 'No message'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={log.page_title || 'No page title'}>
                              {log.page_title || 'No page title'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.page_url ? (
                              <a 
                                href={log.page_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline max-w-xs block truncate"
                                title={log.page_url}
                              >
                                {log.page_url}
                              </a>
                            ) : (
                              <span className="text-gray-400">No page URL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page * pagination.limit >= pagination.total}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventLogs
