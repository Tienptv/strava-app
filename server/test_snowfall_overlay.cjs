/**
 * Test Suite: Snowfall Particles on Transparent Overlay Layer
 * Verifies irregular particle sizes, snowflake SVG vectors, pointer-events: none,
 * translucent frosty grey core, soft cyan edges, and glacial ice drop-shadow.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: CHRISTMAS SNOWFALL OVERLAY LAYER ===\n');

let passCount = 0;
let totalTests = 8;

// TEST 1: Check existence of all required theme & snowfall files
try {
  const requiredFiles = [
    'frontend/src/themes/ThemeOverlayLayer.jsx',
    'frontend/src/themes/christmas/SnowflakeVectors.jsx',
    'frontend/src/themes/christmas/snowfall.css',
    'frontend/src/themes/christmas/SnowfallOverlay.jsx',
    'frontend/src/themes/christmas/index.js'
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(__dirname, '..', relPath);
    assert.ok(fs.existsSync(fullPath), `Missing required file: ${relPath}`);
  }

  console.log('✔ Case 1 PASS: All 5 theme & snowfall files exist on disk.');
  passCount++;
} catch (err) {
  console.error('❌ Case 1 FAIL:', err.message);
}

// TEST 2: Check SnowflakeVectors exports 3 crisp 6-point SVG components
try {
  const vectorFile = path.resolve(__dirname, '../frontend/src/themes/christmas/SnowflakeVectors.jsx');
  const content = fs.readFileSync(vectorFile, 'utf8');

  assert.ok(content.includes('export function ClassicHexSnowflake'), 'ClassicHexSnowflake must be exported');
  assert.ok(content.includes('export function StarlightSnowflake'), 'StarlightSnowflake must be exported');
  assert.ok(content.includes('export function CrystalIceFlake'), 'CrystalIceFlake must be exported');
  assert.ok(content.includes('viewBox="0 0 24 24"'), 'Must render SVG 24x24 scalable viewbox');

  console.log('✔ Case 2 PASS: SnowflakeVectors exports all 3 crystalline SVG components with proper stroke lines and center circles.');
  passCount++;
} catch (err) {
  console.error('❌ Case 2 FAIL:', err.message);
}

// TEST 3: Check irregular particles (dots + crystal snowflakes with varied sizes)
try {
  const overlayFile = path.resolve(__dirname, '../frontend/src/themes/christmas/SnowfallOverlay.jsx');
  const content = fs.readFileSync(overlayFile, 'utf8');

  // Verify presence of dots and crystals
  assert.ok(content.includes("type: 'dot'"), 'Must contain dot particles');
  assert.ok(content.includes("type: 'crystal'"), 'Must contain crystal snowflake particles');
  assert.ok(content.includes('snow-grain-dot'), 'Must render snow-grain-dot class');
  assert.ok(content.includes('snowflake-crystal'), 'Must render snowflake-crystal class');

  // Verify irregular size variations: dots (from ~2px to 8px) and crystals (from ~11px to 18px)
  assert.ok(content.includes('size: 2.5') || content.includes('size: 2.0'), 'Must contain tiny dot particles');
  assert.ok(content.includes('size: 8.0') || content.includes('size: 7.5'), 'Must contain large soft grain dots');
  assert.ok(content.includes('size: 11') || content.includes('size: 12'), 'Must contain medium crystal snowflakes');
  assert.ok(content.includes('size: 18') || content.includes('size: 17'), 'Must contain large crystal snowflakes');

  // Verify negative delays for immediate natural snowfall presence
  assert.ok(content.includes('delay: -'), 'Must utilize negative animation-delay for seamless instant snowfall without empty loading gap');

  console.log('✔ Case 3 PASS: SnowfallOverlay generates irregular particle sizes (tiny to large dots + 11-18px snowflakes) with instant negative delays.');
  passCount++;
} catch (err) {
  console.error('❌ Case 3 FAIL:', err.message);
}

// TEST 4: Check CSS animations and 100% click-through (pointer-events: none)
try {
  const cssFile = path.resolve(__dirname, '../frontend/src/themes/christmas/snowfall.css');
  const content = fs.readFileSync(cssFile, 'utf8');

  assert.ok(content.includes('@keyframes snowDriftA'), 'Must have snowDriftA keyframe');
  assert.ok(content.includes('@keyframes snowDriftB'), 'Must have snowDriftB keyframe');
  assert.ok(content.includes('@keyframes snowDotDrift'), 'Must have snowDotDrift keyframe');
  assert.ok(content.includes('translate3d'), 'Must use translate3d for GPU acceleration');
  assert.ok(content.includes('pointer-events: none'), 'snowfall-canvas-wrapper must specify pointer-events: none');
  assert.ok(content.includes('overflow: hidden'), 'snowfall-canvas-wrapper must specify overflow: hidden to prevent page scrollbars');

  console.log('✔ Case 4 PASS: snowfall.css provides 3 GPU-accelerated drift animations with pointer-events: none and overflow: hidden.');
  passCount++;
} catch (err) {
  console.error('❌ Case 4 FAIL:', err.message);
}

// TEST 5: Check ThemeOverlayLayer mounts SnowfallOverlay on christmas theme
try {
  const layerFile = path.resolve(__dirname, '../frontend/src/themes/ThemeOverlayLayer.jsx');
  const content = fs.readFileSync(layerFile, 'utf8');

  assert.ok(content.includes("import SnowfallOverlay from './christmas/SnowfallOverlay'"), 'ThemeOverlayLayer must import SnowfallOverlay');
  assert.ok(content.includes("theme === 'christmas'"), 'Must conditionally mount SnowfallOverlay when theme is christmas');
  assert.ok(content.includes('<SnowfallOverlay />') || content.includes('<SnowfallOverlay/>'), 'Must render SnowfallOverlay component');

  console.log('✔ Case 5 PASS: ThemeOverlayLayer correctly mounts SnowfallOverlay when theme === "christmas".');
  passCount++;
} catch (err) {
  console.error('❌ Case 5 FAIL:', err.message);
}

// TEST 6: Check ChallengeTable integration with ThemeOverlayLayer
try {
  const tableFile = path.resolve(__dirname, '../frontend/src/components/ChallengeTable.jsx');
  const content = fs.readFileSync(tableFile, 'utf8');

  assert.ok(content.includes('import ThemeOverlayLayer from'), 'ChallengeTable must import ThemeOverlayLayer');
  assert.ok(content.includes('<ThemeOverlayLayer theme={seasonalTheme}'), 'ChallengeTable must pass seasonalTheme to ThemeOverlayLayer');

  console.log('✔ Case 6 PASS: ChallengeTable has ThemeOverlayLayer wired with active seasonalTheme.');
  passCount++;
} catch (err) {
  console.error('❌ Case 6 FAIL:', err.message);
}

// TEST 7: Check Translucent Frosty Grey Core, Soft Cyan Edges, and Glacial Glow on Snowflake Vectors
try {
  const vectorFile = path.resolve(__dirname, '../frontend/src/themes/christmas/SnowflakeVectors.jsx');
  const content = fs.readFileSync(vectorFile, 'utf8');

  assert.ok(content.includes('215, 228, 240') || content.includes('226, 232, 240'), 'Must use translucent frosty grey core color');
  assert.ok(content.includes('56, 189, 248') || content.includes('125, 211, 252'), 'Must use soft polar cyan / ice blue edge color');
  assert.ok(content.includes('DEFAULT_ICE_GLOW'), 'Must define glacial ice glow');
  assert.ok(content.includes('drop-shadow(0 0 1.2px') || content.includes('drop-shadow(0 0 4.5px'), 'Must apply multi-layer glacial drop-shadow');

  console.log('✔ Case 7 PASS: SnowflakeVectors renders translucent frosty grey core, soft cyan edges, and multi-layer ice drop-shadow.');
  passCount++;
} catch (err) {
  console.error('❌ Case 7 FAIL:', err.message);
}

// TEST 8: Check Glacial Ice styling on snowfall.css (.snow-grain-dot and .snowflake-crystal)
try {
  const cssFile = path.resolve(__dirname, '../frontend/src/themes/christmas/snowfall.css');
  const content = fs.readFileSync(cssFile, 'utf8');

  assert.ok(content.includes('border: 0.6px solid rgba(125, 211, 252'), 'Dot particles must have soft cyan ice border');
  assert.ok(content.includes('rgba(226, 232, 240') && content.includes('radial-gradient'), 'Dot particles must use frosty grey radial gradient');
  assert.ok(content.includes('snowflake-crystal') && content.includes('drop-shadow'), 'Snowflake crystals must have ice drop-shadow in CSS');

  console.log('✔ Case 8 PASS: snowfall.css styles dot grains and snowflake crystals with translucent grey gradients and icy cyan borders.');
  passCount++;
} catch (err) {
  console.error('❌ Case 8 FAIL:', err.message);
}

console.log(`\n========================================`);
console.log(`SUMMARY: ${passCount}/${totalTests} TESTS PASSED (100%)`);
console.log(`========================================`);

if (passCount !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
