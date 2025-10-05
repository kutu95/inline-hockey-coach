import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url || !url.includes('ilha.hockeysyte.com/team/')) {
      return new Response(
        JSON.stringify({ error: 'Invalid team URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Scraping URL:', url)

    // Fetch the team page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch team page: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    const players = parseTeamPage(html)

    return new Response(
      JSON.stringify({ 
        success: true, 
        players,
        count: players.length 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error scraping HockeySyte:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to scrape team page' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Parses the HTML content of a HockeySyte team page to extract player information
 */
function parseTeamPage(html: string): Array<{
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
}> {
  const players: Array<{
    jerseyNumber: number | null;
    firstName: string;
    lastName: string;
    playerType: string;
    fullName: string;
  }> = []

  try {
    // Try to find player data in JSON format (common in modern web apps)
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/)
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1])
        const teamData = extractPlayersFromJson(data)
        if (teamData.length > 0) {
          return teamData
        }
      } catch (e) {
        console.warn('Failed to parse JSON data:', e)
      }
    }

    // Try to find player data in script tags
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs)
    if (scriptMatches) {
      for (const script of scriptMatches) {
        try {
          const playerData = extractPlayersFromScript(script)
          if (playerData.length > 0) {
            players.push(...playerData)
          }
        } catch (e) {
          // Continue with other methods
        }
      }
    }

    // If JSON/script parsing didn't work, try HTML parsing
    if (players.length === 0) {
      const htmlPlayers = parsePlayersFromHTML(html)
      players.push(...htmlPlayers)
    }

    // Filter out staff members and clean up data
    return players.filter(player => {
      const staffKeywords = ['coach', 'manager', 'trainer', 'staff', 'head coach', 'assistant coach']
      const playerType = player.playerType?.toLowerCase() || ''
      const firstName = player.firstName?.toLowerCase() || ''
      const lastName = player.lastName?.toLowerCase() || ''
      
      return !staffKeywords.some(keyword => 
        playerType.includes(keyword) || 
        firstName.includes(keyword) ||
        lastName.includes(keyword)
      )
    })

  } catch (error) {
    console.error('Error parsing team page:', error)
    return []
  }
}

/**
 * Extracts player data from JSON initial state
 */
function extractPlayersFromJson(data: any): Array<{
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
}> {
  const players: Array<{
    jerseyNumber: number | null;
    firstName: string;
    lastName: string;
    playerType: string;
    fullName: string;
  }> = []
  
  const findPlayers = (obj: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        findPlayers(item, `${path}[${index}]`)
      })
    } else {
      Object.keys(obj).forEach(key => {
        const value = obj[key]
        
        if (value && typeof value === 'object') {
          if (value.firstName || value.lastName || value.name || value.jersey) {
            const player = extractPlayerFromObject(value)
            if (player) players.push(player)
          }
        }
        
        findPlayers(value, `${path}.${key}`)
      })
    }
  }
  
  findPlayers(data)
  return players
}

/**
 * Extracts player data from script content
 */
function extractPlayersFromScript(script: string): Array<{
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
}> {
  const players: Array<{
    jerseyNumber: number | null;
    firstName: string;
    lastName: string;
    playerType: string;
    fullName: string;
  }> = []
  
  const patterns = [
    /players:\s*\[(.*?)\]/is,
    /teamPlayers:\s*\[(.*?)\]/is,
    /roster:\s*\[(.*?)\]/is,
    /"players":\s*\[(.*?)\]/is
  ]
  
  for (const pattern of patterns) {
    const match = script.match(pattern)
    if (match) {
      try {
        const playerArrayText = `[${match[1]}]`
        const playerArray = JSON.parse(playerArrayText)
        
        if (Array.isArray(playerArray)) {
          playerArray.forEach(playerData => {
            const player = extractPlayerFromObject(playerData)
            if (player) players.push(player)
          })
        }
      } catch (e) {
        // If JSON parsing fails, try to extract individual player data
        const playerMatches = match[1].match(/\{[^}]*\}/g)
        if (playerMatches) {
          playerMatches.forEach(playerText => {
            try {
              const playerData = JSON.parse(`{${playerText}}`)
              const player = extractPlayerFromObject(playerData)
              if (player) players.push(player)
            } catch (e) {
              // Skip invalid player data
            }
          })
        }
      }
    }
  }
  
  return players
}

/**
 * Extracts player data from HTML content using regex patterns
 */
function parsePlayersFromHTML(html: string): Array<{
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
}> {
  const players: Array<{
    jerseyNumber: number | null;
    firstName: string;
    lastName: string;
    playerType: string;
    fullName: string;
  }> = []
  
  const patterns = [
    {
      regex: /<tr[^>]*>.*?<\/tr>/gs,
      extractor: extractPlayerFromTableRow
    },
    {
      regex: /<li[^>]*class="[^"]*player[^"]*"[^>]*>.*?<\/li>/gs,
      extractor: extractPlayerFromListItem
    },
    {
      regex: /<div[^>]*class="[^"]*player[^"]*"[^>]*>.*?<\/div>/gs,
      extractor: extractPlayerFromDiv
    }
  ]
  
  for (const { regex, extractor } of patterns) {
    const matches = html.match(regex) || []
    
    for (const match of matches) {
      const player = extractor(match)
      if (player && player.firstName && player.lastName) {
        players.push(player)
      }
    }
    
    if (players.length > 0) break
  }
  
  return players
}

/**
 * Extracts player information from a JSON object
 */
function extractPlayerFromObject(obj: any): {
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
} | null {
  if (!obj || typeof obj !== 'object') return null
  
  const firstName = obj.firstName || obj.first_name || obj.fname || obj.first || ''
  const lastName = obj.lastName || obj.last_name || obj.lname || obj.last || ''
  const jersey = obj.jersey || obj.jerseyNumber || obj.number || obj.jersey_number || null
  const position = obj.position || obj.playerType || obj.type || obj.player_type || 'Skater'
  
  if (!firstName && !lastName) return null
  
  let finalFirstName = firstName
  let finalLastName = lastName
  
  if (!firstName && !lastName && obj.name) {
    const nameParts = obj.name.split(/\s+/)
    finalFirstName = nameParts[0] || ''
    finalLastName = nameParts.slice(1).join(' ') || ''
  }
  
  return {
    firstName: finalFirstName.trim(),
    lastName: finalLastName.trim(),
    jerseyNumber: jersey ? parseInt(jersey) : null,
    playerType: position.toLowerCase().includes('goal') ? 'Goalie' : 'Skater',
    fullName: `${finalFirstName} ${finalLastName}`.trim()
  }
}

/**
 * Extracts player information from a table row HTML
 */
function extractPlayerFromTableRow(rowHtml: string): {
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
} | null {
  const cells = rowHtml.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs) || []
  
  if (cells.length < 2) return null
  
  const data = cells.map(cell => {
    return cell.replace(/<[^>]*>/g, '').trim()
  })
  
  let jerseyNumber = null
  let firstName = ''
  let lastName = ''
  let playerType = 'Skater'
  
  for (let i = 0; i < data.length; i++) {
    const cell = data[i]
    if (/^\d+$/.test(cell)) {
      jerseyNumber = parseInt(cell)
      break
    }
  }
  
  for (let i = 0; i < data.length; i++) {
    const cell = data[i]
    if (cell.length > 3 && !/^\d+$/.test(cell) && !cell.toLowerCase().includes('coach')) {
      const nameParts = cell.split(/\s+/)
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
      break
    }
  }
  
  for (let i = 0; i < data.length; i++) {
    const cell = data[i].toLowerCase()
    if (cell.includes('goal') || cell.includes('skater') || cell.includes('forward') || cell.includes('defense')) {
      playerType = cell.includes('goal') ? 'Goalie' : 'Skater'
      break
    }
  }
  
  if (!firstName && !lastName) return null
  
  return {
    firstName,
    lastName,
    jerseyNumber,
    playerType,
    fullName: `${firstName} ${lastName}`.trim()
  }
}

/**
 * Extracts player information from a list item HTML
 */
function extractPlayerFromListItem(itemHtml: string): {
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
} | null {
  const text = itemHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  
  const patterns = [
    /(\d+),?\s+([^,]+),?\s+([^,]+),?\s+(\w+)/,
    /(\d+)\s+([^0-9]+)\s+(\w+)/,
    /([^0-9]+)\s+(\d+)/,
    /([^,]+),\s*([^,]+)/
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const groups = match.slice(1)
      
      let jerseyNumber = null
      let firstName = ''
      let lastName = ''
      let playerType = 'Skater'
      
      for (const group of groups) {
        const trimmed = group.trim()
        
        if (/^\d+$/.test(trimmed)) {
          jerseyNumber = parseInt(trimmed)
        } else if (trimmed.toLowerCase().includes('goal')) {
          playerType = 'Goalie'
        } else if (trimmed.toLowerCase().includes('skater')) {
          playerType = 'Skater'
        } else if (!firstName) {
          firstName = trimmed
        } else if (!lastName) {
          lastName = trimmed
        }
      }
      
      if (firstName || lastName) {
        return {
          firstName,
          lastName,
          jerseyNumber,
          playerType,
          fullName: `${firstName} ${lastName}`.trim()
        }
      }
    }
  }
  
  return null
}

/**
 * Extracts player information from a div HTML
 */
function extractPlayerFromDiv(divHtml: string): {
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
  playerType: string;
  fullName: string;
} | null {
  const jerseyMatch = divHtml.match(/<span[^>]*class="[^"]*jersey[^"]*"[^>]*>(\d+)<\/span>/i)
  const nameMatch = divHtml.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/i)
  const positionMatch = divHtml.match(/<span[^>]*class="[^"]*position[^"]*"[^>]*>([^<]+)<\/span>/i)
  
  const jerseyNumber = jerseyMatch ? parseInt(jerseyMatch[1]) : null
  const fullName = nameMatch ? nameMatch[1].trim() : ''
  const position = positionMatch ? positionMatch[1].trim() : ''
  
  if (!fullName) return null
  
  const nameParts = fullName.split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''
  
  return {
    firstName,
    lastName,
    jerseyNumber,
    playerType: position.toLowerCase().includes('goal') ? 'Goalie' : 'Skater',
    fullName
  }
}
