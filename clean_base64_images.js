const fs = require('fs');
const path = require('path');

// Adjust path if needed
const dbPath = path.join(__dirname, 'public/data/art_database.json');

try {
  // Load and parse the JSON file
  const rawData = fs.readFileSync(dbPath, 'utf-8');
  const artworks = JSON.parse(rawData); // confirmed to be an array

  if (!Array.isArray(artworks)) {
    throw new Error('Expected raw array of records in JSON file.');
  }

  let updated = 0;

  artworks.forEach((record, index) => {
    if (record.imageBase64 && typeof record.imageBase64 === 'string') {
      const parts = record.imageBase64.split(',');
      if (parts.length > 1) {
        record.imageBase64 = parts[1]; // Keep only the base64 portion
        updated++;
      }
    }
  });

  // Write the updated records back to the file
  fs.writeFileSync(dbPath, JSON.stringify(artworks, null, 2), 'utf-8');

  console.log(`✅ Cleaned ${updated} imageBase64 field(s) in ${artworks.length} records.`);
} catch (err) {
  console.error('❌ Error cleaning imageBase64 fields:', err.message);
}
