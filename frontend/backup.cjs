const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

// Ensure backups directory exists
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Build the backup file name with timestamp YYYYMMDD_HHmmss
const now = new Date();
const pad = (n) => n.toString().padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const backupFileName = `strava-app-backup-${timestamp}.zip`;
const backupFilePath = path.join(backupsDir, backupFileName);

console.log('==============================================');
console.log('       STRAVA TRACKER - BACKUP PROJECT        ');
console.log('==============================================');
console.log(`[INFO] Creating backup archive...`);
console.log(`[TARGET] ${backupFilePath}\n`);

const startTime = Date.now();
const output = fs.createWriteStream(backupFilePath);
const archive = new ZipArchive({
  zlib: { level: 9 } // Maximum compression
});

let fileCount = 0;
archive.on('entry', () => {
  fileCount++;
  if (fileCount % 50 === 0) {
    process.stdout.write(`\r[PROGRESS] Archiving files... (${fileCount} files processed)`);
  }
});

output.on('close', () => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
  console.log(`\r[PROGRESS] Archiving files... (${fileCount} files processed)`);
  console.log(`\n==============================================`);
  console.log(' [SUCCESS] Backup completed successfully!');
  console.log(` - File name : ${backupFileName}`);
  console.log(` - Saved to  : ${backupFilePath}`);
  console.log(` - Files     : ${fileCount} files`);
  console.log(` - Size      : ${sizeMB} MB (${archive.pointer().toLocaleString()} bytes)`);
  console.log(` - Duration  : ${duration}s`);
  console.log('==============================================\n');
});

archive.on('error', (err) => {
  console.error('\n[ERROR] An error occurred while creating backup:', err);
  process.exit(1);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('\n[WARN]', err.message);
  } else {
    console.warn('\n[WARN]', err);
  }
});

archive.pipe(output);

archive.glob('**/*', {
  cwd: __dirname,
  ignore: [
    'node_modules/**',
    '.git/**',
    '.git',
    'dist/**',
    'backups/**',
    'desktop_release/**',
    'temp_cloud_staging/**',
    '*.zip',
    '**/*.zip',
    'temp_restore*/**',
    'scratch*/**',
    '.chrome_session/**',
    'Storage/puppeteer_data/**',
    'src_backup_*/**',
    '**/.DS_Store',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*'
  ],
  dot: true
});

archive.finalize();
