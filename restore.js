import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMPORTED_FILE = path.join(__dirname, 'Storage/imported_activities.json');

// Need to just run a POST to the endpoint to trigger it, since it's hard to extract the function.
fetch('http://localhost:3001/api/challenge/sync-storage', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
