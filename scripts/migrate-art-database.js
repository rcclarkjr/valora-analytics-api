// scripts/migrate-art-database.js

const fs = require('fs');
const path = require('path');

const diskDbPath = path.join(__dirname, '..', 'public', 'data', 'art_database.json');
const repoDbPath = path.join(__dirname, '..', 'initial_data', 'art_database.json');

// Create initial_data folder for original repo version if needed
function ensureRepoCopyExists() {
  if (!fs.existsSync(repoDbPath)) {
    console.error('ERROR: No original GitHub copy found at', repoDbPath);
    console.error('Please create "initial_data/art_database.json" with your last known good file from GitHub.');
    process.exit(1);
  }
}

// Only copy if persistent disk file doesn't exist
function migrateIfNeeded() {
  if (fs.existsSync(diskDbPath)) {
    console.log('✅ Disk copy already exists. No migration needed.');
    return;
  }

  console.log('⚠️  No disk copy found. Migrating art_database.json from repo...');
  fs.copyFileSync(repoDbPath, diskDbPath);
  console.log('✅ Migration complete. Disk copy now exists at:', diskDbPath);
}

ensureRepoCopyExists();
migrateIfNeeded();
