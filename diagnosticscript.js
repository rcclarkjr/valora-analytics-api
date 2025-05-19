const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'public/data/art_database.json');

try {
  const rawData = fs.readFileSync(dbPath, 'utf-8');
  const parsed = JSON.parse(rawData);

  if (Array.isArray(parsed)) {
    console.log('✅ File is a raw array of records.');
  } else if (typeof parsed === 'object' && parsed !== null) {
    console.log('📂 Top-level keys:', Object.keys(parsed));
  } else {
    console.log('❌ Unknown structure.');
  }
} catch (err) {
  console.error('❌ JSON read/parse error:', err.message);
}
