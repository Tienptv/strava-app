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

        if (entry.isDirectory()) {
            copyFolderSync(srcPath, destPath);
        } else {
            try {
                let content = fs.readFileSync(srcPath);
                fs.writeFileSync(destPath, content);
            } catch (e) {
                console.error(`Failed to copy ${srcPath}: ${e.message}`);
            }
        }
    }
}

function copyFileSync(from, to) {
    try {
        let content = fs.readFileSync(from);
        fs.writeFileSync(to, content);
    } catch (e) {
        console.error(`Failed to copy ${from}: ${e.message}`);
    }
}

const srcDir = 'C:\\Users\\926166\\OneDrive - Haskoning\\AI Project\\strava-app';
const destDir = 'C:\\Users\\926166\\OneDrive - Haskoning\\Tien_926166\\Strava_Desktop_Software\\frontend';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

console.log('Copying src...');
copyFolderSync(path.join(srcDir, 'src'), path.join(destDir, 'src'));

console.log('Copying public...');
if (fs.existsSync(path.join(srcDir, 'public'))) {
    copyFolderSync(path.join(srcDir, 'public'), path.join(destDir, 'public'));
}

console.log('Copying root files...');
const files = ['package.json', 'index.html', 'vite.config.js'];
for (const file of files) {
    copyFileSync(path.join(srcDir, file), path.join(destDir, file));
}

console.log('Done.');
