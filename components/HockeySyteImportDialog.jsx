import React, { useState, useEffect } from 'react'
import { supabase } from '../src/lib/supabase'
import { parseHockeySyteTeamHTML, importPlayersToDatabase, validatePlayerData } from '../src/utils/hockeysyteScraper'

const HockeySyteImportDialog = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1) // 1: HTML input, 2: Preview, 3: Organization/Squad selection, 4: Import results
  const [teamHtml, setTeamHtml] = useState('')
  const [scrapedPlayers, setScrapedPlayers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [squads, setSquads] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedSquadId, setSelectedSquadId] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [newSquadName, setNewSquadName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importResults, setImportResults] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadOrganizations()
      resetDialog()
    }
  }, [isOpen])

  const resetDialog = () => {
    setStep(1)
    setTeamHtml('')
    setScrapedPlayers([])
    setSelectedOrgId('')
    setSelectedSquadId('')
    setNewOrgName('')
    setNewSquadName('')
    setError('')
    setImportResults(null)
  }

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name')

      if (error) throw error
      setOrganizations(data || [])
    } catch (err) {
      console.error('Error loading organizations:', err)
      setError('Failed to load organizations')
    }
  }

  const loadSquads = async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('squads')
        .select('id, name')
        .eq('organization_id', orgId)
        .order('name')

      if (error) throw error
      setSquads(data || [])
    } catch (err) {
      console.error('Error loading squads:', err)
      setError('Failed to load squads')
    }
  }

  const handleParseHTML = async () => {
    if (!teamHtml.trim()) {
      setError('Please paste the team page HTML')
      return
    }

    setLoading(true)
    setError('')

    try {
      const players = parseHockeySyteTeamHTML(teamHtml)
      const validation = validatePlayerData(players)

      if (!validation.isValid) {
        setError(`Validation failed: ${validation.errors.join(', ')}`)
        return
      }

      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings)
      }

      setScrapedPlayers(players)
      setStep(2)
    } catch (err) {
      console.error('Error parsing HTML:', err)
      setError(err.message || 'Failed to parse team page HTML')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      setError('Please enter organization name')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setSelectedOrgId(data.id)
      await loadOrganizations()
      setNewOrgName('')
    } catch (err) {
      console.error('Error creating organization:', err)
      setError('Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSquad = async () => {
    if (!newSquadName.trim() || !selectedOrgId) {
      setError('Please enter squad name and select organization')
      return
    }

    setLoading(true)
    try {
      // Get current user for coach_id (in case migration hasn't been applied)
      const { data: { user } } = await supabase.auth.getUser()
      
      // Try to create squad with minimal required fields
      const squadData = {
        name: newSquadName.trim(),
        organization_id: selectedOrgId
      }
      
      // Add coach_id if user exists (for backward compatibility)
      if (user) {
        squadData.coach_id = user.id
      }
      
      // Add is_active if the column exists
      try {
        squadData.is_active = true
      } catch (e) {
        // Column doesn't exist, skip it
      }

      const { data, error } = await supabase
        .from('squads')
        .insert(squadData)
        .select()
        .single()

      if (error) throw error

      setSelectedSquadId(data.id)
      await loadSquads(selectedOrgId)
      setNewSquadName('')
    } catch (err) {
      console.error('Error creating squad:', err)
      console.error('Squad data attempted:', squadData)
      setError(`Failed to create squad: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImportPlayers = async () => {
    if (!selectedOrgId || !selectedSquadId) {
      setError('Please select organization and squad')
      return
    }

    setLoading(true)
    setError('')

    try {
      const results = await importPlayersToDatabase(scrapedPlayers, selectedOrgId, selectedSquadId)
      setImportResults(results)
      setStep(4)
    } catch (err) {
      console.error('Error importing players:', err)
      setError(err.message || 'Failed to import players')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetDialog()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Import Players from HockeySyte
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: URL Input */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Roster Data
                </label>
                <textarea
                  value={teamHtml}
                  onChange={(e) => setTeamHtml(e.target.value)}
                  placeholder="Paste the roster table data here..."
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <div className="mt-2 text-xs text-gray-600">
                  <p><strong>Instructions:</strong></p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to the team page on <code>ilha.hockeysyte.com/team/*</code></li>
                    <li>Find the roster/player list section</li>
                    <li>Copy just the player names and jersey numbers (not the whole page)</li>
                    <li>Paste the data in the format shown in the example below</li>
                  </ol>
                  
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <p><strong>Example format:</strong></p>
                    <pre className="whitespace-pre-wrap text-gray-700">
{`Steven Adams
3 · Winger

Caio Freire
8 · Winger

Sean Takiari
1GK · Goalie`}
                    </pre>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleParseHTML}
                  disabled={loading || !teamHtml.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Parsing...' : 'Parse Players'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview Players */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Preview Players ({scrapedPlayers.length} found)
                </h3>
                <button
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Back to URL
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2 mb-2">
                  <div>Jersey</div>
                  <div>First Name</div>
                  <div>Last Name</div>
                  <div>Type</div>
                </div>
                {scrapedPlayers.map((player, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 text-sm py-1 border-b border-gray-200">
                    <div>{player.jerseyNumber || 'N/A'}</div>
                    <div>{player.firstName}</div>
                    <div>{player.lastName}</div>
                    <div className="capitalize">{player.playerType}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continue to Import
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Organization/Squad Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Select Organization & Squad
                </h3>
                <button
                  onClick={() => setStep(2)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Back to Preview
                </button>
              </div>

              {/* Organization Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Organization
                </label>
                <div className="flex space-x-3">
                  <select
                    value={selectedOrgId}
                    onChange={(e) => {
                      setSelectedOrgId(e.target.value)
                      setSelectedSquadId('')
                      if (e.target.value) loadSquads(e.target.value)
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an organization...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateOrganization}
                    disabled={loading}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    New
                  </button>
                </div>
                {!selectedOrgId && (
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Enter new organization name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>

              {/* Squad Selection */}
              {selectedOrgId && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Squad
                  </label>
                  <div className="flex space-x-3">
                    <select
                      value={selectedSquadId}
                      onChange={(e) => setSelectedSquadId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a squad...</option>
                      {squads.map((squad) => (
                        <option key={squad.id} value={squad.id}>
                          {squad.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleCreateSquad}
                      disabled={loading}
                      className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      New
                    </button>
                  </div>
                  {!selectedSquadId && (
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newSquadName}
                        onChange={(e) => setNewSquadName(e.target.value)}
                        placeholder="Enter new squad name"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportPlayers}
                  disabled={loading || !selectedOrgId || !selectedSquadId}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import Players'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Import Results */}
          {step === 4 && importResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Import Results
                </h3>
                <button
                  onClick={() => setStep(3)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← Back to Selection
                </button>
              </div>

              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Import Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>✅ Imported: {importResults.imported}</div>
                  <div>🔄 Updated: {importResults.updated}</div>
                  <div>⏭️ Skipped: {importResults.skipped}</div>
                  <div>❌ Errors: {importResults.errors.length}</div>
                </div>
              </div>

              {/* Player Details */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="font-medium text-gray-800 mb-2">Player Details</h4>
                <div className="space-y-2">
                  {importResults.players.map((player, index) => (
                    <div key={index} className="flex justify-between items-center text-sm py-1 border-b border-gray-200">
                      <span>{player.name} (#{player.jersey}) - {player.type}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        player.status === 'imported' ? 'bg-green-100 text-green-800' :
                        player.status === 'updated' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {player.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Errors */}
              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Errors</h4>
                  <div className="space-y-1 text-sm">
                    {importResults.errors.map((error, index) => (
                      <div key={index} className="text-red-700">
                        {error.player}: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HockeySyteImportDialog
