import { useAuth } from '../src/contexts/AuthContext'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const { user, signOut, userRoles, hasRole } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'coach':
        return 'bg-blue-100 text-blue-800'
      case 'player':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <img 
                  src="/logo-192x192.png" 
                  alt="Inline Hockey Coach Logo" 
                  className="h-12 w-12 object-contain"
                />
                <h1 className="text-3xl font-bold text-gray-900">
                  WA Inline Hockey Coaching Dashboard
                </h1>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Sign Out
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome back!
              </h2>
              <p className="text-gray-600 mb-2">
                You are signed in as: <span className="font-medium">{user?.email}</span>
              </p>
              {userRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-sm text-gray-600">Roles:</span>
                  {userRoles.map(role => (
                    <span
                      key={role}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Admin-only section */}
              {hasRole('admin') && (
                <Link
                  to="/admin/users"
                  className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors duration-200"
                >
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    User Administration
                  </h3>
                  <p className="text-red-700">
                    Manage user roles and access permissions
                  </p>
                </Link>
              )}

              {/* Coach and Admin access */}
              {(hasRole('coach') || hasRole('admin')) && (
                <>
                  <Link
                    to="/players"
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Players
                    </h3>
                    <p className="text-blue-700">
                      Manage your team roster and player information
                    </p>
                  </Link>
                  
                  <Link
                    to="/clubs"
                    className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-orange-900 mb-2">
                      Clubs
                    </h3>
                    <p className="text-orange-700">
                      Manage clubs and assign players to clubs
                    </p>
                  </Link>
                  
                  <Link
                    to="/squads"
                    className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Squads
                    </h3>
                    <p className="text-green-700">
                      Create and manage training squads
                    </p>
                  </Link>
                  
                  <Link
                    to="/sessions"
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      Sessions
                    </h3>
                    <p className="text-purple-700">
                      Schedule and track practice sessions
                    </p>
                  </Link>
                  
                  <Link
                    to="/drills"
                    className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      Drills
                    </h3>
                    <p className="text-indigo-700">
                      Create and manage practice drills
                    </p>
                  </Link>
                </>
              )}

              {/* Player access */}
              {hasRole('player') && (
                <>
                  <Link
                    to="/sessions"
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      Sessions
                    </h3>
                    <p className="text-purple-700">
                      View scheduled practice sessions
                    </p>
                  </Link>
                  
                  <Link
                    to="/drills"
                    className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors duration-200"
                  >
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                      Drills
                    </h3>
                    <p className="text-indigo-700">
                      View practice drills and exercises
                    </p>
                  </Link>
                </>
              )}

              {/* No roles assigned */}
              {userRoles.length === 0 && (
                <div className="col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    No Roles Assigned
                  </h3>
                  <p className="text-yellow-700">
                    Your account has not been assigned any roles yet. Please contact an administrator to get access to the system features.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard