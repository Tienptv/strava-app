const fs = require('fs');
const Papa = require('papaparse'); // Wait, is papaparse available in Node? Let me just write the logic manually.

const row = {
    "Athlete": "/athletes/125487039",
    "Activity": "/activities/19562239388",
    "Type": "unknown",
    "Name": "Sang Nguyen",
    "Date": "2026-08-02T00:00:00.000+07:00",
    "Distance": "21.43",
    "Duration": "02:30:00",
};

let activityId = null;
if (row.Activity) {
  const match = String(row.Activity).match(/\d+/);
  if (match) activityId = match[0];
} else if (row['Activity ID'] || row.id || row.Id) {
  activityId = String(row['Activity ID'] || row.id || row.Id);
}

console.log("Extracted activityId:", activityId);
console.log("JSON.stringify behavior:", JSON.stringify({id: activityId, "other": "test"}));
