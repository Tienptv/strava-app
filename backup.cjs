const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Build the backup file name
const date = new Date();
const timestamp = date.getFullYear().toString() + 
  (date.getMonth() + 1).toString().padStart(2, '0') + 
  date.getDate().toString().padStart(2, '0') + '_' + 
  date.getHours().toString().padStart(2, '0') + 
  date.getMinutes().toString().padStart(2, '0') + 
  date.getSeconds().toString().padStart(2, '0');

const backupFileName = `strava-app-backup-${timestamp}.zip`;
const backupFilePath = path.join(__dirname, '..', backupFileName);

console.log(`Creating backup at: ${backupFilePath}`);

try {
  // Use powershell Compress-Archive but exclude node_modules to save space and time
  execSync(`powershell -Command "Get-ChildItem -Path . -Exclude node_modules, .git, .env | Compress-Archive -DestinationPath '${backupFilePath}' -Force"`, { stdio: 'inherit' });
  console.log('Backup created successfully!');
} catch (error) {
  console.error('Error creating backup:', error.message);
}
