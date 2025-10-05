/**
 * Test script for HockeySyte scraper functionality
 * Run this to test the scraping logic without the full UI
 */

// Mock fetch for testing
global.fetch = async (url) => {
  console.log(`Mock fetch called with URL: ${url}`);
  
  // Mock HTML response for testing
  const mockHtml = `
    <html>
      <head><title>Team Page</title></head>
      <body>
        <div class="team-roster">
          <div class="player">
            <span class="jersey">11</span>
            <span class="name">Steven Adams</span>
            <span class="position">Skater</span>
          </div>
          <div class="player">
            <span class="jersey">8</span>
            <span class="name">Caio Freire</span>
            <span class="position">Skater</span>
          </div>
          <div class="player">
            <span class="jersey">1</span>
            <span class="name">Sean Takiari</span>
            <span class="position">Goalie</span>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return {
    ok: true,
    text: () => Promise.resolve(mockHtml)
  };
};

// Import the scraper function
const { scrapeHockeySyteTeam } = require('./src/utils/hockeysyteScraper.js');

async function testScraper() {
  console.log('🧪 Testing HockeySyte Scraper...\n');
  
  try {
    const testUrl = 'https://ilha.hockeysyte.com/team/936';
    console.log(`Testing with URL: ${testUrl}`);
    
    const players = await scrapeHockeySyteTeam(testUrl);
    
    console.log(`\n✅ Scraping successful! Found ${players.length} players:`);
    console.log('=' .repeat(50));
    
    players.forEach((player, index) => {
      console.log(`${index + 1}. ${player.fullName}`);
      console.log(`   Jersey: ${player.jerseyNumber || 'N/A'}`);
      console.log(`   Type: ${player.playerType}`);
      console.log('');
    });
    
    // Test data validation
    console.log('🔍 Testing data validation...');
    const { validatePlayerData } = require('./src/utils/hockeysyteScraper.js');
    const validation = validatePlayerData(players);
    
    if (validation.isValid) {
      console.log('✅ Data validation passed');
    } else {
      console.log('❌ Data validation failed:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log('⚠️  Validation warnings:');
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testScraper().then(() => {
  console.log('\n🏁 Test completed!');
}).catch(error => {
  console.error('💥 Test crashed:', error);
});
