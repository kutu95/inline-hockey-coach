const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkStorage() {
  console.log('Checking club-logos bucket contents...');
  
  const { data: files, error } = await supabase.storage
    .from('club-logos')
    .list('', { limit: 100, offset: 0 });
  
  if (error) {
    console.error('Error listing files:', error);
    return;
  }
  
  console.log('Files found:', files.length);
  
  const orgFolders = {};
  files.forEach(file => {
    if (file.name) {
      const parts = file.name.split('/');
      if (parts.length >= 2) {
        const orgId = parts[0];
        const fileName = parts[1];
        if (!orgFolders[orgId]) {
          orgFolders[orgId] = [];
        }
        orgFolders[orgId].push(fileName);
      }
    }
  });
  
  console.log('\nOrganization folders:');
  Object.keys(orgFolders).forEach(orgId => {
    console.log(orgId + ':');
    orgFolders[orgId].forEach(file => {
      console.log('  ' + file);
    });
  });
}

checkStorage();

