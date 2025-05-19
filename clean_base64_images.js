const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'public/data/art_database.json');

let rawData = fs.readFileSync(dbPath, 'utf-8');
let json = JSON.parse(rawData);

// Detect whether data is an array or wrapped under a key like "artworks"
let records;
if (Array.isArray(json)) {
  records = json;
} else if (Array.isArray(json.artworks)) {
  records = json.artworks;
} else {
  throw new Error("❌ Could not find an array of artworks in the JSON file.");
}

let updated = 0;
records.forEach((artwork) => {
  if (artwork.imageBase64 && typeof artwork.imageBase64 === 'string') {
    const parts = artwork.imageBase64.split(',');
    if (parts.length > 1) {
      artwork.imageBase64 = parts[1]; // Strip prefix
      updated++;
    }
  }
});

// Save cleaned data
const output = Array.isArray(json) ? records : { ...json, artworks: records };
fs.writeFileSync(dbPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ Cleaned ${updated} artwork record(s).`);
