import React, { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { useParams, useNavigate } from 'react-router-dom'
import OrganizationHeader from './OrganizationHeader'

const CreateMatch = () => {
  const { orgId } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [squads, setSquads] = useState([])
  const [sessions, setSessions] = useState([])
  
  // Form state
  const [selectedSession, setSelectedSession] = useState('')
  const [homeSquadId, setHomeSquadId] = useState('')
  const [awaySquadId, setAwaySquadId] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [matchTime, setMatchTime] = useState('')
  const [venue, setVenue] = useState('')
  
  useEffect(() => {
    loadData()
  }, [orgId])
  
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load squads
      let squadsQuery = supabase
        .from('squads')
        .select('*')
        .order('name')
      
      if (orgId && orgId !== 'undefined') {
        squadsQuery = squadsQuery.eq('organization_id', orgId)
      }
      
      const { data: squadsData, error: squadsError } = await squadsQuery
      
      if (squadsError) throw squadsError
      setSquads(squadsData || [])
      
      // Load available sessions (practice sessions without matches)
      let sessionsQuery = supabase
        .from('sessions')
        .select(`
          id,
          title,
          date,
          start_time,
          event_type,
          matches(id)
        `)
        .eq('event_type', 'practice')
        .is('matches.id', null) // Only sessions without existing matches
        .order('date', { ascending: false })
      
      if (orgId && orgId !== 'undefined') {
        sessionsQuery = sessionsQuery.eq('organization_id', orgId)
      }
      
      const { data: sessionsData, error: sessionsError } = await sessionsQuery
      
      if (sessionsError) throw sessionsError
      setSessions(sessionsData || [])
      
      // Set default date to today
      const today = new Date().toISOString().split('T')[0]
      setMatchDate(today)
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!homeSquadId || !awaySquadId || !matchDate || !matchTime) {
      setError('Please fill in all required fields')
      return
    }
    
    if (homeSquadId === awaySquadId) {
      setError('Home and away teams must be different')
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Create the match
      const matchData = {
        home_squad_id: homeSquadId,
        away_squad_id: awaySquadId,
        match_date: matchDate,
        match_time: matchTime,
        venue: venue || null,
        goals_home: 0,
        goals_away: 0
      }
      
      // Only include session_id if a session is selected
      if (selectedSession) {
        matchData.session_id = selectedSession
      }
      
      if (orgId && orgId !== 'undefined') {
        matchData.organization_id = orgId
      }
      
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert(matchData)
        .select()
        .single()
      
      if (matchError) throw matchError
      
      // Update the session to be a game instead of practice (only if a session was selected)
      if (selectedSession) {
        const { error: sessionError } = await supabase
          .from('sessions')
          .update({ event_type: 'game' })
          .eq('id', selectedSession)
        
        if (sessionError) throw sessionError
      }
      
      // Navigate to match management
      if (selectedSession) {
        const navigatePath = orgId 
          ? `/organisations/${orgId}/sessions/${selectedSession}/match`
          : `/sessions/${selectedSession}/match`
        navigate(navigatePath)
      } else {
        // For standalone matches, navigate to the new match management route
        const navigatePath = orgId 
          ? `/organisations/${orgId}/matches/${match.id}/management`
          : `/matches/${match.id}/management`
        navigate(navigatePath)
      }
      
    } catch (error) {
      console.error('Error creating match:', error)
      setError('Failed to create match: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const formatSessionOption = (session) => {
    const date = new Date(session.date).toLocaleDateString()
    const time = session.start_time ? ` at ${session.start_time}` : ''
    return `${session.title} - ${date}${time}`
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OrganizationHeader 
          organizationId={orgId} 
          showBackButton={true} 
          backLinkText="← Back to Dashboard"
          backLinkUrl="/dashboard"
        />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <OrganizationHeader 
        organizationId={orgId} 
        showBackButton={true} 
        backLinkText="← Back to Dashboard"
        backLinkUrl="/dashboard"
      />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Match</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Session Selection */}
            <div>
              <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-2">
                Session <span className="text-gray-500">(Optional)</span>
              </label>
              <select
                id="session"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No session (standalone match)</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {formatSessionOption(session)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select a practice session to convert to a game, or leave blank for a standalone match.
              </p>
            </div>
            
            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="homeSquad" className="block text-sm font-medium text-gray-700 mb-2">
                  Home Team *
                </label>
                <select
                  id="homeSquad"
                  value={homeSquadId}
                  onChange={(e) => setHomeSquadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Select home team...</option>
                  {squads.map(squad => (
                    <option key={squad.id} value={squad.id}>
                      {squad.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="awaySquad" className="block text-sm font-medium text-gray-700 mb-2">
                  Away Team *
                </label>
                <select
                  id="awaySquad"
                  value={awaySquadId}
                  onChange={(e) => setAwaySquadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select away team...</option>
                  {squads.map(squad => (
                    <option key={squad.id} value={squad.id}>
                      {squad.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Match Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="matchDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Match Date *
                </label>
                <input
                  type="date"
                  id="matchDate"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="matchTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Match Time *
                </label>
                <input
                  type="time"
                  id="matchTime"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            
            {/* Venue */}
            <div>
              <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                Venue
              </label>
              <input
                type="text"
                id="venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g., Main Arena, Rink 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !homeSquadId || !awaySquadId || !matchDate || !matchTime}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Match'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateMatch
