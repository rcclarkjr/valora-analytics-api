const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'public/data/art_database.json');

try {
  const rawData = fs.readFileSync(dbPath, 'utf-8');
  const json = JSON.parse(rawData);

  if (!Array.isArray(json.records)) {
    throw new Error('Expected `records` to be an array.');
  }

  let updated = 0;

  json.records.forEach((record) => {
    if (record.imageBase64 && typeof record.imageBase64 === 'string') {
      const parts = record.imageBase64.split(',');
      if (parts.length > 1) {
        record.imageBase64 = parts[1]; // Strip prefix
        updated++;
      }
    }
  });

  fs.writeFileSync(dbPath, JSON.stringify(json, null, 2), 'utf-8');
  console.log(`✅ Cleaned ${updated} imageBase64 field(s) in ${json.records.length} records.`);
} catch (err) {
  console.error('❌ Error cleaning imageBase64 fields:', err.message);
}
