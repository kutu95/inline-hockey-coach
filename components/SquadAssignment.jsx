import { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/contexts/AuthContext'

const SquadAssignment = ({ playerId, onUpdate }) => {
  const [squads, setSquads] = useState([])
  const [playerSquads, setPlayerSquads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    fetchSquads()
    fetchPlayerSquads()
  }, [playerId])

  const fetchSquads = async () => {
    try {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .eq('coach_id', user.id)

        .order('name', { ascending: true })

      if (error) throw error
      setSquads(data || [])
    } catch (err) {
      setError('Failed to fetch squads')
      console.error('Error fetching squads:', err)
    }
  }

  const fetchPlayerSquads = async () => {
    try {
      const { data, error } = await supabase
        .from('player_squads')
        .select(`
          squad_id,
          squads (
            id,
            name
          )
        `)
        .eq('player_id', playerId)

      if (error) throw error
      setPlayerSquads(data || [])
    } catch (err) {
      setError('Failed to fetch player squads')
      console.error('Error fetching player squads:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSquad = async (squadId) => {
    const isAssigned = playerSquads.some(ps => ps.squad_id === squadId)

    try {
      if (isAssigned) {
        // Remove from squad
        const { error } = await supabase
          .from('player_squads')
          .delete()
          .eq('player_id', playerId)
          .eq('squad_id', squadId)

        if (error) throw error
      } else {
        // Add to squad
        const { error } = await supabase
          .from('player_squads')
          .insert({
            player_id: playerId,
            squad_id: squadId
          })

        if (error) throw error
      }

      // Refresh player squads
      fetchPlayerSquads()
      if (onUpdate) onUpdate()
    } catch (err) {
      setError(isAssigned ? 'Failed to remove from squad' : 'Failed to add to squad')
      console.error('Error updating squad assignment:', err)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading squads...</div>
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Squad Assignments</h4>
      {squads.length === 0 ? (
        <p className="text-sm text-gray-500">No squads available. Create squads first.</p>
      ) : (
        <div className="space-y-2">
          {squads.map((squad) => {
            const isAssigned = playerSquads.some(ps => ps.squad_id === squad.id)
            return (
              <label key={squad.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={() => handleToggleSquad(squad.id)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{squad.name}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SquadAssignment 