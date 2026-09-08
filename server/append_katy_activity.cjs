const fs = require('fs');
const path = require('path');

const importedFile = path.join(__dirname, '../Storage/imported_activities.json');

let imported = [];
if (fs.existsSync(importedFile)) {
  imported = JSON.parse(fs.readFileSync(importedFile, 'utf8'));
}

const newActivity = {
  id: "19035991542",
  type: "Run",
  distance: 5030,
  moving_time: 3549,
  start_date_local: "2026-06-05T19:38:00Z", // Normalize to ISO UTC style
  athlete: {
    id: 149162660,
    firstname: "Katy",
    lastname: "Nguyen"
  }
};

const exists = imported.some(act => act.id === "19035991542");
if (!exists) {
  imported.push(newActivity);
  fs.writeFileSync(importedFile, JSON.stringify(imported, null, 2));
  console.log('Added Katy Nguyen activity 19035991542 successfully.');
} else {
  console.log('Activity 19035991542 already exists.');
}
