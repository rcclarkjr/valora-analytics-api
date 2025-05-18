// migrate_images_to_base64.js

const fs = require('fs');
const path = require('path');

const DB_PATH = '/opt/render/project/src/public/data/art_database.json';
const IMAGES_DIR = '/opt/render/project/src/public/data/images/artworks';

function migrateImagesToBase64() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let updatedCount = 0;
    let missingCount = 0;

    db.records.forEach(record => {
      const paddedId = String(record.recordId).padStart(5, '0');
      const imagePath = path.join(IMAGES_DIR, `${paddedId}.jpg`);

      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        record.imageBase64 = base64;

        delete record.imagePath; // optional cleanup

        updatedCount++;
      } else {
        console.warn(`Image not found for record ID ${record.recordId}`);
        missingCount++;
      }
    });

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log(`✅ Migration complete. Updated: ${updatedCount}, Missing: ${missingCount}`);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  }
}

migrateImagesToBase64();
