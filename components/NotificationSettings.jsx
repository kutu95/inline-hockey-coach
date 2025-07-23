import { useState, useEffect } from 'react'
import { useAuth } from '../src/contexts/AuthContext'
import { 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  getSubscriptionStatus,
  isPushNotificationSupported 
} from '../src/lib/pushNotifications'

const NotificationSettings = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState({
    supported: false,
    permission: 'default',
    subscribed: false
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      checkNotificationStatus()
    }
  }, [user])

  const checkNotificationStatus = async () => {
    try {
      setLoading(true)
      const status = await getSubscriptionStatus()
      setStatus(status)
    } catch (error) {
      console.error('Error checking notification status:', error)
      setError('Failed to check notification status')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!user) return

    try {
      setUpdating(true)
      setError('')
      setSuccess('')

      await subscribeToPushNotifications(user.id)
      setSuccess('Push notifications enabled successfully!')
      await checkNotificationStatus()
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      setError(error.message || 'Failed to enable push notifications')
    } finally {
      setUpdating(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!user) return

    try {
      setUpdating(true)
      setError('')
      setSuccess('')

      await unsubscribeFromPushNotifications(user.id)
      setSuccess('Push notifications disabled successfully!')
      await checkNotificationStatus()
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error)
      setError(error.message || 'Failed to disable push notifications')
    } finally {
      setUpdating(false)
    }
  }

  const handlePermissionRequest = async () => {
    try {
      setUpdating(true)
      setError('')
      setSuccess('')

      // This will trigger the browser's permission request
      await subscribeToPushNotifications(user.id)
      setSuccess('Permission granted! Push notifications are now enabled.')
      await checkNotificationStatus()
    } catch (error) {
      console.error('Error requesting permission:', error)
      setError(error.message || 'Failed to request notification permission')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!isPushNotificationSupported()) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Push Notifications
              </h2>
              <p className="text-gray-600 mb-4">
                Push notifications are not supported in your browser.
              </p>
              <p className="text-sm text-gray-500">
                To receive notifications when someone accepts an invitation, 
                please use a modern browser that supports push notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Push Notifications
            </h2>
                         <p className="text-gray-600">
               Get notified when new players join your organization (Admin only)
             </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-800">{success}</div>
            </div>
          )}

          <div className="space-y-4">
            {/* Permission Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Permission Status</h3>
                <p className="text-sm text-gray-600">
                  {status.permission === 'granted' && 'Notifications allowed'}
                  {status.permission === 'denied' && 'Notifications blocked'}
                  {status.permission === 'default' && 'Permission not requested'}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                status.permission === 'granted' ? 'bg-green-100 text-green-800' :
                status.permission === 'denied' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {status.permission}
              </div>
            </div>

            {/* Subscription Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Subscription Status</h3>
                <p className="text-sm text-gray-600">
                  {status.subscribed ? 'Subscribed to push notifications' : 'Not subscribed'}
                </p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                status.subscribed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {status.subscribed ? 'Active' : 'Inactive'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {status.permission === 'default' && (
                <button
                  onClick={handlePermissionRequest}
                  disabled={updating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  {updating ? 'Requesting...' : 'Enable Push Notifications'}
                </button>
              )}

              {status.permission === 'granted' && !status.subscribed && (
                <button
                  onClick={handleSubscribe}
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  {updating ? 'Subscribing...' : 'Subscribe to Notifications'}
                </button>
              )}

              {status.subscribed && (
                <button
                  onClick={handleUnsubscribe}
                  disabled={updating}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  {updating ? 'Unsubscribing...' : 'Unsubscribe from Notifications'}
                </button>
              )}

              {status.permission === 'denied' && (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">
                    Notifications are blocked. To enable them:
                  </p>
                  <ol className="text-xs text-yellow-700 text-left space-y-1">
                    <li>1. Click the lock/info icon in your browser's address bar</li>
                    <li>2. Change "Notifications" to "Allow"</li>
                    <li>3. Refresh this page</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
                             <ul className="text-sm text-blue-800 space-y-1">
                 <li>• All admins in your organization will be notified when new players join</li>
                 <li>• Notifications work even when the app is closed</li>
                 <li>• Click on notifications to open the app</li>
                 <li>• You can disable notifications anytime</li>
               </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings 