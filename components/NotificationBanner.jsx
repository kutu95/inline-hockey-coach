import { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const NotificationBanner = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchRecentNotifications()
    }
  }, [user])

  const fetchRecentNotifications = async () => {
    try {
      setLoading(true)
      
      // Get notifications from the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          accepted_at,
          players (
            first_name,
            last_name,
            organization_id
          )
        `)
        .gte('accepted_at', yesterday)
        .not('accepted_at', 'is', null)
        .order('accepted_at', { ascending: false })

      if (error) {
        console.error('Error fetching notifications:', error)
        return
      }

      // Filter notifications for the current user's organization
      const userNotifications = data?.filter(invitation => {
        // For now, show all notifications - you can filter by organization later
        return true
      }) || []

      setNotifications(userNotifications)
    } catch (err) {
      console.error('Error in fetchRecentNotifications:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || notifications.length === 0) {
    return null
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">
            Recent Activity
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            {notifications.slice(0, 3).map((notification, index) => (
              <div key={notification.id} className="mb-1">
                <span className="font-medium">
                  {notification.players?.first_name} {notification.players?.last_name}
                </span>
                {' '}joined your organization
                <span className="text-blue-600 ml-1">
                  {new Date(notification.accepted_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            ))}
            {notifications.length > 3 && (
              <div className="text-blue-600 text-xs mt-1">
                +{notifications.length - 3} more recent activities
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationBanner 