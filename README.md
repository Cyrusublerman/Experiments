# 🎨 HueForge-Lite

**Multi-Color FDM Printing Workflow** - Generate calibration grids, analyze scans, and convert artwork to multi-color 3D prints.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Modular](https://img.shields.io/badge/Architecture-Modular-green.svg)](#library-structure)

---

## 🚀 Quick Start

### Try it on CodePen (No Installation!)
1. Open [`codepen.html`](./codepen.html)
2. Copy the entire file
3. Paste into [CodePen](https://codepen.io)
4. Start creating multi-color prints!

### Use Locally
```bash
# Clone the repository
git clone https://github.com/Cyrusublerman/Experiments.git
cd Experiments

# Start a local server (required for ES modules)
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/app-modular.html
```

---

## 📋 What is HueForge-Lite?

HueForge-Lite is a complete workflow for creating multi-color FDM (Fused Deposition Modeling) 3D prints using **filament swapping** and **color mixing** through layering.

### The Process:

**1. Generate Calibration Grid**
- Select 2-10 filament colors
- Generate all possible layer sequences (e.g., 340 sequences for 4 colors, 4 layers)
- Export STL files for 3D printing

**2. Scan & Analyze**
- Print and scan the calibration grid
- Extract actual colors from scan
- Build color palette

**3. Quantize Artwork**
- Upload artwork image
- Quantize to calibration colors
- Apply dithering and filters
- Export ready-to-print STL files

---

## 🎯 Key Features

✅ **Valid Sequence Generation** - No gaps, proper validation
✅ **RGB→Sequence Mapping** - Critical for workflow
✅ **Grid-Aligned Color Extraction** - Accurate sampling
✅ **Floyd-Steinberg Dithering** - Professional quality
✅ **Min-Detail Spatial Filter** - Printability optimization
✅ **GPL Palette Support** - GIMP palette import/export
✅ **Greedy Vectorization** - Optimized STL generation
✅ **Modular Architecture** - Clean, reusable code
✅ **Zero Dependencies** - Pure vanilla JavaScript
✅ **Works on CodePen** - No build step needed

---

## 📁 Repository Structure

```
Experiments/
├── lib/                          # Modular Library (1,778 lines)
│   ├── core/                     # Core utilities
│   │   ├── constants.js          # 72-color palette
│   │   ├── utils.js              # Helper functions
│   │   └── state.js              # State management
│   ├── grid/                     # Grid generation
│   │   ├── sequences.js          # Sequence generation
│   │   ├── layout.js             # Layout calculation
│   │   ├── visualization.js      # Canvas rendering
│   │   └── export.js             # STL/JSON export
│   ├── scan/                     # Scan analysis
│   │   └── index.js              # Color extraction
│   ├── quantize/                 # Image processing
│   │   └── index.js              # Quantization & dithering
│   ├── stl/                      # STL generation
│   │   └── index.js              # Vectorization & export
│   └── index.js                  # Main exports
│
├── app-modular.html              # Vanilla JS app (587 lines)
├── codepen.html                  # CodePen version (800 lines)
│
├── js/                           # Original modular code
├── svg-to-stl-reference/         # Reference implementation
│
├── MODULAR_LIBRARY_README.md     # Library documentation
├── IMAGETO3D_GEM_AUDIT.md        # Technical audit
└── README.md                     # This file
```

---

## 💻 Usage Examples

### Import the Library

```html
<!-- Using Import Maps -->
<script type="importmap">
{
  "imports": {
    "./lib/index.js": "https://cdn.jsdelivr.net/gh/Cyrusublerman/Experiments@main/lib/index.js"
  }
}
</script>

<script type="module">
import * as HFL from './lib/index.js';

// Use the library
const sequences = HFL.generateSequences(4, 4); // 4 colors, 4 layers
console.log(`Generated ${sequences.length} sequences`); // 340
</script>
```

### Generate a Calibration Grid

```javascript
import {
  COLOURS,
  generateSequences,
  buildSequenceMap,
  calculateGridLayout,
  drawGrid,
  exportGridSTLs
} from './lib/index.js';

// Select colors
const selectedColors = [
  COLOURS[42], // Red
  COLOURS[43], // Cyan
  COLOURS[44], // Magenta
  COLOURS[45]  // Yellow
];

// Generate sequences
const sequences = generateSequences(selectedColors.length, 4);

// Calculate layout
const layout = calculateGridLayout({
  sequenceCount: sequences.length,
  tileSize: 10,
  gap: 1,
  maxWidth: 210,
  maxHeight: 297
});

// Build grid data
const gridData = {
  sequences,
  colours: selectedColors,
  rows: layout.rows,
  cols: layout.cols,
  tileSize: 10,
  gap: 1,
  width: layout.width,
  height: layout.height,
  emptyCells: layout.emptyCells
};

// Build sequence map (CRITICAL!)
const sequenceMap = buildSequenceMap(sequences, selectedColors, layout.cols);

// Draw on canvas
const canvas = document.getElementById('myCanvas');
drawGrid(canvas, gridData, { scale: 1 });

// Export STLs
const stls = exportGridSTLs(gridData, {
  layerHeight: 0.08,
  baseLayers: 3,
  baseColorIndex: -1
});

// Download files
Object.entries(stls).forEach(([filename, content]) => {
  saveAs(new Blob([content], {type: 'text/plain'}), filename);
});
```

### Quantize an Image

```javascript
import {
  quantizeImage,
  applyMinDetailFilter,
  expandToLayers,
  exportArtworkSTLs
} from './lib/index.js';

// Load image
const img = new Image();
img.onload = () => {
  // Get image data
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply min-detail filter
  const mask = applyMinDetailFilter(imageData, palette, 1.0, 170);

  // Quantize with dithering
  quantizeImage(imageData, palette, { dither: true, mask });

  // Expand to layers using sequence map
  const layerMaps = expandToLayers(imageData, sequenceMap, selectedColors.length);

  // Export artwork STLs
  const stls = exportArtworkSTLs(layerMaps, filamentNames, {
    imageWidth: imageData.width,
    imageHeight: imageData.height,
    printWidth: 170,
    layerHeight: 0.08
  });

  // Download
  Object.entries(stls).forEach(([filename, content]) => {
    saveAs(new Blob([content], {type: 'text/plain'}), filename);
  });
};
img.src = 'artwork.png';
```

---

## 🎨 Available Applications

### 1. CodePen Version (`codepen.html`)
- **Best for:** Quick testing, sharing, demos
- **Features:** Single file, imports from GitHub CDN
- **Setup:** Copy/paste into CodePen
- **Beautiful UI:** Purple gradient theme

### 2. Vanilla JS App (`app-modular.html`)
- **Best for:** Local development
- **Features:** Clean vanilla JS, no frameworks
- **Setup:** Requires local server
- **Lightweight:** 587 lines total

### 3. Original Modular App (`index.html` + `js/`)
- **Best for:** Reference implementation
- **Features:** ES6 modules, documented
- **Setup:** Requires local server
- **Production-ready:** Used as library source

---

## 🔧 Library API

### Core Functions

#### `generateSequences(N, M)`
Generate valid layer sequences for N colors and M layers.
```javascript
const sequences = generateSequences(4, 4); // Returns 340 valid sequences
```

#### `buildSequenceMap(sequences, colours, cols)`
Build RGB→sequence lookup map (CRITICAL for workflow).
```javascript
const sequenceMap = buildSequenceMap(sequences, colours, cols);
// Use later to expand pixels to layers
```

#### `rgb_to_key(rgb)`
Standardize RGB values for consistent map lookups.
```javascript
const key = rgb_to_key({ r: 255, g: 128, g: 64 }); // "255,128,64"
```

### Grid Module

#### `calculateGridLayout(params)`
Calculate optimal grid dimensions.
```javascript
const layout = calculateGridLayout({
  sequenceCount: 340,
  tileSize: 10,
  gap: 1,
  maxWidth: 210,
  maxHeight: 297
});
// Returns: { rows, cols, width, height, emptyCells, fits }
```

#### `drawGrid(canvas, gridData, options)`
Render grid on canvas.
```javascript
drawGrid(canvas, gridData, { scale: 1 });
```

#### `exportGridSTLs(gridData, config)`
Export calibration grid as STL files.
```javascript
const stls = exportGridSTLs(gridData, {
  layerHeight: 0.08,
  baseLayers: 3,
  baseColorIndex: -1
});
// Returns: { "filament_0_Red.stl": "...", "filament_1_Blue.stl": "...", ... }
```

### Scan Module

#### `extractColors(canvas, gridData, alignment)`
Extract colors from scanned grid.
```javascript
const { palette } = extractColors(canvas, gridData, {
  offsetX: 100,
  offsetY: 100,
  scaleX: 1.0,
  scaleY: 1.0
});
```

#### `autoCalculateScale(scanW, scanH, gridW, gridH)`
Calculate scale from A4 scan dimensions.
```javascript
const alignment = autoCalculateScale(2480, 3508, 200, 280);
// Returns: { scaleX, scaleY }
```

### Quantize Module

#### `quantizeImage(imageData, palette, options)`
Quantize image to palette.
```javascript
quantizeImage(imageData, palette, {
  dither: true,
  mask: null  // Or result from applyMinDetailFilter
});
```

#### `applyMinDetailFilter(imageData, palette, minDetailMM, printWidth)`
Filter small isolated regions.
```javascript
const mask = applyMinDetailFilter(imageData, palette, 1.0, 170);
```

#### `expandToLayers(imageData, sequenceMap, filamentCount)`
Expand pixels to layer maps.
```javascript
const layerMaps = expandToLayers(imageData, sequenceMap, 4);
// Returns: [layer][filament] = Set of "x,y" coordinates
```

### STL Module

#### `vectorizePixels(pixelSet, width, height)`
Convert pixels to rectangles using greedy merging.
```javascript
const rectangles = vectorizePixels(pixelSet, 800, 600);
// Returns: [{ x, y, w, h }, ...]
```

#### `exportArtworkSTLs(layerMaps, filamentNames, config)`
Export artwork as STL files.
```javascript
const stls = exportArtworkSTLs(layerMaps, filamentNames, {
  imageWidth: 800,
  imageHeight: 600,
  printWidth: 170,
  layerHeight: 0.08
});
```

---

## 🐛 Bug Fixes (vs Original)

This modular library fixes critical issues found in `Imageto3D Gem.html`:

| Issue | Original | Fixed |
|-------|----------|-------|
| Sequence Generation | Allows gaps (e.g., `[1,0,2,0]`) | ✅ Validates sequences |
| Sequence Map | Missing entirely | ✅ RGB→sequence lookup |
| Scan Analysis | Random pixel sampling | ✅ Grid-aligned extraction |
| Dithering | 1 neighbor (crude) | ✅ Floyd-Steinberg (4 neighbors) |
| Min-Detail | None | ✅ Spatial analysis |
| STL Export | Mock (empty buffer) | ✅ Proper geometry |
| Vectorization | None | ✅ Greedy rectangle merging |

**See [`IMAGETO3D_GEM_AUDIT.md`](./IMAGETO3D_GEM_AUDIT.md) for full analysis.**

---

## 📚 Documentation

- **[MODULAR_LIBRARY_README.md](./MODULAR_LIBRARY_README.md)** - Complete library guide with usage examples
- **[IMAGETO3D_GEM_AUDIT.md](./IMAGETO3D_GEM_AUDIT.md)** - Technical audit of broken code
- **[image-to-stl-process.md](./image-to-stl-process.md)** - Detailed workflow explanation

---

## 🛠️ Development

### Requirements
- Modern browser with ES6 module support
- Local server for development (Python, Node, etc.)

### Setup
```bash
# Clone repo
git clone https://github.com/Cyrusublerman/Experiments.git
cd Experiments

# Start server
python3 -m http.server 8000

# Open in browser
http://localhost:8000/app-modular.html
```

### Project Structure
- **`lib/`** - Modular library (source of truth)
- **`js/`** - Original implementation (reference)
- **`app-modular.html`** - Vanilla JS application
- **`codepen.html`** - CodePen version

---

## 🤝 Contributing

Contributions welcome! Please:

1. Check existing issues
2. Fork the repository
3. Create a feature branch
4. Make your changes
5. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

Built using:
- **FileSaver.js** - Client-side file saving
- **Space Mono** - Google Fonts

Reference implementations:
- **svg-to-stl** - SVG to STL conversion reference

---

## 🔗 Links

- **GitHub Repository**: https://github.com/Cyrusublerman/Experiments
- **CodePen Demo**: [Paste codepen.html](https://codepen.io)
- **Documentation**: See [`MODULAR_LIBRARY_README.md`](./MODULAR_LIBRARY_README.md)

---

## 💡 Tips

### For Best Results:
1. **Calibration Grid**: Print at 0.08mm layer height for best color mixing
2. **Scanning**: Use flatbed scanner at 300+ DPI
3. **Artwork**: Start with simple, high-contrast images
4. **Colors**: Select colors with good contrast for better results

### Common Issues:
- **Sequences won't fit**: Reduce tile size or increase bed dimensions
- **Scan extraction fails**: Check grid alignment and scale
- **STL files empty**: Ensure grid was generated first

---

**Happy Printing! 🎨🖨️**
