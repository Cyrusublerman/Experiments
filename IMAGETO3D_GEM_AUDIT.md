# Imageto3D Gem.html - Comprehensive Audit & Refactor Plan

## Executive Summary

**Status:** 🔴 **BROKEN** - The layout is correct but most core functions are non-functional or mock implementations.

**The Good:**
- ✅ Excellent Alpine.js reactive UI with clean 5-tab workflow
- ✅ Great visual design with Space Mono font and professional styling
- ✅ Proper state management structure with Alpine.js
- ✅ Responsive canvas zoom/pan/drag system
- ✅ Good UX with debounced regeneration and real-time updates

**The Bad:**
- ❌ Grid generation creates INVALID sequences (includes gaps and all-zeros)
- ❌ Scan analysis extracts RANDOM colors (completely useless)
- ❌ Raster quantization is too simplistic (crude dithering, no min-detail filter)
- ❌ 3D model generation is FAKE (random height map)
- ❌ STL export is MOCK (empty binary buffer)
- ❌ No sequence mapping with RGB keys (critical workflow component missing)
- ❌ Missing GPL palette import/export
- ❌ Missing proper vectorization (greedy rectangle merging)
- ❌ Missing SVG to STL conversion integration

---

## Detailed Function-by-Function Analysis

### 1. Grid Generation (Lines 354-396)

#### Problems:

**Line 354-358: `generateSequences(N, M)` - BROKEN**
```javascript
generateSequences(N, M) {
    let seqs = [];
    function gen(cur, d) {
        if(d===M) {
            if(!cur.every(v=>v===0)) seqs.push([...cur]); // WRONG: Still allows gaps!
            return;
        }
        for(let v=0;v<=N;v++) gen([...cur,v],d+1); // WRONG: Generates invalid sequences
    }
    gen([],0);
    return seqs;
}
```

**Issues:**
- Generates sequences with GAPS (e.g., `[1, 0, 2, 0]` - invalid!)
- Only rejects all-zeros, but allows other invalid patterns
- For N=4, M=4, generates ~340 sequences, but many are INVALID

**Correct Implementation (from js/grid.js:16-47):**
```javascript
function generateSequences(N, M) {
    const seqs = [];

    function isValid(s) {
        // Reject all-empty sequences
        if (s.every(v => v === 0)) return false;
        // Reject sequences with gaps (non-zero after zero)
        let z = false;
        for (let v of s) {
            if (v === 0) z = true;
            else if (z) return false; // GAP DETECTED!
        }
        return true;
    }

    function gen(cur, d) {
        if (d === M) {
            if (isValid(cur)) seqs.push([...cur]);
            return;
        }
        // CRITICAL: Once we hit zero, only allow zeros
        if (cur.length > 0 && cur[cur.length - 1] === 0) {
            gen([...cur, 0], d + 1);
        } else {
            for (let v = 0; v <= N; v++) {
                gen([...cur, v], d + 1);
            }
        }
    }

    gen([], 0);
    return seqs;
}
```

**Line 365-382: `generateGrid()` - INCOMPLETE**
```javascript
generateGrid() {
    if(this.selectedFilaments.length < 2) return;
    const seqs = this.generateSequences(this.selectedFilaments.length, this.config.layers);
    // ... layout calculation is OK ...
    this.gridData = {
        seqs, rows:gRows, cols:gCols,
        width: gCols*step-this.config.gap,
        height: gRows*step-this.config.gap
    };
    // MISSING: empty_cells tracking (critical!)
    // MISSING: sequence map with RGB keys (critical!)
    // MISSING: click handler setup
    this.drawGridCanvas();
}
```

**Missing Critical Features:**
1. **Empty Cells Tracking** - needed to mark unused grid positions
2. **Sequence Map with RGB Keys** - THE MOST CRITICAL missing piece:
```javascript
// FROM js/grid.js:128-142 - ABSOLUTELY ESSENTIAL!
sequences.clear();
grid.seqs.forEach((seq, idx) => {
    const colour = simColour(seq, grid.colours);
    const key = rgb_to_key(colour);  // CRITICAL: standardized RGB key
    sequences.set(key, {
        sequence: seq,
        colours: grid.colours,
        grid_position: {
            row: Math.floor(idx / grid.cols),
            col: idx % grid.cols,
            index: idx
        }
    });
});
```

This sequence map is **CRITICAL** because:
- It maps RGB colors back to filament sequences
- Used during image quantization to expand pixels into layers
- Without it, the entire workflow breaks!

3. **Click Handler** - no interactive tile inspection

**Line 383-396: `drawGridCanvas()` - INCOMPLETE**
```javascript
drawGridCanvas() {
    // Drawing logic is OK but...
    // MISSING: Empty cell visualization (grey + X)
    // MISSING: Click handler for tile inspection
    // MISSING: Sequence popup
}
```

#### Fix Plan:
- ✅ Replace `generateSequences()` with validated version from `js/grid.js`
- ✅ Add empty cells tracking to `generateGrid()`
- ✅ **BUILD SEQUENCE MAP** with `rgb_to_key()` standardization
- ✅ Add `setupGridClick()` handler from `js/grid.js:223-276`
- ✅ Add `showSequencePopup()` for tile inspection
- ✅ Update `drawGrid()` to render empty cells with grey + X

---

### 2. Scan Analysis (Lines 400-430)

#### Problems:

**Line 419-430: `analyzeScan()` - COMPLETELY USELESS**
```javascript
analyzeScan() {
    const s = this.scans[this.activeScanIdx];
    const ctx = this.$refs.scanCanvas.getContext('2d');
    this.extractedPalette = [];
    for(let i=0; i<10; i++) {
        // WRONG: Extracts RANDOM pixels - completely useless!
        const d = ctx.getImageData(Math.random()*s.img.width, Math.random()*s.img.height, 1, 1).data;
        this.extractedPalette.push({r:d[0],g:d[1],b:d[2]});
    }
    this.raster.pal = this.extractedPalette;
    alert("Extracted " + this.extractedPalette.length + " colors.");
}
```

**Issues:**
- Extracts colors from RANDOM locations (useless!)
- Should extract from **ALIGNED GRID TILES**
- Should use grid overlay to sample correct positions
- Should handle duplicates and sort by frequency

**Correct Implementation (from js/scan.js):**
```javascript
export function analyseScan() {
    if (!grid || !scan.img) return;

    const canvas = document.getElementById('scanCanvas');
    const ctx = canvas.getContext('2d');

    const extracted = [];
    const colourMap = new Map();

    // Sample from each grid tile position
    for (let i = 0; i < grid.seqs.length; i++) {
        const row = Math.floor(i / grid.cols);
        const col = i % grid.cols;

        // Calculate sample position in scan coordinates
        const gridX = col * (grid.tile + grid.gap) + grid.tile / 2;
        const gridY = row * (grid.tile + grid.gap) + grid.tile / 2;

        // Transform to scan coordinates
        const scanX = gridX * scanView.scaleX + scanView.offsetX;
        const scanY = gridY * scanView.scaleY + scanView.offsetY;

        // Sample 5x5 area and average
        const avgColour = sampleArea(ctx, scanX, scanY, 5);
        const key = rgb_to_key(avgColour);

        if (!colourMap.has(key)) {
            colourMap.set(key, {
                colour: avgColour,
                count: 1,
                positions: [i]
            });
        } else {
            const entry = colourMap.get(key);
            entry.count++;
            entry.positions.push(i);
        }
    }

    // Convert to palette
    const palette = Array.from(colourMap.values())
        .map(e => e.colour)
        .sort((a, b) => colourMap.get(rgb_to_key(b)).count - colourMap.get(rgb_to_key(a)).count);

    setPalette(palette);
}
```

#### Fix Plan:
- ✅ Replace `analyzeScan()` with proper grid-aligned sampling
- ✅ Add area averaging for robust color extraction
- ✅ Add duplicate detection and frequency sorting
- ✅ Add visual feedback showing sampled tile positions

---

### 3. Image Quantization (Lines 432-465)

#### Problems:

**Line 443-462: `processRaster()` - TOO SIMPLISTIC**
```javascript
processRaster() {
    const cvs=this.$refs.procCanvas;
    const ctx=cvs.getContext('2d');
    cvs.width=this.procImg.width;
    cvs.height=this.procImg.height;
    ctx.drawImage(this.procImg,0,0);
    const id=ctx.getImageData(0,0,cvs.width,cvs.height);
    const d=id.data;
    const pal = this.raster.pal.length ? this.raster.pal : [{r:0,g:0,b:0},{r:255,g:255,b:255}];

    for(let i=0; i<d.length; i+=4) {
        const n = (Math.random()-0.5) * this.raster.noise; // Random noise - crude
        const r=d[i]+n, g=d[i+1]+n, b=d[i+2]+n;
        let min=Infinity, c=pal[0];
        for(let p of pal) {
            const dst=(r-p.r)**2+(g-p.g)**2+(b-p.b)**2;
            if(dst<min){min=dst;c=p;}
        }
        // WRONG: Crude dithering - doesn't distribute to correct neighbors
        if(this.raster.dither==='floyd'){
            const er=r-c.r, eg=g-c.g, eb=b-c.b;
            if((i+4)<d.length) {
                d[i+4]+=er*0.5; d[i+5]+=eg*0.5; d[i+6]+=eb*0.5;
            }
        }
        d[i]=c.r; d[i+1]=c.g; d[i+2]=c.b;
    }
    this.processedData = id;
    this.toggleProcView('res');
}
```

**Issues:**
- No min-detail filtering (critical for printability!)
- Dithering only distributes to right pixel (should use Floyd-Steinberg matrix)
- No GPL palette import
- Doesn't build filament layer previews
- Doesn't use the sequence map for layer expansion

**Correct Implementation (from js/quantize.js:162-224):**
```javascript
export function quantiseImage() {
    // ... setup ...

    const maxC = +document.getElementById('maxColours').value;
    const palette = usePalette.slice(0, maxC);
    const dither = document.getElementById('dither').checked;
    const applyMin = document.getElementById('applyMinDetail').checked;

    const imgData = octx.getImageData(0, 0, oc.width, oc.height);
    const mask = applyMin ? applyMinDetailFilter(imgData, palette) : null;
    quantiseData(imgData, palette, dither, mask);

    // ... then CRITICAL: Generate print files using sequence map ...
    generatePrintFiles();
}

function generatePrintFiles() {
    const {result, width, height} = quant;
    const layers = [];

    sel.forEach((colIdx, i) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const layerData = ctx.createImageData(width, height);

        for (let p = 0; p < result.data.length; p += 4) {
            const pixelRGB = {
                r: result.data[p],
                g: result.data[p + 1],
                b: result.data[p + 2]
            };
            const key = rgb_to_key(pixelRGB);  // CRITICAL!
            const seqData = sequences.get(key); // Lookup in sequence map

            if (seqData) {
                // Expand sequence to find which layers use this filament
                for (let li = 0; li < seqData.sequence.length; li++) {
                    if (seqData.sequence[li] === i + 1) {
                        layerData.data[p] = result.data[p];
                        layerData.data[p + 1] = result.data[p + 1];
                        layerData.data[p + 2] = result.data[p + 2];
                        layerData.data[p + 3] = 255;
                        break;
                    }
                }
            }
        }

        layers.push({
            name: `Filament_${COLOURS[colIdx].n}`,
            canvas: canvas,
            colour: COLOURS[colIdx]
        });
    });

    displayFilamentLayers(layers);
}
```

#### Fix Plan:
- ✅ Add min-detail filter with spatial analysis
- ✅ Implement proper Floyd-Steinberg dithering (distribute to 4 neighbors with 7/16, 3/16, 5/16, 1/16)
- ✅ Add GPL palette import/export
- ✅ Build filament layer previews using sequence map
- ✅ Add layer-by-layer visualization

---

### 4. 3D Model Generation (Lines 468-492)

#### Problems:

**Line 479-492: `generateModel()` - COMPLETELY FAKE**
```javascript
generateModel() {
    if(!this.processedData && this.model.source==='raster') return alert("No raster data");
    if(this.three.mesh) this.three.scene.remove(this.three.mesh);

    const w=200, h=200; // Resample
    const geo = new THREE.PlaneGeometry(150, 150, w-1, h-1);
    const pos = geo.attributes.position;
    // WRONG: Random height map - completely useless!
    for(let i=0; i<pos.count; i++) {
        pos.setZ(i, this.model.minH + Math.random()*(this.model.maxH-this.model.minH));
    }
    geo.computeVertexNormals();
    this.three.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0xcccccc, flatShading:!this.model.smoothing}));
    this.three.scene.add(this.three.mesh);
    this.meshReady = true;
}
```

**Issues:**
- Creates RANDOM height map (useless!)
- Should use actual image data to create height map
- Or better yet, use proper STL generation from vectorized layers

**Better Approach:**
Don't generate a 3D preview mesh at all. Instead:
1. Use the **artwork STL export** from `js/artwork-stl.js`
2. Generate one STL per filament (all layers combined)
3. Use proper vectorization (greedy rectangle merging)
4. Export ready-to-print ASCII STL files

#### Fix Plan:
- ✅ Remove fake 3D model generation
- ✅ Replace with proper artwork STL generation from `js/artwork-stl.js`
- ✅ Use greedy rectangle vectorization
- ✅ Generate proper ASCII STL with correct facets

---

### 5. STL Export (Lines 494-503)

#### Problems:

**Line 495-503: `runExport()` - MOCK IMPLEMENTATION**
```javascript
runExport() {
    if(!this.three.mesh) return;
    const count = this.three.mesh.geometry.attributes.position.count;
    const buf = new ArrayBuffer(84 + count*50);
    const dv = new DataView(buf);
    dv.setUint32(80, count/3, true);
    // Mock write - doesn't actually write STL data!
    saveAs(new Blob([buf], {type:'application/octet-stream'}), 'model.stl');
}
```

**Issues:**
- Creates empty binary buffer (no actual STL data!)
- Should generate proper ASCII or binary STL
- Should generate one STL per filament (like grid export)

**Correct Implementation (from js/artwork-stl.js:13-130):**
```javascript
export function exportArtworkSTLs() {
    // Calculate dimensions
    const printW = +document.getElementById('printW').value;
    const imgW = quant.width;
    const imgH = quant.height;
    const printH = printW * (imgH / imgW);
    const pixelSize = printW / imgW;
    const layerH = +document.getElementById('layerH').value;

    // Build layer maps: layerMaps[layerIdx][filamentIdx] = Set of pixels
    const layerMaps = [];
    for (let li = 0; li < maxLayers; li++) {
        layerMaps[li] = Array(sel.length).fill(null).map(() => new Set());
    }

    // Expand each pixel's sequence into layers
    for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
            const pixelRGB = {...}; // Get pixel color
            const key = rgb_to_key(pixelRGB);
            const seqData = sequences.get(key);

            if (!seqData) continue;

            // Expand sequence
            let layerIdx = 0;
            for (let seqLayer of seqData.sequence) {
                if (seqLayer > 0) {
                    const filIdx = seqLayer - 1;
                    layerMaps[layerIdx][filIdx].add(`${x},${y}`);
                    layerIdx++;
                }
            }
        }
    }

    // Vectorize and generate STLs
    for (let fi = 0; fi < sel.length; fi++) {
        let filamentFacets = '';

        for (let li = 0; li < maxLayers; li++) {
            const pixels = layerMaps[li][fi];
            const rectangles = vectorizePixels(pixels, imgW, imgH);

            const z0 = li * layerH;
            const z1 = z0 + layerH;

            for (let rect of rectangles) {
                const x0 = rect.x * pixelSize;
                const y0 = rect.y * pixelSize;
                const x1 = (rect.x + rect.w) * pixelSize;
                const y1 = (rect.y + rect.h) * pixelSize;

                filamentFacets += generateBox(x0, y0, z0, x1, y1, z1);
            }
        }

        const fileName = `artwork_${filamentName}.stl`;
        stls[fileName] = wrapSTL(filamentFacets, `Artwork_${filamentName}`);
    }

    // Export all STLs
    Object.entries(stls).forEach(([fileName, content]) => {
        saveAs(new Blob([content], {type: 'text/plain'}), fileName);
    });
}

function vectorizePixels(pixelSet, width, height) {
    // Greedy rectangle merging algorithm
    const rectangles = [];
    const processed = new Set();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!grid[y][x] || processed.has(`${x},${y}`)) continue;

            // Expand horizontally
            let w = 1;
            while (x + w < width && grid[y][x + w] && !processed.has(`${x + w},${y}`)) {
                w++;
            }

            // Expand vertically
            let h = 1;
            let canExpand = true;
            while (canExpand && y + h < height) {
                for (let dx = 0; dx < w; dx++) {
                    if (!grid[y + h][x + dx] || processed.has(`${x + dx},${y + h}`)) {
                        canExpand = false;
                        break;
                    }
                }
                if (canExpand) h++;
            }

            // Mark as processed
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    processed.add(`${x + dx},${y + dy}`);
                }
            }

            rectangles.push({x, y, w, h});
        }
    }

    return rectangles;
}

function generateBox(x0, y0, z0, x1, y1, z1) {
    // Generate 12 triangular facets (2 per face, 6 faces)
    return `facet normal 0 0 -1
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y1} ${z0}
  endloop
endfacet
// ... 11 more facets ...
`;
}
```

#### Fix Plan:
- ✅ Replace mock export with real STL generation
- ✅ Use greedy rectangle vectorization
- ✅ Generate one STL per filament (all layers combined)
- ✅ Use ASCII STL format for compatibility

---

### 6. Missing: SVG to STL Conversion

#### Current State:
- Vector mode (line 463-465) just traces SVG but doesn't convert to STL
- The `svg-to-stl-reference` folder has a COMPLETE implementation!

**From svg-to-stl-reference/js/SVGtoSTL.js:**
- SVG path parsing with d3-threeD.js
- Path to Three.js shape conversion
- Extrusion with configurable depth and bevel
- Base plate generation (rectangular or circular)
- CSG operations (union/intersect) with ThreeCSG.js
- Proper STL export

#### Fix Plan:
- ✅ Integrate SVG upload to Vector tab
- ✅ Port SVG→STL conversion from reference implementation
- ✅ Add extrusion depth, bevel, and base plate controls
- ✅ Generate STL from SVG with proper geometry

---

## Repository Modularity Plan

### Current State:
- **Excellent:** `/js/` folder has clean ES6 modules (9 files, 2,350 lines)
- **Good:** `index.html` uses modular imports
- **Bad:** `Imageto3D Gem.html` is monolithic (all code inline)
- **Bad:** `Image2Print.html` is monolithic (all code inline)

### Proposed Modular Architecture:

```
/home/user/Experiments/
├── lib/                          # Core library (NEW)
│   ├── core/
│   │   ├── constants.js          # Color palettes, defaults
│   │   ├── state.js              # State management
│   │   └── utils.js              # Helper functions
│   ├── grid/
│   │   ├── sequences.js          # Sequence generation
│   │   ├── layout.js             # Grid layout calculation
│   │   ├── visualization.js      # Canvas drawing
│   │   └── export.js             # STL/JSON export
│   ├── scan/
│   │   ├── alignment.js          # Grid overlay alignment
│   │   ├── extraction.js         # Color extraction
│   │   └── analysis.js           # Duplicate detection
│   ├── quantize/
│   │   ├── palette.js            # Palette management (GPL import/export)
│   │   ├── dither.js             # Floyd-Steinberg dithering
│   │   ├── filter.js             # Min-detail filtering
│   │   └── layers.js             # Layer expansion
│   ├── stl/
│   │   ├── vectorize.js          # Greedy rectangle merging
│   │   ├── geometry.js           # Box/facet generation
│   │   ├── export.js             # ASCII/Binary STL
│   │   └── svg-converter.js      # SVG to STL (from reference)
│   └── index.js                  # Main export (facade pattern)
│
├── apps/                         # Application implementations
│   ├── alpine/                   # Alpine.js version
│   │   ├── index.html            # Imageto3D Gem (refactored)
│   │   └── app.js                # Alpine component (imports from lib/)
│   ├── vanilla/                  # Vanilla JS version
│   │   ├── index.html            # index.html (refactored)
│   │   └── init.js               # Initialization (imports from lib/)
│   └── react/                    # Future React version
│       └── ...
│
├── docs/                         # Documentation
│   ├── API.md                    # Library API reference
│   ├── WORKFLOW.md               # End-to-end workflow guide
│   └── EXAMPLES.md               # Code examples
│
├── dist/                         # Bundled library (for CDN/external use)
│   ├── hueforge-lite.js          # UMD bundle
│   ├── hueforge-lite.min.js      # Minified
│   └── hueforge-lite.d.ts        # TypeScript definitions
│
├── svg-to-stl-reference/         # Keep as reference
│
└── package.json                  # NPM package definition
```

### Module Export Pattern:

**lib/index.js (Main facade):**
```javascript
// Core
export { COLOURS } from './core/constants.js';
export { simColour, rgb_to_key, findClosest } from './core/utils.js';

// Grid
export { generateSequences, generateGrid, drawGrid } from './grid/index.js';
export { exportGridSTLs, exportGridJSON } from './grid/export.js';

// Scan
export { alignGrid, extractColors, analyzeScan } from './scan/index.js';

// Quantize
export { quantizeImage, importGPL, exportGPL } from './quantize/index.js';

// STL
export { vectorizePixels, generateBox, exportArtworkSTLs } from './stl/index.js';
export { svgToSTL } from './stl/svg-converter.js';
```

**Usage in External Sites:**
```html
<!-- Option 1: ES Modules -->
<script type="module">
import { generateGrid, quantizeImage, exportArtworkSTLs } from './lib/index.js';

// Use functions directly
generateGrid(filaments, config);
</script>

<!-- Option 2: UMD Bundle (CDN) -->
<script src="https://cdn.jsdelivr.net/gh/user/repo@main/dist/hueforge-lite.min.js"></script>
<script>
const { generateGrid, quantizeImage, exportArtworkSTLs } = HueForgeLite;
// Use functions
</script>
```

---

## Implementation Plan

### Phase 1: Refactor Imageto3D Gem.html (Priority: HIGH)

1. **Extract Core Functions to Separate Script**
   - Create `apps/alpine/lib.js` with all core functions
   - Keep Alpine component in `apps/alpine/app.js`
   - Import functions into Alpine component

2. **Fix Grid Generation**
   - Replace `generateSequences()` with validated version
   - Add empty cells tracking
   - **Build sequence map with rgb_to_key()**
   - Add click handler and popup

3. **Fix Scan Analysis**
   - Replace random sampling with grid-aligned extraction
   - Add area averaging
   - Add duplicate detection

4. **Fix Quantization**
   - Add min-detail filter
   - Implement proper Floyd-Steinberg dithering
   - Add GPL import/export
   - Build filament layer previews with sequence expansion

5. **Fix STL Export**
   - Remove fake 3D model generation
   - Add greedy rectangle vectorization
   - Generate proper ASCII STL per filament
   - Use sequence map for layer expansion

6. **Add SVG to STL**
   - Port conversion from svg-to-stl-reference
   - Add SVG upload to Vector tab
   - Add extrusion/bevel/base controls
   - Generate STL from SVG

### Phase 2: Create Modular Library (Priority: MEDIUM)

1. **Extract lib/ Folder**
   - Move core functions from js/ to lib/
   - Organize by feature (grid/, scan/, quantize/, stl/)
   - Create facade exports in lib/index.js

2. **Refactor Existing Apps**
   - Update `index.html` to import from lib/
   - Update `app.html` to import from lib/
   - Update `Imageto3D Gem.html` to import from lib/

3. **Create Build System**
   - Add Rollup/Vite for bundling
   - Generate UMD bundle for CDN
   - Generate TypeScript definitions
   - Create minified distribution

### Phase 3: Documentation & Examples (Priority: LOW)

1. **API Documentation**
   - Document all exported functions
   - Add parameter descriptions
   - Add return value specifications

2. **Workflow Guide**
   - Step-by-step tutorial
   - Example code snippets
   - Common patterns

3. **External Integration Examples**
   - Standalone HTML page
   - React integration
   - Vue integration

---

## Critical Fixes Summary

### Must Fix (Breaks Workflow):
1. ✅ **Grid sequence generation** - Invalid sequences break everything
2. ✅ **Sequence map with RGB keys** - Required for layer expansion
3. ✅ **Scan color extraction** - Random sampling is useless
4. ✅ **STL export** - Mock implementation doesn't work

### Should Fix (Improves Quality):
1. ✅ Min-detail filter for quantization
2. ✅ Proper Floyd-Steinberg dithering
3. ✅ GPL palette import/export
4. ✅ Greedy rectangle vectorization
5. ✅ Empty cell visualization

### Nice to Have:
1. SVG to STL conversion
2. 3D preview (real, not fake)
3. Multiple scan support
4. Batch processing

---

## Testing Checklist

After refactoring, test this complete workflow:

1. ✅ **Grid Generation**
   - [ ] Select 4 filaments
   - [ ] Generate grid (should create 340 valid sequences for N=4, M=4)
   - [ ] Click tiles to inspect sequences
   - [ ] Verify no gaps in sequences
   - [ ] Export grid STL (should create 4 files)
   - [ ] Export reference image

2. ✅ **Scan Analysis**
   - [ ] Upload scan image
   - [ ] Align grid overlay (drag or input values)
   - [ ] Extract colors (should sample from grid positions)
   - [ ] Verify duplicate detection
   - [ ] Export palette GPL

3. ✅ **Image Quantization**
   - [ ] Upload artwork image
   - [ ] Select extracted or imported palette
   - [ ] Quantize with dithering
   - [ ] Apply min-detail filter
   - [ ] Verify filament layer previews

4. ✅ **STL Export**
   - [ ] Export artwork STLs
   - [ ] Verify one STL per filament
   - [ ] Verify proper geometry (open in slicer)
   - [ ] Verify correct dimensions

5. ✅ **SVG to STL** (if implemented)
   - [ ] Upload SVG
   - [ ] Configure extrusion depth
   - [ ] Add base plate
   - [ ] Export STL

---

## Estimated Effort

- **Phase 1 (Refactor Gem):** 8-12 hours
- **Phase 2 (Modular Library):** 4-6 hours
- **Phase 3 (Documentation):** 2-4 hours
- **Total:** ~14-22 hours

---

## Next Steps

**Immediate Actions:**
1. Get user approval on this plan
2. Start with Phase 1: Refactor Imageto3D Gem.html
3. Fix grid generation first (most critical)
4. Fix sequence map second (enables rest of workflow)
5. Fix scan, quantize, and STL export in order
6. Test end-to-end workflow
7. Move to Phase 2: Modular library

**Questions for User:**
1. Do you want to keep the Alpine.js version or refactor to vanilla JS?
2. Should we create a build system now or later?
3. Do you want SVG to STL integration in Phase 1 or Phase 2?
4. Any other features you want to add?
