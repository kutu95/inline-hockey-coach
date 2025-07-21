// AI service for generating hockey animations using OpenAI API

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key not found. AI features will be disabled.');
}

// Parse natural language description into structured data
const parseDescription = (description) => {
  const lowerDesc = description.toLowerCase();
  
  // Extract frame rate
  const fpsMatch = lowerDesc.match(/(\d+)\s*fps/);
  const frameRate = fpsMatch ? parseInt(fpsMatch[1]) : 5;
  
  // Extract duration
  const durationMatch = lowerDesc.match(/(\d+)\s*second/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : 3;
  
  // Calculate total frames
  const totalFrames = frameRate * duration;
  
  // Extract scenario type
  let scenario = 'general';
  if (lowerDesc.includes('2 on 1') || lowerDesc.includes('2-on-1')) scenario = '2-on-1';
  if (lowerDesc.includes('3 on 2') || lowerDesc.includes('3-on-2')) scenario = '3-on-2';
  if (lowerDesc.includes('breakout')) scenario = 'breakout';
  if (lowerDesc.includes('forecheck')) scenario = 'forecheck';
  if (lowerDesc.includes('backcheck')) scenario = 'backcheck';
  
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
    scenario,
    mode,
    description
  };
};

// Generate animation using OpenAI API
export const generateAnimation = async (description) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('API Key length:', OPENAI_API_KEY.length);
  console.log('API Key starts with:', OPENAI_API_KEY.substring(0, 10) + '...');

  const parsed = parseDescription(description);
  
  const prompt = `Generate hockey animation: "${description}"

Generate EXACTLY ${parsed.totalFrames} frames (${parsed.frameRate} FPS × ${parsed.duration} seconds).

CRITICAL: You MUST generate ALL ${parsed.totalFrames} frames - do not stop early!

IMPORTANT: Players DO NOT move unless description specifically says "skating" or "moving"
For passing drills: Players stay in fixed positions, ONLY the puck moves
Include puck for: pass, passing, puck, shoot, shooting

JSON format:
{
  "frameRate": ${parsed.frameRate},
  "totalFrames": ${parsed.totalFrames},
  "scenario": "${parsed.scenario}",
  "mode": "${parsed.mode}",
  "frames": [
    {
      "frameNumber": 1,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 200, "y": 200, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 400, "y": 200, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "puck": {"x": 200, "y": 200}
    },
    {
      "frameNumber": 2,
      "players": [
        {"id": "player1", "type": "dynamic-player-0", "x": 200, "y": 200, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "1"},
        {"id": "player2", "type": "dynamic-player-1", "x": 400, "y": 200, "fill": "#ff0000", "stroke": "#ffffff", "strokeWidth": 2, "text": "2"}
      ],
      "puck": {"x": 300, "y": 200}
    }
  ]
}

Rules: Generate ALL ${parsed.totalFrames} frames, players stay in same position, only puck moves, valid JSON`;

  try {
    console.log('=== AI DEBUG START ===');
    console.log('Making API request to OpenAI...');
    console.log('Request URL:', 'https://api.openai.com/v1/chat/completions');
    console.log('API Key valid:', !!OPENAI_API_KEY);
    console.log('API Key length:', OPENAI_API_KEY?.length);
    console.log('Request Headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY?.substring(0, 20)}...`
    });
    
    const requestBody = {
      model: 'gpt-3.5-turbo', // Fallback to reliable model
      messages: [
        {
          role: 'system',
          content: 'Generate hockey animations in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Very low temperature for consistency
      max_tokens: 4000 // Increased token limit for more frames
    };
    
    console.log('Request Body size:', JSON.stringify(requestBody).length, 'characters');
    console.log('Prompt size:', prompt.length, 'characters');
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('=== TIMEOUT TRIGGERED ===');
      controller.abort();
    }, 15000); // 15 second timeout - much shorter
    
    console.log('Starting fetch request...');
    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    const endTime = Date.now();
    console.log(`Fetch completed in ${endTime - startTime}ms`);
    clearTimeout(timeoutId);

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error('API Response Status:', response.status);
      console.error('API Response Status Text:', response.statusText);
      
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log('Parsing response JSON...');
    const data = await response.json();
    console.log('Response data structure:', Object.keys(data));
    console.log('Number of choices:', data.choices?.length);
    
    const content = data.choices[0].message.content;
    console.log('AI Response length:', content?.length, 'characters');
    console.log('AI Response preview:', content?.substring(0, 200) + '...');
    
    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      throw new Error('Invalid response format from AI');
    }
    
    try {
      const animationData = JSON.parse(jsonMatch[0]);
      console.log('Parsed animation data:', animationData);
      return animationData;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw JSON string:', jsonMatch[0]);
      
      // Try to fix common JSON issues
      let fixedJson = jsonMatch[0]
        .replace(/\/\/.*$/gm, '')  // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/\n/g, '')      // Remove newlines
        .replace(/\r/g, '')      // Remove carriage returns
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();                 // Remove leading/trailing spaces
      
      try {
        const animationData = JSON.parse(fixedJson);
        console.log('Fixed and parsed animation data:', animationData);
        return animationData;
      } catch (secondError) {
        console.error('Still failed to parse JSON after fixes');
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }
    }
    
  } catch (error) {
    console.error('AI generation error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('AI request timed out. Please try again later.');
    }
    
    throw new Error(`Failed to generate animation: ${error.message}`);
  }
};

// Mock function for testing (when API key is not available)
export const generateMockAnimation = async (description) => {
  const parsed = parseDescription(description);
  
  // Create a simple mock animation
  const frames = [];
  for (let i = 1; i <= parsed.totalFrames; i++) {
    const progress = (i - 1) / (parsed.totalFrames - 1);
    
    frames.push({
      frameNumber: i,
      players: [
        {
          id: 'player1',
          type: 'dynamic-player-forward',
          x: 50 + (progress * 400),
          y: 150,
          color: '#ff0000',
          text: '1'
        },
        {
          id: 'player2',
          type: 'dynamic-player-forward',
          x: 50 + (progress * 400),
          y: 200,
          color: '#ff0000',
          text: '2'
        },
        {
          id: 'defender1',
          type: 'dynamic-player-defender',
          x: 300 + (progress * 100),
          y: 175,
          color: '#0000ff',
          text: 'D'
        }
      ],
      puck: {
        x: 50 + (progress * 450),
        y: 175
      }
    });
  }
  
  return {
    frameRate: parsed.frameRate,
    totalFrames: parsed.totalFrames,
    scenario: parsed.scenario,
    frames
  };
};

// Test function to check API connectivity
export const testAPIConnectivity = async () => {
  if (!OPENAI_API_KEY) {
    console.log('No API key available for testing');
    return false;
  }
  
  try {
    console.log('Testing API connectivity...');
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });
    
    console.log('API test response status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Available models:', data.data?.map(m => m.id).slice(0, 5));
      return true;
    } else {
      console.log('API test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('API connectivity test error:', error);
    return false;
  }
};

// Main function to generate animation (uses mock if no API key)
export const generateHockeyAnimation = async (description) => {
  if (!OPENAI_API_KEY) {
    console.log('Using mock animation (no API key)');
    return await generateMockAnimation(description);
  }
  
  return await generateAnimation(description);
}; 