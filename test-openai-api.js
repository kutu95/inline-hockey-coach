// Test OpenAI API key
import { config } from 'dotenv';
config();

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

console.log('Testing OpenAI API key...');
console.log('API Key length:', OPENAI_API_KEY?.length || 'undefined');
console.log('API Key starts with:', OPENAI_API_KEY?.substring(0, 10) + '...' || 'undefined');

if (!OPENAI_API_KEY) {
  console.error('❌ No API key found in .env file');
  process.exit(1);
}

// Test the API
async function testAPI() {
  try {
    console.log('Making test API call...');
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API key is valid!');
      console.log('Available models:', data.data.slice(0, 3).map(m => m.id));
    } else {
      console.error('❌ API key is invalid or has issues');
      console.error('Status:', response.status);
      console.error('Status text:', response.statusText);
      
      const errorData = await response.text();
      console.error('Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testAPI(); 