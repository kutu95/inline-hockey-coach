// Multi-sport AI generation system
import { getSportConfig, SPORT_TYPES } from '../sports/config'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key not found. AI features will be disabled.');
}

// Parse natural language description into structured data for any sport
const parseDescription = (description, sportId) => {
  const lowerDesc = description.toLowerCase();
  const sportConfig = getSportConfig(sportId);
  
  // Extract frame rate
  const fpsMatch = lowerDesc.match(/(\d+)\s*fps/);
  const frameRate = fpsMatch ? parseInt(fpsMatch[1]) : sportConfig.animation.defaultFrameRate;
  
  // Extract duration
  const durationMatch = lowerDesc.match(/(\d+)\s*second/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : sportConfig.animation.defaultDuration;
  
  // Calculate total frames
  const totalFrames = frameRate * duration;
  
  // Extract sport-specific scenarios
  const scenarios = extractSportScenarios(lowerDesc, sportId);
  
  // Detect mode: append, insert, or replace (default)
  let mode = 'replace';
  if (lowerDesc.includes('append') || lowerDesc.includes('add to') || lowerDesc.includes('continue')) {
    mode = 'append';
  } else if (lowerDesc.includes('insert') || lowerDesc.includes('insert at') || lowerDesc.includes('between')) {
    mode = 'insert';
  }
  
  return {
    frameRate,
    duration,
    totalFrames,
    scenarios,
    mode,
    description
  };
};

// Extract sport-specific scenarios from description
const extractSportScenarios = (description, sportId) => {
  const sportConfig = getSportConfig(sportId);
  const scenarios = [];
  
  switch (sportId) {
    case SPORT_TYPES.HOCKEY:
      if (description.includes('2 on 1') || description.includes('2-on-1')) scenarios.push('2-on-1');
      if (description.includes('3 on 2') || description.includes('3-on-2')) scenarios.push('3-on-2');
      if (description.includes('breakout')) scenarios.push('breakout');
      if (description.includes('forecheck')) scenarios.push('forecheck');
      if (description.includes('backcheck')) scenarios.push('backcheck');
      if (description.includes('powerplay')) scenarios.push('powerplay');
      break;
      
    case SPORT_TYPES.SOCCER:
      if (description.includes('passing drill')) scenarios.push('passing-drill');
      if (description.includes('shooting drill')) scenarios.push('shooting-drill');
      if (description.includes('defensive drill')) scenarios.push('defensive-drill');
      if (description.includes('set piece')) scenarios.push('set-piece');
      if (description.includes('counter attack')) scenarios.push('counter-attack');
      if (description.includes('corner kick')) scenarios.push('corner-kick');
      break;
      
    case SPORT_TYPES.BASKETBALL:
      if (description.includes('pick and roll')) scenarios.push('pick-and-roll');
      if (description.includes('fast break')) scenarios.push('fast-break');
      if (description.includes('half court')) scenarios.push('half-court-set');
      if (description.includes('shooting drill')) scenarios.push('shooting-drill');
      if (description.includes('defensive drill')) scenarios.push('defensive-drill');
      if (description.includes('rebounding')) scenarios.push('rebounding');
      break;
  }
  
  return scenarios.length > 0 ? scenarios : ['general'];
};

// Generate sport-specific prompt
const generateSportPrompt = (description, sportId, parsed) => {
  const sportConfig = getSportConfig(sportId);
  
  const basePrompt = `Generate ${sportConfig.displayName} animation: "${description}"

Generate EXACTLY ${parsed.totalFrames} frames (${parsed.frameRate} FPS × ${parsed.duration} seconds).

CRITICAL: You MUST generate ALL ${parsed.totalFrames} frames - do not stop early!

IMPORTANT: ${getSportSpecificInstructions(sportId)}

JSON format:
{
  "frameRate": ${parsed.frameRate},
  "totalFrames": ${parsed.totalFrames},
  "sport": "${sportId}",
  "scenarios": ${JSON.stringify(parsed.scenarios)},
  "mode": "${parsed.mode}",
  "frames": [
    ${generateFrameTemplate(sportId)}
  ]
}

Rules: Generate ALL ${parsed.totalFrames} frames, ${getSportSpecificRules(sportId)}, valid JSON`;

  return basePrompt;
};

// Get sport-specific instructions
const getSportSpecificInstructions = (sportId) => {
  const sportConfig = getSportConfig(sportId);
  const ai = sportConfig.ai || {};
  
  switch (sportId) {
    case SPORT_TYPES.HOCKEY:
      return `Players DO NOT move unless description specifically says "skating" or "moving"
For passing drills: Players stay in fixed positions, ONLY the puck moves
Include puck for: pass, passing, puck, shoot, shooting`;
      
    case SPORT_TYPES.SOCCER:
      return `Players can move freely for: passing, shooting, dribbling, running
Include ball for: pass, passing, ball, shoot, shooting, dribbling
Players may change positions during the animation`;
      
    case SPORT_TYPES.BASKETBALL:
      return `Players can move for: pick and roll, fast break, cutting
Include ball for: pass, passing, ball, shoot, shooting, dribbling
Players may change positions during offensive plays`;
      
    default:
      return `Players move according to the description
Include the main game object (ball/puck) for relevant actions`;
  }
};

// Get sport-specific rules
const getSportSpecificRules = (sportId) => {
  switch (sportId) {
    case SPORT_TYPES.HOCKEY:
      return 'players stay in same position, only puck moves';
    case SPORT_TYPES.SOCCER:
      return 'players and ball can move freely';
    case SPORT_TYPES.BASKETBALL:
      return 'players and ball can move freely';
    default:
      return 'follow sport-specific movement patterns';
  }
};

// Generate frame template for each sport
const generateFrameTemplate = (sportId) => {
  const sportConfig = getSportConfig(sportId);
  
  switch (sportId) {
    case SPORT_TYPES.HOCKEY:
      return `{
      "frameNumber": 1,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 200, "y": 200, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 400, "y": 200, "fill": "#0000ff", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "puck": {"x": 200, "y": 200}
    },
    {
      "frameNumber": 2,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 200, "y": 200, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 400, "y": 200, "fill": "#0000ff", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "puck": {"x": 300, "y": 200}
    }`;
      
    case SPORT_TYPES.SOCCER:
      return `{
      "frameNumber": 1,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 300, "y": 300, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 500, "y": 300, "fill": "#0000ff", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "ball": {"x": 300, "y": 300, "radius": 12}
    },
    {
      "frameNumber": 2,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 300, "y": 300, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 500, "y": 300, "fill": "#0000ff", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "ball": {"x": 400, "y": 300, "radius": 12}
    }`;
      
    case SPORT_TYPES.BASKETBALL:
      return `{
      "frameNumber": 1,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 400, "y": 300, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 600, "y": 300, "fill": "#0000ff", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "ball": {"x": 400, "y": 300, "radius": 10}
    },
    {
      "frameNumber": 2,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 400, "y": 300, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 600, "y": 300, "fill": "#0000ff", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "ball": {"x": 500, "y": 300, "radius": 10}
    }`;
      
    default:
      return `{
      "frameNumber": 1,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 300, "y": 300, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"}
      ]
    }`;
  }
};

// Generate animation using OpenAI API for any sport
export const generateAnimation = async (description, sportId = SPORT_TYPES.HOCKEY) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Generating ${sportId} animation:`, description);
  console.log('API Key length:', OPENAI_API_KEY.length);

  const parsed = parseDescription(description, sportId);
  const prompt = generateSportPrompt(description, sportId, parsed);
  
  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `Generate ${getSportConfig(sportId).displayName} animations in JSON format.`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 4000
  };
  
  try {
    console.log('Making API request to OpenAI...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('=== TIMEOUT TRIGGERED ===');
      controller.abort();
    }, 15000);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid API response structure');
    }

    const content = data.choices[0].message.content;
    console.log('Generated content:', content);

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const animationData = JSON.parse(jsonMatch[0]);
    console.log('Parsed animation data:', animationData);

    // Validate the animation data
    if (!animationData.frames || !Array.isArray(animationData.frames)) {
      throw new Error('Invalid animation data: missing frames array');
    }

    return animationData;

  } catch (error) {
    console.error('Error generating animation:', error);
    throw error;
  }
};

// Generate mock animation for testing (sport-specific)
export const generateMockAnimation = async (description, sportId = SPORT_TYPES.HOCKEY) => {
  console.log(`Generating mock ${sportId} animation for:`, description);
  
  const parsed = parseDescription(description, sportId);
  const sportConfig = getSportConfig(sportId);
  
  // Generate mock frames based on sport
  const frames = [];
  for (let i = 1; i <= parsed.totalFrames; i++) {
    const frame = {
      frameNumber: i,
      players: [
        {
          id: 'player1',
          type: 'dynamic-player-0',
          x: 300 + Math.sin(i * 0.1) * 50,
          y: 300 + Math.cos(i * 0.1) * 50,
          fill: '#ff0000',
          stroke: '#ffffff',
          strokeWidth: 2,
          text: '1'
        }
      ]
    };
    
    // Add sport-specific object
    switch (sportId) {
      case SPORT_TYPES.HOCKEY:
        frame.puck = {
          x: 400 + Math.sin(i * 0.2) * 100,
          y: 300 + Math.cos(i * 0.2) * 100
        };
        break;
      case SPORT_TYPES.SOCCER:
        frame.ball = {
          x: 400 + Math.sin(i * 0.2) * 100,
          y: 300 + Math.cos(i * 0.2) * 100,
          radius: 12
        };
        break;
      case SPORT_TYPES.BASKETBALL:
        frame.ball = {
          x: 400 + Math.sin(i * 0.2) * 100,
          y: 300 + Math.cos(i * 0.2) * 100,
          radius: 10
        };
        break;
    }
    
    frames.push(frame);
  }
  
  return {
    frameRate: parsed.frameRate,
    totalFrames: parsed.totalFrames,
    sport: sportId,
    scenarios: parsed.scenarios,
    mode: parsed.mode,
    frames
  };
};

// Main function to generate animation (uses mock if no API key)
export const generateMultiSportAnimation = async (description, sportId = SPORT_TYPES.HOCKEY) => {
  if (!OPENAI_API_KEY) {
    console.log(`Using mock ${sportId} animation (no API key)`);
    return await generateMockAnimation(description, sportId);
  }
  
  return await generateAnimation(description, sportId);
};

// Test API connectivity
export const testAPIConnectivity = async () => {
  if (!OPENAI_API_KEY) {
    console.log('No API key configured');
    return false;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    if (response.ok) {
      console.log('✅ API connection successful');
      return true;
    } else {
      console.log('❌ API connection failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ API connection error:', error);
    return false;
  }
};

// Export sport-specific animation generators for backward compatibility
export const generateHockeyAnimation = (description) => generateMultiSportAnimation(description, SPORT_TYPES.HOCKEY);
export const generateSoccerAnimation = (description) => generateMultiSportAnimation(description, SPORT_TYPES.SOCCER);
export const generateBasketballAnimation = (description) => generateMultiSportAnimation(description, SPORT_TYPES.BASKETBALL);
