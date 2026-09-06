const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    
    let entries = fs.readdirSync(from, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(from, entry.name);
        let destPath = path.join(to, entry.name);

        if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
        }

        if (entry.isDirectory()) {
            copyFolderSync(srcPath, destPath);
        } else {
            try {
                let content = fs.readFileSync(srcPath);
                fs.writeFileSync(destPath, content);
                console.log(`Copied: ${srcPath}`);
            } catch (e) {
                console.error(`Failed to copy ${srcPath}: ${e.message}`);
            }
        }
    }
}

const srcDir = 'C:\\Users\\926166\\OneDrive - Haskoning\\AI Project\\strava-app';
const destDir = 'C:\\Users\\926166\\OneDrive - Haskoning\\Tien_926166\\Strava_Desktop_Software\\frontend';
console.log('Starting copy...');
copyFolderSync(srcDir, destDir);
console.log('Done.');
