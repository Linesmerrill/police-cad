#!/usr/bin/env node

/**
 * Update version.json with current datetime
 * Format: YYYY.MM.DD-HH:MM:SS
 */

const fs = require('fs');
const path = require('path');

// Get current date/time
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const seconds = String(now.getSeconds()).padStart(2, '0');

// Format: YYYY.MM.DD-HH:MM:SS
const version = `${year}.${month}.${day}-${hours}:${minutes}:${seconds}`;

// Create version object
const versionData = {
  version: version,
  buildDate: now.toISOString()
};

// Path to version.json (in project root)
const versionPath = path.join(__dirname, '..', 'version.json');

// Write version file
try {
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');
  console.log(`✓ Version updated to: ${version}`);
  process.exit(0);
} catch (error) {
  console.error('✗ Error updating version:', error.message);
  process.exit(1);
}

