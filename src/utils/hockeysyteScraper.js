/**
 * HockeySyte Web Scraper Utility
 * Scrapes player data from hockeysyte.com team pages
 */

import { supabase } from '../lib/supabase'

/**
 * Parses player data from pasted HockeySyte team roster text
 * @param {string} rosterText - Plain text roster data from team page
 * @returns {Array} Array of player objects with jersey, name, and type
 */
export function parseHockeySyteTeamHTML(rosterText) {
  try {
    if (!rosterText || typeof rosterText !== 'string') {
      throw new Error('Invalid roster data provided')
    }

    console.log('Parsing HockeySyte team roster...')
    
    const players = parseRosterText(rosterText)
    
    console.log(`Successfully parsed ${players.length} players from roster text`)
    return players
    
  } catch (error) {
    console.error('Error parsing HockeySyte team roster:', error)
    throw error
  }
}

/**
 * Parses roster text in the specific HockeySyte format
 * Format: Name\nJersey · Position
 * Example: "Steven Adams\n3 · Winger"
 */
function parseRosterText(text) {
  const players = []
  
  try {
    // Clean up the text - remove tabs and normalize whitespace
    const cleanedText = text.replace(/\t/g, '').replace(/\n\s*\n/g, '\n\n')
    
    // Use regex to find all player patterns: Name followed by Jersey · Position
    // Pattern: Name (with optional (C) or (A))\nJersey · Position
    // Jersey can be: digits, GK+digits, digits+G, or just digits
    // Use [^\n] to ensure names don't span multiple lines
    const playerPattern = /([A-Za-z ]+(?:\([CA]\))?)\s*\n\s*((?:GK)?\d+(?:G)?)\s*·\s*([A-Za-z]+)/g
    
    let match
    while ((match = playerPattern.exec(cleanedText)) !== null) {
      const nameLine = match[1].trim()
      const jerseyPart = match[2].trim()
      const positionPart = match[3].trim()
      
      // Skip single-word headers like "Goalie", "Skaters", etc.
      const nameWords = nameLine.split(/\s+/)
      if (nameWords.length === 1 && ['goalie', 'skaters', 'forwards', 'defense'].includes(nameLine.toLowerCase())) {
        continue
      }
      
      // Parse name (e.g., "Steven Adams" or "Michael Haynes (C)")
      const nameMatch = nameLine.match(/^([^(]+)(?:\s*\([^)]+\))?$/)
      if (!nameMatch) continue
      
      const fullName = nameMatch[1].trim()
      const nameParts = fullName.split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      // Parse jersey number - handle different goalie formats
      let jerseyNumber
      if (jerseyPart.startsWith('GK')) {
        // Format: GK3 -> extract 3
        const match = jerseyPart.match(/^GK(\d+)$/)
        jerseyNumber = match ? parseInt(match[1]) : null
      } else if (jerseyPart.endsWith('G')) {
        // Format: 1G -> extract 1
        const match = jerseyPart.match(/^(\d+)G$/)
        jerseyNumber = match ? parseInt(match[1]) : null
      } else {
        // Regular format: 3, 10, 19, etc.
        const match = jerseyPart.match(/^(\d+)$/)
        jerseyNumber = match ? parseInt(match[1]) : null
      }
      
      if (jerseyNumber === null) continue
      
      // Determine player type
      let playerType = 'Skater' // Default
      if (positionPart.toLowerCase().includes('goalie')) {
        playerType = 'Goalie'
      } else if (positionPart.toLowerCase().includes('winger') || 
                 positionPart.toLowerCase().includes('skater') ||
                 positionPart.toLowerCase().includes('forward') ||
                 positionPart.toLowerCase().includes('defense')) {
        playerType = 'Skater'
      }
      
      // Skip if we don't have a valid name
      if (!firstName && !lastName) continue
      
      const player = {
        firstName,
        lastName,
        jerseyNumber,
        playerType,
        fullName: `${firstName} ${lastName}`.trim()
      }
      
      players.push(player)
    }
    
    return players
    
  } catch (error) {
    console.error('Error parsing roster text:', error)
    return []
  }
}


/**
 * Imports scraped players into the database
 * @param {Array} players - Array of player objects from scraping
 * @param {string} organizationId - ID of the organization
 * @param {string} squadId - ID of the squad
 * @returns {Promise<Object>} Import results with success/failure counts
 */
export async function importPlayersToDatabase(players, organizationId, squadId) {
  try {
    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      players: []
    }

    // Get or create default club for the organization
    let defaultClubId = null
    
    // First, try to find existing default club
    const { data: existingClub, error: clubSearchError } = await supabase
      .from('clubs')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', 'Default club')
      .single()

    if (clubSearchError && clubSearchError.code !== 'PGRST116') {
      console.error('Error searching for existing default club:', clubSearchError)
      // Continue anyway - we'll try to create a new one
    }

    if (existingClub) {
      defaultClubId = existingClub.id
      console.log('Found existing default club with ID:', defaultClubId)
    } else {
      // Create default club with upsert to handle race conditions
      const clubData = {
        name: 'Default club',
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Try to insert, but handle the case where it might already exist
      const { data: newClub, error: clubInsertError } = await supabase
        .from('clubs')
        .insert(clubData)
        .select()
        .single()

      if (clubInsertError) {
        // If it's a duplicate key error, try to find the existing club again
        if (clubInsertError.code === '23505') { // Unique violation
          console.log('Default club already exists, searching for it...')
          const { data: foundClub, error: findError } = await supabase
            .from('clubs')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('name', 'Default club')
            .single()
          
          if (findError) {
            console.error('Error finding existing default club after duplicate error:', findError)
            throw clubInsertError // Throw original error
          }
          
          defaultClubId = foundClub.id
          console.log('Found existing default club after duplicate error with ID:', defaultClubId)
        } else {
          console.error('Error creating default club:', clubInsertError)
          throw clubInsertError
        }
      } else {
        defaultClubId = newClub.id
        console.log('Created default club with ID:', defaultClubId)
      }
    }

    for (const player of players) {
      try {
        // Check if player already exists in this organization
        const { data: existingPlayer, error: searchError } = await supabase
          .from('players')
          .select('id, first_name, last_name')
          .eq('first_name', player.firstName)
          .eq('last_name', player.lastName)
          .eq('organization_id', organizationId) // Using organization_id as organization reference
          .single()

        if (searchError && searchError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new players
          throw searchError
        }

        let playerId

        if (existingPlayer) {
          // Player exists, update if needed
          const { data: updatedPlayer, error: updateError } = await supabase
            .from('players')
            .update({
              jersey_number: player.jerseyNumber,
              hand: player.playerType === 'Goalie' ? null : 'right', // Default to right-handed for skaters
              club_id: defaultClubId, // Ensure they're assigned to default club
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPlayer.id)
            .select()
            .single()

          if (updateError) throw updateError

          playerId = updatedPlayer.id
          results.updated++
        } else {
          // Create new player
          const { data: newPlayer, error: insertError } = await supabase
            .from('players')
            .insert({
              first_name: player.firstName,
              last_name: player.lastName,
              jersey_number: player.jerseyNumber,
              hand: player.playerType === 'Goalie' ? null : 'right', // Default to right-handed for skaters
              club_id: defaultClubId, // Assign to default club
              organization_id: organizationId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (insertError) throw insertError

          playerId = newPlayer.id
          results.imported++
        }

        // Check if player is already in this squad
        const { data: existingSquadMember, error: squadSearchError } = await supabase
          .from('player_squads')
          .select('id')
          .eq('player_id', playerId)
          .eq('squad_id', squadId)
          .single()

        if (squadSearchError && squadSearchError.code !== 'PGRST116') {
          throw squadSearchError
        }

        if (!existingSquadMember) {
          // Add player to squad
          const { error: squadInsertError } = await supabase
            .from('player_squads')
            .insert({
              player_id: playerId,
              squad_id: squadId,
              created_at: new Date().toISOString()
            })

          if (squadInsertError) throw squadInsertError
        } else {
          results.skipped++
        }

        results.players.push({
          id: playerId,
          name: `${player.firstName} ${player.lastName}`,
          jersey: player.jerseyNumber,
          type: player.playerType,
          status: existingPlayer ? 'updated' : 'imported'
        })

      } catch (playerError) {
        console.error(`Error processing player ${player.firstName} ${player.lastName}:`, playerError)
        results.errors.push({
          player: `${player.firstName} ${player.lastName}`,
          error: playerError.message
        })
      }
    }

    return results
  } catch (error) {
    console.error('Error importing players:', error)
    throw error
  }
}

/**
 * Validates scraped player data
 * @param {Array} players - Array of player objects
 * @returns {Object} Validation results
 */
export function validatePlayerData(players) {
  const errors = []
  const warnings = []

  if (!players || !Array.isArray(players)) {
    errors.push('Invalid player data format')
    return { isValid: false, errors, warnings }
  }

  if (players.length === 0) {
    errors.push('No players found on the team page')
    return { isValid: false, errors, warnings }
  }

  players.forEach((player, index) => {
    if (!player.firstName || !player.lastName) {
      errors.push(`Player at index ${index} is missing name information`)
    }

    if (!player.jerseyNumber) {
      warnings.push(`Player ${player.firstName} ${player.lastName} is missing jersey number`)
    }

    if (!player.playerType) {
      warnings.push(`Player ${player.firstName} ${player.lastName} is missing player type`)
    }

    // Validate jersey number format
    if (player.jerseyNumber && (isNaN(player.jerseyNumber) || player.jerseyNumber < 0)) {
      warnings.push(`Player ${player.firstName} ${player.lastName} has invalid jersey number: ${player.jerseyNumber}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
