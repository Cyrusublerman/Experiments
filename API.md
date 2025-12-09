# 📖 Multifilament Image Print API Reference

Complete API documentation for the modular library.

---

## Table of Contents

- [Core Module](#core-module)
- [Grid Module](#grid-module)
- [Scan Module](#scan-module)
- [Quantize Module](#quantize-module)
- [STL Module](#stl-module)
- [Type Definitions](#type-definitions)

---

## Core Module

### Constants

#### `COLOURS`
Array of 72 pre-defined filament colors.

```javascript
import { COLOURS } from './lib/index.js';

console.log(COLOURS.length); // 72
console.log(COLOURS[0]);
// { h: "#FF7746", n: "Orange HF PETG" }
```

**Type**: `Array<{ h: string, n: string }>`
- `h`: Hex color code
- `n`: Color name

#### `DEFAULTS`
Default configuration values.

```javascript
import { DEFAULTS } from './lib/index.js';

console.log(DEFAULTS.bedW);      // 256
console.log(DEFAULTS.tileSize);  // 10
console.log(DEFAULTS.layerH);    // 0.08
```

**Type**: `Object`

---

### Utility Functions

#### `rgb_to_key(rgb)`
Convert RGB object to standardized string key.

**Critical for consistency** - Always use this when creating map keys!

```javascript
import { rgb_to_key } from './lib/index.js';

const key = rgb_to_key({ r: 255, g: 128, b: 64 });
console.log(key); // "255,128,64"

// Works with floating point
const key2 = rgb_to_key({ r: 255.7, g: 128.3, b: 64.1 });
console.log(key2); // "256,128,64" (rounded)
```

**Parameters**:
- `rgb` (Object): `{ r: number, g: number, b: number }`

**Returns**: `string` - Format: "r,g,b"

---

#### `hex2rgb(hex)`
Convert hex color to RGB object.

```javascript
import { hex2rgb } from './lib/index.js';

const rgb = hex2rgb('#FF8040');
console.log(rgb); // { r: 255, g: 128, b: 64 }

// Works without #
const rgb2 = hex2rgb('FF8040');
console.log(rgb2); // { r: 255, g: 128, b: 64 }
```

**Parameters**:
- `hex` (string): Hex color (with or without #)

**Returns**: `{ r: number, g: number, b: number }`

---

#### `rgb2hex(rgb)`
Convert RGB object to hex string.

```javascript
import { rgb2hex } from './lib/index.js';

const hex = rgb2hex({ r: 255, g: 128, b: 64 });
console.log(hex); // "#ff8040"
```

**Parameters**:
- `rgb` (Object): `{ r: number, g: number, b: number }`

**Returns**: `string` - Lowercase hex with #

---

#### `simColour(sequence, colours)`
Simulate final color from a layer sequence.

Uses color averaging: `RGB_result = average(layer_colors)`

```javascript
import { simColour } from './lib/index.js';

const sequence = [1, 2, 0, 0]; // Red on layer 0, Blue on layer 1
const colours = [
  { h: '#FF0000', n: 'Red' },
  { h: '#0000FF', n: 'Blue' }
];

const result = simColour(sequence, colours);
console.log(result); // { r: 128, g: 0, b: 128 } (purple)
```

**Parameters**:
- `sequence` (Array<number>): Layer sequence (1-indexed, 0 = empty)
- `colours` (Array<Object>): Color objects with `.h` property

**Returns**: `{ r: number, g: number, b: number }`

---

#### `findClosest(color, palette)`
Find closest color in palette using Euclidean distance.

```javascript
import { findClosest } from './lib/index.js';

const color = { r: 200, g: 100, b: 50 };
const palette = [
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 }
];

const closest = findClosest(color, palette);
console.log(closest); // { r: 255, g: 0, b: 0 } (red is closest)
```

**Parameters**:
- `color` (Object): Target color
- `palette` (Array<Object>): Available colors

**Returns**: `{ r: number, g: number, b: number }`

---

#### `parseGPL(text)`
Parse GIMP Palette (.gpl) file format.

```javascript
import { parseGPL } from './lib/index.js';

const gplText = `GIMP Palette
Name: MyPalette
255 0 0 Red
0 255 0 Green
0 0 255 Blue`;

const palette = parseGPL(gplText);
console.log(palette);
// [
//   { r: 255, g: 0, b: 0 },
//   { r: 0, g: 255, b: 0 },
//   { r: 0, g: 0, b: 255 }
// ]
```

**Parameters**:
- `text` (string): GPL file contents

**Returns**: `Array<{ r: number, g: number, b: number }>`

---

#### `generateGPL(palette, name)`
Generate GPL file content from palette.

```javascript
import { generateGPL } from './lib/index.js';

const palette = [
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 }
];

const gpl = generateGPL(palette, 'MyPalette');
console.log(gpl);
// GIMP Palette
// Name: MyPalette
// Columns: 8
// #
// 255 0 0 Color0
// 0 255 0 Color1
```

**Parameters**:
- `palette` (Array<Object>): Array of RGB colors
- `name` (string): Palette name (default: "Palette")

**Returns**: `string` - GPL format text

---

## Grid Module

### `generateSequences(N, M)`
Generate all valid layer sequences for N colors and M layers.

**Critical**: Only generates valid sequences (no gaps, no all-zeros).

```javascript
import { generateSequences } from './lib/index.js';

const sequences = generateSequences(4, 4);
console.log(sequences.length); // 340

// Examples of valid sequences:
// [1, 2, 0, 0] ✅ - Red, Blue, empty, empty
// [1, 1, 1, 1] ✅ - All red
// [2, 3, 4, 0] ✅ - Blue, Yellow, Magenta, empty

// Examples of INVALID sequences (won't be generated):
// [0, 0, 0, 0] ❌ - All empty
// [1, 0, 2, 0] ❌ - Gap (non-zero after zero)
// [0, 1, 2, 3] ❌ - Gap (empty at start)
```

**Parameters**:
- `N` (number): Number of colors/filaments
- `M` (number): Number of layers per tile

**Returns**: `Array<Array<number>>`
- Each sequence is an array of length M
- Values: 0 (empty) or 1-N (filament index)

**Formula**: `N × (N^M - 1) / (N - 1)` sequences

---

### `buildSequenceMap(sequences, colours, cols)`
Build RGB color to sequence lookup map.

**CRITICAL** for the entire workflow! This map enables pixel→layer expansion.

```javascript
import { buildSequenceMap, simColour } from './lib/index.js';

const sequences = [[1, 2, 0, 0], [2, 1, 0, 0]];
const colours = [
  { h: '#FF0000', n: 'Red' },
  { h: '#0000FF', n: 'Blue' }
];

const map = buildSequenceMap(sequences, colours, 18);

// Look up sequence by color
const color1 = simColour([1, 2, 0, 0], colours);
const key1 = rgb_to_key(color1);
const seqData = map.get(key1);

console.log(seqData);
// {
//   sequence: [1, 2, 0, 0],
//   colours: [...],
//   grid_position: { row: 0, col: 0, index: 0 }
// }
```

**Parameters**:
- `sequences` (Array<Array>): Generated sequences
- `colours` (Array<Object>): Color objects
- `cols` (number): Grid columns (for position calculation)

**Returns**: `Map<string, Object>`
- Key: RGB key from `rgb_to_key()`
- Value: `{ sequence, colours, grid_position: { row, col, index } }`

---

### `calculateGridLayout(params)`
Calculate optimal grid dimensions to fit sequences.

```javascript
import { calculateGridLayout } from './lib/index.js';

const layout = calculateGridLayout({
  sequenceCount: 340,
  tileSize: 10,
  gap: 1,
  maxWidth: 210,
  maxHeight: 297
});

console.log(layout);
// {
//   rows: 18,
//   cols: 19,
//   width: 208,
//   height: 197,
//   emptyCells: [340, 341, ..., 341],
//   fits: true,
//   error: null
// }
```

**Parameters**:
- `params.sequenceCount` (number): Number of sequences to fit
- `params.tileSize` (number): Tile size in mm
- `params.gap` (number): Gap between tiles in mm
- `params.maxWidth` (number): Maximum width constraint in mm
- `params.maxHeight` (number): Maximum height constraint in mm

**Returns**: `Object`
- `rows` (number): Grid rows
- `cols` (number): Grid columns
- `width` (number): Total width in mm
- `height` (number): Total height in mm
- `emptyCells` (Array<number>): Indices of empty cells
- `fits` (boolean): Whether sequences fit
- `error` (string|null): Error message if doesn't fit

---

### `drawGrid(canvas, gridData, options)`
Render calibration grid on canvas.

```javascript
import { drawGrid } from './lib/index.js';

const canvas = document.getElementById('myCanvas');
const gridData = {
  sequences: [[1,2,0,0], ...],
  colours: [...],
  rows: 18,
  cols: 19,
  tileSize: 10,
  gap: 1,
  width: 208,
  height: 197,
  emptyCells: [340, 341, ...]
};

const result = drawGrid(canvas, gridData, { scale: 1 });

console.log(result);
// {
//   cellSize: 50,
//   width: 950,
//   height: 900
// }
```

**Parameters**:
- `canvas` (HTMLCanvasElement): Canvas to draw on
- `gridData` (Object): Grid data object
- `options.scale` (number): Scale factor (default: 1)
- `options.cellSize` (number): Cell size in pixels (auto-calculated if omitted)

**Returns**: `Object`
- `cellSize` (number): Calculated cell size in pixels
- `width` (number): Canvas width
- `height` (number): Canvas height

**Features**:
- Renders colored tiles
- Draws empty cells with grey + X
- Uses darker borders (#666) to reduce bevel effect

---

### `exportGridSTLs(gridData, config)`
Export calibration grid as STL files.

**Generates**:
- Base layer STL (if baseLayers > 0)
- One STL per filament (all layers combined)

```javascript
import { exportGridSTLs } from './lib/index.js';

const stls = exportGridSTLs(gridData, {
  layerHeight: 0.08,
  baseLayers: 3,
  baseColorIndex: -1
});

console.log(Object.keys(stls));
// [
//   "base_white.stl",
//   "filament_0_Red_PLA.stl",
//   "filament_1_Blue_PLA.stl",
//   ...
// ]

// Download files
Object.entries(stls).forEach(([filename, content]) => {
  saveAs(new Blob([content], {type: 'text/plain'}), filename);
});
```

**Parameters**:
- `gridData` (Object): Grid data from `calculateGridLayout()`
- `config.layerHeight` (number): Layer height in mm
- `config.baseLayers` (number): Number of base layers
- `config.baseColorIndex` (number): Base color index (-1 for white)

**Returns**: `Object<string, string>`
- Keys: Filenames
- Values: STL file contents (ASCII format)

---

### `exportGridJSON(gridData, config)`
Export grid configuration as JSON.

```javascript
import { exportGridJSON } from './lib/index.js';

const json = exportGridJSON(gridData, {
  layers: 4,
  layerHeight: 0.08,
  baseLayers: 3
});

console.log(json);
// JSON string with grid configuration
```

**Parameters**:
- `gridData` (Object): Grid data
- `config` (Object): Configuration parameters

**Returns**: `string` - JSON string

---

### `importGridJSON(jsonString)`
Import grid configuration from JSON.

```javascript
import { importGridJSON } from './lib/index.js';

const { gridData, config } = importGridJSON(jsonString);

// Use imported data
drawGrid(canvas, gridData);
```

**Parameters**:
- `jsonString` (string): JSON string from `exportGridJSON()`

**Returns**: `Object`
- `gridData` (Object): Grid data object
- `config` (Object): Configuration parameters

---

## Scan Module

### `extractColors(canvas, gridData, alignment)`
Extract colors from scanned calibration grid.

Uses grid-aligned sampling (not random!).

```javascript
import { extractColors } from './lib/index.js';

const canvas = getScanCanvas(); // Canvas with scan image
const { palette, colorMap } = extractColors(canvas, gridData, {
  offsetX: 100,
  offsetY: 100,
  scaleX: 11.81,  // pixels per mm
  scaleY: 11.81
});

console.log(palette.length); // Number of unique colors
console.log(colorMap);       // Map with frequency data
```

**Parameters**:
- `canvas` (HTMLCanvasElement): Canvas with scan image
- `gridData` (Object): Grid data from generation
- `alignment` (Object): Alignment parameters
  - `offsetX` (number): X offset in pixels
  - `offsetY` (number): Y offset in pixels
  - `scaleX` (number): X scale (pixels per mm)
  - `scaleY` (number): Y scale (pixels per mm)

**Returns**: `Object`
- `palette` (Array<RGB>): Extracted colors sorted by frequency
- `colorMap` (Map): Color frequency map

**Samples**:
- 5×5 pixel area at center of each tile
- Averages colors for robustness
- Tracks duplicates and positions

---

### `autoCalculateScale(scanW, scanH, gridW, gridH, a4W, a4H)`
Calculate scale from A4 scan dimensions.

```javascript
import { autoCalculateScale } from './lib/index.js';

const scale = autoCalculateScale(
  2480,  // Scan width in pixels
  3508,  // Scan height in pixels
  200,   // Grid width in mm
  280    // Grid height in mm
  // A4 dimensions (210, 297) are defaults
);

console.log(scale);
// { scaleX: 11.81, scaleY: 11.81 }
```

**Parameters**:
- `scanWidth` (number): Scan image width in pixels
- `scanHeight` (number): Scan image height in pixels
- `gridWidth` (number): Grid width in mm
- `gridHeight` (number): Grid height in mm
- `a4Width` (number): A4 width in mm (default: 210)
- `a4Height` (number): A4 height in mm (default: 297)

**Returns**: `Object`
- `scaleX` (number): X scale (pixels per mm)
- `scaleY` (number): Y scale (pixels per mm)

---

## Quantize Module

### `quantizeImage(imageData, palette, options)`
Quantize image data to palette with dithering.

**Modifies imageData in place!**

```javascript
import { quantizeImage } from './lib/index.js';

// Get image data
const canvas = document.getElementById('artworkCanvas');
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// Quantize
quantizeImage(imageData, palette, {
  dither: true,
  mask: null  // Or result from applyMinDetailFilter
});

// Display result
ctx.putImageData(imageData, 0, 0);
```

**Parameters**:
- `imageData` (ImageData): Image data to quantize (**modified in place**)
- `palette` (Array<RGB>): Target color palette
- `options` (Object):
  - `dither` (boolean): Apply Floyd-Steinberg dithering (default: true)
  - `mask` (Uint8Array|null): Min-detail filter mask (default: null)

**Returns**: `ImageData` - Same object as input (modified)

**Features**:
- Finds closest color in palette for each pixel
- Distributes error to 4 neighbors (7/16, 3/16, 5/16, 1/16)
- Sets alpha based on mask (128 for filtered, 255 for kept)

---

### `applyMinDetailFilter(imageData, palette, minDetailMM, printWidth)`
Filter small isolated regions for printability.

```javascript
import { applyMinDetailFilter } from './lib/index.js';

const mask = applyMinDetailFilter(imageData, palette, 1.0, 170);

// Use mask in quantization
quantizeImage(imageData, palette, { dither: true, mask });
```

**Parameters**:
- `imageData` (ImageData): Image to analyze
- `palette` (Array<RGB>): Color palette
- `minDetailMM` (number): Minimum detail size in mm
- `printWidth` (number): Print width in mm

**Returns**: `Uint8Array`
- Length: width × height
- Values: 1 (keep pixel) or 0 (filter pixel)

**Algorithm**:
1. Convert min detail from mm to pixels
2. For each pixel, count similar neighbors in radius
3. Filter if < 50% of neighbors are same color

---

### `expandToLayers(imageData, sequenceMap, filamentCount)`
Expand quantized image to layer maps using sequence map.

**This is where the magic happens!** Uses the sequence map to convert pixels to layers.

```javascript
import { expandToLayers } from './lib/index.js';

const layerMaps = expandToLayers(
  quantizedImageData,
  sequenceMap,
  4  // 4 filaments
);

console.log(layerMaps.length);      // Number of layers (e.g., 4)
console.log(layerMaps[0].length);   // Number of filaments (4)
console.log(layerMaps[0][0].size);  // Number of pixels for filament 0, layer 0

// Access specific pixel
const hasPixel = layerMaps[2][1].has('100,50'); // Layer 2, Filament 1, pixel (100, 50)
```

**Parameters**:
- `imageData` (ImageData): Quantized image data
- `sequenceMap` (Map): Map from `buildSequenceMap()`
- `filamentCount` (number): Number of filaments

**Returns**: `Array<Array<Set>>`
- Dimensions: `[layer][filament]`
- Each Set contains "x,y" coordinate strings

**Algorithm**:
1. Find max layers needed from sequences
2. For each pixel:
   - Get RGB value
   - Look up sequence from `sequenceMap`
   - Expand sequence to layers
   - Add pixel to appropriate layer/filament sets

---

## STL Module

### `vectorizePixels(pixelSet, width, height)`
Convert pixel set to rectangles using greedy merging.

**Optimization**: Reduces STL file size dramatically!

```javascript
import { vectorizePixels } from './lib/index.js';

const pixelSet = new Set(['0,0', '1,0', '2,0', '0,1', '1,1', '2,1']);
// Pattern: 3×2 rectangle

const rectangles = vectorizePixels(pixelSet, 800, 600);

console.log(rectangles);
// [{ x: 0, y: 0, w: 3, h: 2 }]
// Merged 6 pixels into 1 rectangle!
```

**Parameters**:
- `pixelSet` (Set<string>): Set of "x,y" pixel coordinates
- `width` (number): Image width in pixels
- `height` (number): Image height in pixels

**Returns**: `Array<Object>`
- Each object: `{ x, y, w, h }`

**Algorithm** (Greedy):
1. Scan left-to-right, top-to-bottom
2. For each unprocessed pixel:
   - Expand horizontally as far as possible
   - Expand vertically while maintaining width
   - Mark all pixels as processed
   - Add rectangle to result

---

### `generateBox(x0, y0, z0, x1, y1, z1)`
Generate STL box geometry (12 triangular facets).

```javascript
import { generateBox } from './lib/index.js';

const stl = generateBox(0, 0, 0, 10, 10, 0.08);

console.log(stl);
// facet normal 0 0 -1
//   outer loop
//     vertex 0 0 0
//     vertex 10 0 0
//     vertex 10 10 0
//   endloop
// endfacet
// ...
```

**Parameters**:
- `x0, y0, z0` (number): Min corner (mm)
- `x1, y1, z1` (number): Max corner (mm)

**Returns**: `string` - ASCII STL facets

**Generates**: 12 facets (2 triangles per face, 6 faces)

---

### `exportArtworkSTLs(layerMaps, filamentNames, config)`
Export artwork as STL files.

**Generates**: One STL per filament (all layers combined)

```javascript
import { exportArtworkSTLs } from './lib/index.js';

const stls = exportArtworkSTLs(layerMaps, filamentNames, {
  imageWidth: 800,
  imageHeight: 600,
  printWidth: 170,
  layerHeight: 0.08
});

console.log(Object.keys(stls));
// [
//   "artwork_Red_PLA.stl",
//   "artwork_Blue_PLA.stl",
//   ...
// ]

// Download
Object.entries(stls).forEach(([filename, content]) => {
  saveAs(new Blob([content], {type: 'text/plain'}), filename);
});
```

**Parameters**:
- `layerMaps` (Array<Array<Set>>): From `expandToLayers()`
- `filamentNames` (Array<string>): Filament names
- `config` (Object):
  - `imageWidth` (number): Image width in pixels
  - `imageHeight` (number): Image height in pixels
  - `printWidth` (number): Print width in mm
  - `layerHeight` (number): Layer height in mm

**Returns**: `Object<string, string>`
- Keys: Filenames
- Values: ASCII STL contents

**Process**:
1. For each filament:
   - Combine all layers
   - Vectorize pixels to rectangles
   - Generate box geometry for each rectangle
   - Wrap in STL header/footer

---

## Type Definitions

### Color Object
```typescript
{
  h: string,  // Hex color (e.g., "#FF0000")
  n: string   // Name (e.g., "Red PLA")
}
```

### RGB Object
```typescript
{
  r: number,  // Red (0-255)
  g: number,  // Green (0-255)
  b: number   // Blue (0-255)
}
```

### Grid Data
```typescript
{
  sequences: Array<Array<number>>,
  colours: Array<ColorObject>,
  rows: number,
  cols: number,
  tileSize: number,
  gap: number,
  width: number,
  height: number,
  emptyCells: Array<number>
}
```

### Sequence Map Entry
```typescript
{
  sequence: Array<number>,
  colours: Array<ColorObject>,
  grid_position: {
    row: number,
    col: number,
    index: number
  }
}
```

---

## Complete Workflow Example

```javascript
import * as HFL from './lib/index.js';

// 1. GENERATE GRID
const colours = [HFL.COLOURS[42], HFL.COLOURS[43], HFL.COLOURS[44], HFL.COLOURS[45]];
const sequences = HFL.generateSequences(colours.length, 4);
const layout = HFL.calculateGridLayout({
  sequenceCount: sequences.length,
  tileSize: 10,
  gap: 1,
  maxWidth: 210,
  maxHeight: 297
});

const gridData = {
  sequences, colours,
  rows: layout.rows, cols: layout.cols,
  tileSize: 10, gap: 1,
  width: layout.width, height: layout.height,
  emptyCells: layout.emptyCells
};

const sequenceMap = HFL.buildSequenceMap(sequences, colours, layout.cols);

const gridStls = HFL.exportGridSTLs(gridData, {
  layerHeight: 0.08,
  baseLayers: 3,
  baseColorIndex: -1
});

// 2. ANALYZE SCAN
const scanCanvas = loadScanImage(); // Your implementation
const alignment = HFL.autoCalculateScale(
  scanCanvas.width,
  scanCanvas.height,
  gridData.width,
  gridData.height
);
alignment.offsetX = 100;
alignment.offsetY = 100;

const { palette } = HFL.extractColors(scanCanvas, gridData, alignment);

// 3. QUANTIZE ARTWORK
const artworkCanvas = loadArtwork(); // Your implementation
const ctx = artworkCanvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, artworkCanvas.width, artworkCanvas.height);

const mask = HFL.applyMinDetailFilter(imageData, palette, 1.0, 170);
HFL.quantizeImage(imageData, palette, { dither: true, mask });

const layerMaps = HFL.expandToLayers(imageData, sequenceMap, colours.length);

// 4. EXPORT ARTWORK
const artworkStls = HFL.exportArtworkSTLs(layerMaps, colours.map(c => c.n), {
  imageWidth: imageData.width,
  imageHeight: imageData.height,
  printWidth: 170,
  layerHeight: 0.08
});

// Download all files
[...Object.entries(gridStls), ...Object.entries(artworkStls)].forEach(([filename, content]) => {
  saveAs(new Blob([content], {type: 'text/plain'}), filename);
});
```

---

**See [`MODULAR_LIBRARY_README.md`](./MODULAR_LIBRARY_README.md) for more examples and guides.**
