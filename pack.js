import fs from 'fs';
import { ZipArchive } from 'archiver';

const output = fs.createWriteStream('Strava_Tracker_SubAdmin.zip');
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', function() {
  console.log('Zip file created successfully. Total bytes: ' + archive.pointer());
});

archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Append directories
archive.directory('server/', 'server');
archive.directory('dist/', 'dist');

// We also need node_modules for the server to run.
archive.directory('node_modules/', 'node_modules');

// Append files
const files = ['package.json', 'START_APP.bat', 'Strava_Tracker.exe', 'app_icon.ico', '.env', 'HUONG_DAN_SU_DUNG.txt'];
for (const file of files) {
  if (fs.existsSync(file)) {
    archive.file(file, { name: file });
  }
}

// Ensure Input and Storage are created empty
archive.append('', { name: 'Input/' });
archive.append('', { name: 'Storage/' });

archive.finalize();
