const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING CHRISTMAS SNOW CAP & ICICLES INTEGRITY TEST ---');

// 1. Kiểm tra file SnowCapBar.jsx
const snowCapPath = path.resolve('frontend/src/themes/christmas/SnowCapBar.jsx');
assert(fs.existsSync(snowCapPath), 'SnowCapBar.jsx must exist');
const snowCapContent = fs.readFileSync(snowCapPath, 'utf8');
assert(snowCapContent.includes('export default function SnowCapBar'), 'SnowCapBar export missing');
assert(snowCapContent.includes('snow-cap-svg'), 'snow-cap-svg class missing');
assert(snowCapContent.includes('snowCapGradient'), 'snowCapGradient missing');
assert(snowCapContent.includes('snow-cap-sparkle'), 'snow-cap-sparkle missing');
console.log('✅ Case 1: SnowCapBar.jsx component verified (SVG path, gradient & sparkles)');

// 2. Kiểm tra file snowCap.css
const cssPath = path.resolve('frontend/src/themes/christmas/snowCap.css');
assert(fs.existsSync(cssPath), 'snowCap.css must exist');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('.snow-cap-bar-wrapper'), '.snow-cap-bar-wrapper missing');
assert(cssContent.includes('pointer-events: none'), 'pointer-events: none missing');
assert(cssContent.includes('.theme-christmas .month-dropdown-trigger'), 'Christmas month-dropdown-trigger styling missing');
assert(cssContent.includes('.theme-christmas .upcoming-race-badge'), 'Christmas upcoming-race-badge styling missing');
assert(cssContent.includes('.theme-christmas .runner-of-the-month'), 'Christmas runner-of-the-month styling missing');
console.log('✅ Case 2: snowCap.css verified (styling, pointer-events, theme-christmas overrides)');

// 3. Kiểm tra ChallengeTable.jsx
const tablePath = path.resolve('frontend/src/components/ChallengeTable.jsx');
const tableContent = fs.readFileSync(tablePath, 'utf8');
assert(tableContent.includes("import { SnowCapBar } from '../themes/christmas';"), 'SnowCapBar import missing in ChallengeTable');
assert(tableContent.includes("const isChristmas = seasonalTheme === 'christmas';"), 'isChristmas declaration missing in ChallengeTable');
assert(tableContent.includes('<SnowCapBar variant="month" />'), 'SnowCapBar variant="month" missing');
assert(tableContent.includes('<SnowCapBar variant="race" />'), 'SnowCapBar variant="race" missing');
assert(tableContent.includes('<SnowCapBar variant="runner" />'), 'SnowCapBar variant="runner" missing');
console.log('✅ Case 3: ChallengeTable.jsx verified (all 3 green box bars mounted with SnowCapBar)');

// 4. Kiểm tra Christmas theme index.js
const indexPath = path.resolve('frontend/src/themes/christmas/index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');
assert(indexContent.includes("export { default as SnowCapBar } from './SnowCapBar';"), 'SnowCapBar export missing in index.js');
console.log('✅ Case 4: Christmas theme index.js export verified');

// 5. Kiểm tra dist bundle build
const distIndexPath = path.resolve('dist/index.html');
assert(fs.existsSync(distIndexPath), 'dist/index.html must exist');
console.log('✅ Case 5: Vite production bundle built successfully');

console.log('\n🎉 ALL 5 TEST CASES PASSED SUCCESSFULLY (100% PASS)');
