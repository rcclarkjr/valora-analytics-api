const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'public/data/art_database.json'); // adjust path if needed

// Load the existing database
let rawData = fs.readFileSync(dbPath, 'utf-8');
let artworks = JSON.parse(rawData);

// Clean the imageBase64 field in each record
let updated = 0;
artworks.forEach((artwork, index) => {
  if (artwork.imageBase64 && typeof artwork.imageBase64 === 'string') {
    const parts = artwork.imageBase64.split(',');
    if (parts.length > 1) {
      artwork.imageBase64 = parts[1]; // keep only the Base64 part
      updated++;
    }
  }
});

// Save the cleaned database back to the file
fs.writeFileSync(dbPath, JSON.stringify(artworks, null, 2), 'utf-8');

console.log(`✅ Completed. Cleaned ${updated} records out of ${artworks.length}.`);
