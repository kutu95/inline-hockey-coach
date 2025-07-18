import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'
import OrganizationHeader from './OrganizationHeader'

const Squads = () => {
  const [squads, setSquads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newSquadName, setNewSquadName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const { user } = useAuth()
  const params = useParams()
  const orgId = params.orgId // Get organization ID from route params

  useEffect(() => {
    fetchSquads()
  }, [])

  const fetchSquads = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('squads')
        .select('*')
        .order('is_active', { ascending: false }) // Active squads first
        .order('name', { ascending: true })

      // If we're in an organization context, filter by organization_id
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, filter by coach_id (single tenant)
        query = query.eq('coach_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      setSquads(data || [])
    } catch (err) {
      setError('Failed to fetch squads')
      console.error('Error fetching squads:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSquad = async (e) => {
    e.preventDefault()
    if (!newSquadName.trim()) return

    try {
      setIsAdding(true)
      const squadData = {
        name: newSquadName.trim()
      }

      // If we're in an organization context, set organization_id
      if (orgId) {
        squadData.organization_id = orgId
      } else {
        // Otherwise, set coach_id (single tenant)
        squadData.coach_id = user.id
      }

      const { error } = await supabase
        .from('squads')
        .insert(squadData)

      if (error) throw error
      
      setNewSquadName('')
      fetchSquads()
    } catch (err) {
      setError('Failed to add squad')
      console.error('Error adding squad:', err)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteSquad = async (squadId) => {
    if (!confirm('Are you sure you want to delete this squad? This will remove all player assignments to this squad.')) return

    try {
      let query = supabase
        .from('squads')
        .delete()
        .eq('id', squadId)

      // If we're in an organization context, ensure the squad belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the squad belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      fetchSquads()
    } catch (err) {
      setError('Failed to delete squad')
      console.error('Error deleting squad:', err)
    }
  }

  const handleEditSquad = async (squadId, newName) => {
    if (!newName.trim()) return

    try {
      let query = supabase
        .from('squads')
        .update({ name: newName.trim() })
        .eq('id', squadId)

      // If we're in an organization context, ensure the squad belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the squad belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      fetchSquads()
    } catch (err) {
      setError('Failed to update squad')
      console.error('Error updating squad:', err)
    }
  }

  const handleToggleActiveStatus = async (squadId, currentStatus) => {
    try {
      let query = supabase
        .from('squads')
        .update({ is_active: !currentStatus })
        .eq('id', squadId)

      // If we're in an organization context, ensure the squad belongs to the organization
      if (orgId) {
        query = query.eq('organization_id', orgId)
      } else {
        // Otherwise, ensure the squad belongs to the coach
        query = query.eq('coach_id', user.id)
      }

      const { error } = await query

      if (error) throw error
      
      fetchSquads()
    } catch (err) {
      setError('Failed to update squad status')
      console.error('Error updating squad status:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              {orgId ? (
                <OrganizationHeader title="Squads" />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      ← Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">Squads</h1>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="px-6 py-4">
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              {/* Add Squad Form */}
              <form onSubmit={handleAddSquad} className="mb-6">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newSquadName}
                    onChange={(e) => setNewSquadName(e.target.value)}
                    placeholder="Enter squad name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isAdding}
                  />
                  <button
                    type="submit"
                    disabled={!newSquadName.trim() || isAdding}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    {isAdding ? 'Adding...' : 'Add Squad'}
                  </button>
                </div>
              </form>

              {/* Squads List */}
              {squads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-4">No squads found</div>
                  <p className="text-gray-400">Create your first squad to start organizing players</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {squads.map((squad) => (
                    <SquadItem
                      key={squad.id}
                      squad={squad}
                      orgId={orgId}
                      onDelete={handleDeleteSquad}
                      onEdit={handleEditSquad}
                      onToggleActive={handleToggleActiveStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SquadItem = ({ squad, orgId, onDelete, onEdit, onToggleActive }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(squad.name)

  const handleSave = () => {
    if (editName.trim() && editName !== squad.name) {
      onEdit(squad.id, editName)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditName(squad.name)
    setIsEditing(false)
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${
      squad.is_active ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to={orgId ? `/organisations/${orgId}/squads/${squad.id}` : `/squads/${squad.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors duration-150"
                  >
                    {squad.name}
                  </Link>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    squad.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {squad.is_active ? 'Active' : 'Inactive'}
                  </span>
                </>
              )}
            </div>
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <button
                onClick={() => onToggleActive(squad.id, squad.is_active)}
                className={`text-sm font-medium ${
                  squad.is_active 
                    ? 'text-orange-600 hover:text-orange-800' 
                    : 'text-green-600 hover:text-green-800'
                }`}
                title={squad.is_active ? 'Deactivate Squad' : 'Activate Squad'}
              >
                {squad.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <Link
                to={orgId ? `/organisations/${orgId}/squads/${squad.id}` : `/squads/${squad.id}`}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View Players
              </Link>
              <button
                onClick={() => setIsEditing(true)}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(squad.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Squads 