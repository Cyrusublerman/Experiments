# Image Quantization to STL: Complete Mathematical Process

## Document Overview

This document provides a comprehensive explanation of the mathematical process for converting a raster image into multi-color 3D printable STL files using FDM (Fused Deposition Modeling) color mixing.

**Current Implementation:** Custom raster-to-vector approach
**Future Enhancement:** Integration with proven libraries (imagetracerjs, STLBuilder)

---

## Table of Contents

1. [Overview & Workflow](#overview--workflow)
2. [Phase 1: Pixelization](#phase-1-pixelization)
3. [Phase 2: Color Quantization](#phase-2-color-quantization)
4. [Phase 3: Sequence Expansion](#phase-3-sequence-expansion)
5. [Phase 4: Vectorization](#phase-4-vectorization)
6. [Phase 5: STL Generation](#phase-5-stl-generation)
7. [Mathematical Analysis](#mathematical-analysis)
8. [Optimization Opportunities](#optimization-opportunities)
9. [Library Integration Plan](#library-integration-plan)

---

## Overview & Workflow

### The Complete Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ INPUT: Raster Image (e.g., 640×480 pixels)                 │
│        Desired Print Width (e.g., 170mm)                    │
│        Calibrated Color Palette (from scanned grid)         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: PIXELIZATION                                       │
│  Convert image pixels to physical dimensions                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: COLOR QUANTIZATION                                 │
│  Map each pixel to nearest calibrated color                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: SEQUENCE EXPANSION                                 │
│  Expand each color into layer-by-layer filament sequence    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: VECTORIZATION                                      │
│  Combine adjacent same-filament pixels into rectangles      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: STL GENERATION                                     │
│  Convert rectangles to 3D geometry (ASCII STL format)       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT: One STL file per filament                           │
│         artwork_Cyan_PLA.stl                                │
│         artwork_Magenta_PLA.stl                             │
│         artwork_Yellow_PLA.stl                              │
│         artwork_White_PETG.stl                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Pixelization

### Objective
Convert image pixels from abstract units to physical millimeter dimensions.

### Mathematics

**Given:**
- Image dimensions: `W_img × H_img` pixels
- Desired print width: `W_print` mm

**Calculate pixel size:**

```
pixel_size = W_print / W_img  (mm per pixel)
```

**Calculate print height:**

```
H_print = W_print × (H_img / W_img)
       = pixel_size × H_img
```

**Example:**

```
Image: 640 × 480 pixels
Desired print width: 170mm

pixel_size = 170 / 640 = 0.265625 mm/pixel
H_print = 170 × (480/640) = 127.5 mm

Each pixel becomes a 0.265625 × 0.265625 mm square
```

### Implementation

```javascript
// js/artwork-stl.js:20-27
const printW = +document.getElementById('printW').value; // mm
const imgW = quant.width;  // pixels
const imgH = quant.height; // pixels
const printH = printW * (imgH / imgW); // mm
const pixelSize = printW / imgW; // mm per pixel
```

### Coordinate System

```
Image Space (pixels):        Physical Space (mm):
┌─────────────┐             ┌─────────────┐
│ (0,0)   640 │             │ (0,0)   170 │
│             │    →        │             │
│ 480         │             │ 127.5       │
└─────────────┘             └─────────────┘
```

**Transformation:**
```
x_mm = x_pixel × pixel_size
y_mm = y_pixel × pixel_size
```

---

## Phase 2: Color Quantization

### Objective
Map each pixel's RGB color to the nearest color from the calibrated palette using perceptual distance metrics.

### Mathematics

**Given:**
- Pixel color: `C_pixel = (R, G, B)` where R, G, B ∈ [0, 255]
- Palette: `P = {C_1, C_2, ..., C_n}` calibrated colors

**Find nearest color using Euclidean distance in RGB space:**

```
d(C_pixel, C_i) = √[(R_pixel - R_i)² + (G_pixel - G_i)² + (B_pixel - B_i)²]

C_nearest = arg min(d(C_pixel, C_i)) for all C_i ∈ P
            i
```

**Example:**

```
Pixel color: RGB(125, 200, 75)
Palette:
  C1 = RGB(0, 255, 255)    [Cyan]
  C2 = RGB(255, 0, 255)    [Magenta]
  C3 = RGB(255, 255, 0)    [Yellow]
  C4 = RGB(255, 255, 255)  [White]

Distances:
  d(pixel, C1) = √[(125-0)² + (200-255)² + (75-255)²] = 219.86
  d(pixel, C2) = √[(125-255)² + (200-0)² + (75-255)²] = 294.11
  d(pixel, C3) = √[(125-255)² + (200-255)² + (75-0)²] = 154.92  ← minimum
  d(pixel, C4) = √[(125-255)² + (200-255)² + (75-255)²] = 235.77

Result: Pixel maps to Yellow (C3)
```

### Implementation

```javascript
// js/utils.js:102-112
function findClosest(c, palette) {
    let min = Infinity;
    let closest = palette[0];
    palette.forEach(p => {
        const dist = Math.sqrt((c.r - p.r)**2 + (c.g - p.g)**2 + (c.b - p.b)**2);
        if (dist < min) {
            min = dist;
            closest = p;
        }
    });
    return closest;
}
```

### Optional: Floyd-Steinberg Dithering

Distributes quantization error to neighboring pixels to improve perceptual quality.

**Error diffusion weights:**

```
       [X]  7/16
  3/16 5/16 1/16
```

Where `[X]` is the current pixel.

**Algorithm:**

```
For each pixel (x, y):
  1. Find nearest palette color
  2. Calculate error: e = original - nearest
  3. Distribute error to neighbors:
     - pixel(x+1, y)   gets 7/16 of error
     - pixel(x-1, y+1) gets 3/16 of error
     - pixel(x,   y+1) gets 5/16 of error
     - pixel(x+1, y+1) gets 1/16 of error
```

### Min Detail Filter (Optional)

Removes isolated pixels smaller than a threshold to avoid unprintable details.

**Algorithm:**

```
For each pixel (x, y):
  1. Find nearest palette color C
  2. Count neighbors within radius r that map to same color C
  3. If count < threshold:
     - Mark pixel as "filtered"
     - Set alpha = 128 (semi-transparent in preview)
```

**Threshold calculation:**

```
radius_mm = min_detail (from user input)
radius_px = round(radius_mm / pixel_size)
window_size = (2 × radius_px + 1)²
threshold = 0.5 × window_size
```

**Example:**

```
min_detail = 1.0 mm
pixel_size = 0.266 mm/px
radius_px = round(1.0 / 0.266) = 4 pixels
window_size = (2×4 + 1)² = 81 pixels
threshold = 0.5 × 81 = 40.5 pixels

If fewer than 41 neighbors are the same color, filter the pixel.
```

---

## Phase 3: Sequence Expansion

### Objective
For each quantized pixel, expand its color into a layer-by-layer sequence of filament applications based on the calibration grid lookup.

### The Sequence Concept

Each calibrated color has an associated **sequence** that describes which filament to use in each layer.

**Sequence notation:** `[f1, f2, f3, ..., fn]`

Where:
- `fi = 0` means empty (no filament)
- `fi = k` means use filament k

**Example sequences for 4 colors (CMYK), 4 layers:**

```
Color: Light Purple
RGB: (180, 120, 200)
Sequence: [2, 3, 0, 0]  → Magenta, Yellow, Empty, Empty

Color: Orange
RGB: (255, 140, 0)
Sequence: [2, 3, 3, 3]  → Magenta, Yellow, Yellow, Yellow

Color: Teal
RGB: (0, 200, 200)
Sequence: [1, 1, 3, 0]  → Cyan, Cyan, Yellow, Empty
```

### How Sequences Are Generated

During **Step 1: Generate Calibration Grid**, all possible valid sequences are generated:

**Valid sequence rules:**
1. Not all-empty: `[0, 0, 0, 0]` is invalid
2. No gaps: If `[0, 1, 0, 2]` has 0 in middle, invalid
3. Valid: `[1, 2, 3, 0]` (stops at first 0)
4. Valid: `[1, 1, 1, 1]` (all same filament)

**Formula for number of sequences:**

```
For N filaments, M layers:

num_sequences = N × (N^M - 1) / (N - 1)
```

**Example:** 4 filaments, 4 layers

```
num_sequences = 4 × (4^4 - 1) / (4 - 1)
              = 4 × (256 - 1) / 3
              = 4 × 255 / 3
              = 340 sequences
```

### Mathematics of Color Mixing

When multiple filament layers are stacked, the perceived color is the **average** of the layer colors.

**Simulation:**

```
For sequence S = [f1, f2, ..., fn]:
Let C_i = RGB color of filament i

C_result = (Σ C_fi) / (number of non-zero layers)
           i
```

**Example:**

```
Sequence: [1, 2, 3, 0]  (Cyan, Magenta, Yellow, Empty)

C1 = RGB(0, 255, 255)    [Cyan]
C2 = RGB(255, 0, 255)    [Magenta]
C3 = RGB(255, 255, 0)    [Yellow]

C_result = (C1 + C2 + C3) / 3
         = RGB((0+255+255)/3, (255+0+255)/3, (255+255+0)/3)
         = RGB(170, 170, 170)
         = Light Gray
```

### Sequence Lookup

During **Step 2: Scan Analysis**, the calibration grid is scanned and a mapping is built:

```
sequence_map: RGB → {sequence, colours, grid_position}
```

**Key generation uses standardized rounding:**

```javascript
// CRITICAL: Always round to integers for consistent lookup
function rgb_to_key(rgb) {
    return `${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)}`;
}
```

### Layer Expansion Process

**For each pixel at (x, y):**

```
1. Get quantized color: C_pixel
2. Look up sequence: S = sequence_map[rgb_to_key(C_pixel)]
3. Expand into layers:

   For each layer index li in S:
     If S[li] > 0:  // Non-empty layer
       filament_index = S[li] - 1
       Add pixel (x, y) to layer_map[layer_height_index][filament_index]
       layer_height_index++
```

**Example:**

```
Pixel at (100, 200)
Quantized color: RGB(180, 120, 200)
Sequence: [2, 3, 0, 0]

Layer expansion:
  Layer 0 (z=0.00-0.08mm): Filament 1 (Magenta) at (100, 200)
  Layer 1 (z=0.08-0.16mm): Filament 2 (Yellow) at (100, 200)
  (Layers 2-3 are empty, no geometry)
```

### Implementation

```javascript
// js/artwork-stl.js:46-69
for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
        const i = (y * imgW + x) * 4;
        const pixelRGB = {
            r: result.data[i],
            g: result.data[i + 1],
            b: result.data[i + 2]
        };

        const key = rgb_to_key(pixelRGB);
        const seqData = sequences.get(key);

        if (!seqData) continue;

        // Expand sequence into layers
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
```

### Data Structure

After expansion, we have:

```
layerMaps[layer_index][filament_index] = Set<"x,y">

Example:
layerMaps[0][0] = Set{"10,20", "11,20", "12,20", ...}  // Cyan, layer 0
layerMaps[0][1] = Set{"50,100", "51,100", ...}         // Magenta, layer 0
layerMaps[1][0] = Set{"10,20", "11,20", ...}           // Cyan, layer 1
...
```

---

## Phase 4: Vectorization

### Objective
Combine adjacent pixels of the same filament into larger rectangles to reduce STL file size and complexity.

### The Problem

**Without vectorization:**
- 640×480 image = 307,200 pixels
- If 50% of pixels use Cyan: 153,600 boxes
- 153,600 boxes × 12 triangles/box = 1,843,200 triangles
- **Huge file, slow slicing!**

**With vectorization:**
- Combine adjacent pixels into rectangles
- Typical reduction: 90-99%
- 153,600 pixels → ~500-5000 rectangles
- **Manageable file size!**

### Greedy Rectangle Merging Algorithm

**Current Implementation:**

```
For each pixel (x, y) in scan order (left-to-right, top-to-bottom):
  If pixel not yet processed:

    1. Start new rectangle at (x, y)

    2. Expand horizontally:
       width = 1
       While pixel at (x + width, y) exists AND same color AND not processed:
         width++

    3. Try expanding vertically:
       height = 1
       can_expand = true
       While can_expand AND (y + height < image_height):
         For each column dx from 0 to width-1:
           If pixel at (x + dx, y + height) NOT same color OR already processed:
             can_expand = false
             break
         If can_expand:
           height++

    4. Mark all pixels in rectangle (x, y, width, height) as processed

    5. Add rectangle to list
```

**Example:**

```
Pixel grid (1 = Cyan, 0 = other):
┌───┬───┬───┬───┬───┐
│ 1 │ 1 │ 1 │ 0 │ 0 │
├───┼───┼───┼───┼───┤
│ 1 │ 1 │ 1 │ 0 │ 0 │
├───┼───┼───┼───┼───┤
│ 1 │ 1 │ 1 │ 0 │ 0 │
├───┼───┼───┼───┼───┤
│ 0 │ 0 │ 0 │ 0 │ 0 │
└───┴───┴───┴───┴───┘

Result: 1 rectangle (x=0, y=0, w=3, h=3)
Instead of: 9 individual pixels
Reduction: 88.9%
```

### Implementation

```javascript
// js/artwork-stl.js:134-180
function vectorizePixels(pixelSet, width, height) {
    const rectangles = [];
    const processed = new Set();

    // Convert set to 2D array
    const grid = Array(height).fill(null).map(() => Array(width).fill(false));
    for (let coord of pixelSet) {
        const [x, y] = coord.split(',').map(Number);
        grid[y][x] = true;
    }

    // Greedy rectangle extraction
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const coord = `${x},${y}`;
            if (!grid[y][x] || processed.has(coord)) continue;

            let w = 1, h = 1;

            // Expand horizontally
            while (x + w < width && grid[y][x + w] && !processed.has(`${x + w},${y}`)) {
                w++;
            }

            // Expand vertically
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

            // Mark processed
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
```

### Performance Analysis

**Time Complexity:** O(W × H)
- Single pass through all pixels
- Each pixel processed exactly once

**Space Complexity:** O(W × H)
- Grid array: W × H booleans
- Processed set: up to W × H entries

**Typical Results:**

```
640×480 image, 50% coverage:
- Input pixels: 153,600
- Output rectangles: ~2,000-5,000
- Reduction: 96-99%
- Processing time: ~100-200ms
```

---

## Phase 5: STL Generation

### Objective
Convert vectorized rectangles into 3D geometry in ASCII STL format.

### STL File Format

**ASCII STL structure:**

```
solid <object_name>
  facet normal <nx> <ny> <nz>
    outer loop
      vertex <x1> <y1> <z1>
      vertex <x2> <y2> <z2>
      vertex <x3> <y3> <z3>
    endloop
  endfacet
  ... (more facets)
endsolid <object_name>
```

### Box Geometry Mathematics

Each rectangle becomes a **rectangular prism** (box) with 6 faces and 12 triangular facets.

**Given rectangle:**
- Position: (x, y) in pixels
- Size: (w, h) in pixels
- Layer: z_layer (layer index)

**Convert to physical coordinates:**

```
x0 = x × pixel_size
y0 = y × pixel_size
x1 = (x + w) × pixel_size
y1 = (y + h) × pixel_size
z0 = z_layer × layer_height
z1 = z0 + layer_height
```

**Example:**

```
Rectangle: x=10, y=20, w=5, h=3
Layer: 1
pixel_size = 0.266 mm
layer_height = 0.08 mm

Physical coordinates:
x0 = 10 × 0.266 = 2.66 mm
y0 = 20 × 0.266 = 5.32 mm
x1 = 15 × 0.266 = 3.99 mm
y1 = 23 × 0.266 = 6.12 mm
z0 = 1 × 0.08 = 0.08 mm
z1 = 0.08 + 0.08 = 0.16 mm

Box dimensions: 1.33 × 0.80 × 0.08 mm
```

### Face Normals

Each face has an outward-pointing normal vector:

```
Bottom face (z = z0):  normal = (0, 0, -1)
Top face    (z = z1):  normal = (0, 0, +1)
Front face  (y = y0):  normal = (0, -1, 0)
Back face   (y = y1):  normal = (0, +1, 0)
Left face   (x = x0):  normal = (-1, 0, 0)
Right face  (x = x1):  normal = (+1, 0, 0)
```

### Triangle Vertex Order

**Right-hand rule:** Vertices ordered counter-clockwise when viewing from outside.

**Bottom face (-Z):**

```
Vertices (viewed from below):
  (x0, y0, z0) → (x1, y0, z0) → (x1, y1, z0)
  (x0, y0, z0) → (x1, y1, z0) → (x0, y1, z0)
```

**Top face (+Z):**

```
Vertices (viewed from above):
  (x0, y0, z1) → (x1, y1, z1) → (x1, y0, z1)
  (x0, y0, z1) → (x0, y1, z1) → (x1, y1, z1)
```

*Note the reversed winding order for opposite normals.*

### Complete Box Generation

```javascript
// js/artwork-stl.js:182-274
function generateBox(x0, y0, z0, x1, y1, z1) {
    return `facet normal 0 0 -1
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y1} ${z0}
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y1} ${z0}
    vertex ${x0} ${y1} ${z0}
  endloop
endfacet
... (10 more facets for other faces)
`;
}
```

### File Organization

**One STL per filament:**

```
artwork_Cyan_PLA.stl
├─ Layer 0 rectangles (z = 0.00-0.08mm)
├─ Layer 1 rectangles (z = 0.08-0.16mm)
├─ Layer 2 rectangles (z = 0.16-0.24mm)
└─ ...

artwork_Magenta_PLA.stl
├─ Layer 0 rectangles
├─ Layer 1 rectangles
└─ ...
```

**Combining layers:**

```javascript
// js/artwork-stl.js:75-115
for (let fi = 0; fi < sel.length; fi++) {
    let filamentFacets = '';

    // Combine all layers for this filament
    for (let li = 0; li < maxLayers; li++) {
        const pixels = layerMaps[li][fi];
        if (pixels.size === 0) continue;

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

    if (filamentFacets.length > 0) {
        const fileName = `artwork_${filamentName}.stl`;
        stls[fileName] = wrapSTL(filamentFacets, `Artwork_${filamentName}`);
    }
}
```

---

## Mathematical Analysis

### Complexity Analysis

**Phase 1: Pixelization**
- Time: O(1)
- Space: O(1)
- Trivial arithmetic operations

**Phase 2: Color Quantization**
- Time: O(W × H × N) where N = palette size
- Space: O(W × H) for image data
- Dominated by nearest-neighbor search

**Phase 3: Sequence Expansion**
- Time: O(W × H × M) where M = max layers
- Space: O(W × H × F × M) where F = num filaments
- Layer maps can be large

**Phase 4: Vectorization**
- Time: O(W × H) per layer per filament
- Total: O(W × H × F × M)
- Space: O(W × H) for grid + processed set

**Phase 5: STL Generation**
- Time: O(R) where R = total rectangles
- Space: O(R) for facet strings
- String concatenation can be slow for large R

**Overall:**
- **Time:** O(W × H × (N + F × M))
- **Space:** O(W × H × F × M)

### Typical Performance

**Example: 640×480 image, 4 colors, 4 layers**

```
W × H = 307,200 pixels
N = 340 palette colors
F = 4 filaments
M = 4 layers max

Phase 2 (quantization):
  307,200 × 340 = 104,448,000 distance calculations
  ~500-800ms in JavaScript

Phase 3 (expansion):
  307,200 × 4 = 1,228,800 sequence lookups
  ~50-100ms

Phase 4 (vectorization):
  4 filaments × 4 layers × 307,200 = 4,915,200 pixel checks
  But only ~153,600 actual pixels per filament
  ~200-400ms total

Phase 5 (STL generation):
  ~2,000-5,000 rectangles per filament × 4 filaments
  ~8,000-20,000 boxes
  ~100-300ms for string generation

Total: ~1-2 seconds (acceptable)
```

---

## Optimization Opportunities

### 1. **Quantization: Use K-D Tree for Nearest Neighbor**

**Current:** Linear search O(N) per pixel

**Improvement:** K-D tree O(log N) per pixel

```javascript
// Build K-D tree from palette (one-time cost)
const kdtree = new KDTree(palette, distanceFunc, ['r', 'g', 'b']);

// Query O(log N) instead of O(N)
const nearest = kdtree.nearest({r, g, b}, 1)[0];
```

**Impact:**
- 640×480 × 340 searches → 640×480 × log₂(340) ≈ 640×480 × 8.4
- **40× speedup** in quantization phase

### 2. **Vectorization: More Sophisticated Algorithms**

**Current:** Greedy horizontal-first rectangle merging

**Better Options:**

a) **Max Rectangle Algorithm (Largest Rectangle in Histogram)**
   - Time: O(W × H)
   - Finds optimal rectangles row-by-row
   - Better coverage, fewer rectangles

b) **Scanline Algorithm**
   - Processes horizontal spans
   - Merges adjacent spans vertically
   - Similar performance, simpler code

c) **Polygon Tracing (imagetracerjs)**
   - Converts raster to vector outlines
   - Creates proper curves, not just rectangles
   - **Much better quality**
   - **Smaller file sizes**

### 3. **Use Existing Libraries**

#### **imagetracerjs for Raster-to-Vector**

```javascript
// Instead of rectangle merging:
import ImageTracer from 'imagetracerjs';

const svgString = ImageTracer.imageToSVG(imageData, {
    ltres: 1,      // Line threshold
    qtres: 1,      // Quad threshold
    pathomit: 8,   // Path omit
    colorsampling: 0, // Use existing quantized colors
    numberofcolors: palette.length
});

// Parse SVG paths → polygons
```

**Benefits:**
- Professional quality vectorization
- Bezier curves (smooth edges)
- Typically 10-100× fewer shapes than rectangles
- Battle-tested, optimized C++ port available

#### **STLBuilder for STL Generation**

```javascript
import STLBuilder from 'stl-builder';

const builder = new STLBuilder();

// Add polygons as extruded shapes
for (let polygon of vectorizedShapes) {
    builder.addExtrudedPolygon(polygon, z0, z1);
}

const stlBlob = builder.toBlob();
```

**Benefits:**
- Handles complex polygons (not just rectangles)
- Built-in mesh optimization
- Binary STL support (smaller files)
- Proper manifold checking

### 4. **WebWorkers for Parallelization**

**Current:** All processing in main thread (blocks UI)

**Improvement:** Use Web Workers

```javascript
// Main thread
const worker = new Worker('quantize-worker.js');
worker.postMessage({imageData, palette});
worker.onmessage = (e) => {
    const quantizedData = e.data;
    // Continue to next phase
};

// quantize-worker.js
onmessage = (e) => {
    const {imageData, palette} = e.data;
    const quantized = quantizeImage(imageData, palette);
    postMessage(quantized);
};
```

**Benefits:**
- Non-blocking UI
- Can utilize multiple CPU cores
- Better user experience

### 5. **Spatial Indexing for Layer Maps**

**Current:** Set<"x,y"> for each layer/filament

**Better:** 2D spatial hash or quadtree

```javascript
class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    add(x, y) {
        const key = `${Math.floor(x/this.cellSize)},${Math.floor(y/this.cellSize)}`;
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push({x, y});
    }

    getRegion(x0, y0, x1, y1) {
        // Efficiently query rectangular region
    }
}
```

**Benefits:**
- Faster rectangle merging
- Better cache locality
- Scales better for large images

---

## Library Integration Plan

### Phase 1: imagetracerjs Integration

**Goal:** Replace greedy rectangle merging with proper vectorization

**Steps:**

1. **Install library:**
   ```bash
   npm install imagetracerjs
   ```

2. **Create per-layer canvases:**
   ```javascript
   for (let li = 0; li < maxLayers; li++) {
       for (let fi = 0; fi < numFilaments; fi++) {
           const canvas = createLayerCanvas(layerMaps[li][fi], imgW, imgH);
           const svgString = ImageTracer.imageToSVG(canvas, options);
           const polygons = parseSVGPaths(svgString);
           layerPolygons[li][fi] = polygons;
       }
   }
   ```

3. **Parse SVG paths to polygons:**
   ```javascript
   function parseSVGPaths(svgString) {
       const parser = new DOMParser();
       const doc = parser.parseFromString(svgString, 'image/svg+xml');
       const paths = doc.querySelectorAll('path');

       return Array.from(paths).map(path => {
           const d = path.getAttribute('d');
           return pathDataToPolygon(d); // Convert path commands to points
       });
   }
   ```

**Expected Improvements:**
- 10-100× fewer shapes
- Smooth curves instead of stairstepping
- Better visual quality
- Smaller STL files

### Phase 2: STLBuilder Integration

**Goal:** Replace manual STL string generation with proper mesh builder

**Steps:**

1. **Install library:**
   ```bash
   npm install stl-builder
   ```

2. **Generate STLs from polygons:**
   ```javascript
   import STLBuilder from 'stl-builder';

   for (let fi = 0; fi < numFilaments; fi++) {
       const builder = new STLBuilder();

       for (let li = 0; li < maxLayers; li++) {
           const polygons = layerPolygons[li][fi];
           const z0 = li * layerHeight;
           const z1 = z0 + layerHeight;

           for (let polygon of polygons) {
               builder.addExtrudedPolygon(polygon, z0, z1);
           }
       }

       const blob = builder.toBinaryBlob(); // Binary STL (smaller)
       saveAs(blob, `artwork_${filamentName}.stl`);
   }
   ```

**Expected Improvements:**
- Binary STL (50% smaller files)
- Proper manifold meshes
- Built-in validation
- Handles complex polygons

### Phase 3: model-viewer Integration (Optional)

**Goal:** Add 3D preview before export

**Steps:**

1. **Add model-viewer to HTML:**
   ```html
   <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>

   <model-viewer id="stlPreview"
                 src=""
                 camera-controls
                 auto-rotate
                 style="width:100%;height:400px">
   </model-viewer>
   ```

2. **Load generated STL:**
   ```javascript
   const stlBlob = builder.toBinaryBlob();
   const stlUrl = URL.createObjectURL(stlBlob);
   document.getElementById('stlPreview').src = stlUrl;
   ```

**Benefits:**
- Visual verification before export
- Catch errors early
- Better UX

---

## SVG Upload Workflow (Future Enhancement)

### Concept

Allow users to upload vector artwork directly, bypassing rasterization.

**Workflow:**

```
┌─────────────────────────────────────────┐
│ INPUT: SVG file with colored shapes     │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ Parse SVG, extract shapes and colors    │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ For each shape:                          │
│   1. Get fill color                      │
│   2. Look up sequence for that color     │
│   3. Duplicate shape for each layer      │
│   4. Assign filament to each layer       │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│ Generate STL (one per filament)         │
└─────────────────────────────────────────┘
```

**Example:**

```svg
<svg>
  <!-- Red circle -->
  <circle cx="50" cy="50" r="20" fill="rgb(255,0,0)" />

  <!-- Blue rectangle -->
  <rect x="100" y="100" width="40" height="30" fill="rgb(0,0,255)" />
</svg>
```

**Processing:**

```
Red circle, RGB(255,0,0):
  → Look up sequence: [2, 3, 3, 0]  (Magenta, Yellow, Yellow, Empty)
  → Layer 0: Magenta circle at (50, 50, 0.00-0.08mm)
  → Layer 1: Yellow circle at (50, 50, 0.08-0.16mm)
  → Layer 2: Yellow circle at (50, 50, 0.16-0.24mm)

Blue rectangle, RGB(0,0,255):
  → Look up sequence: [1, 1, 0, 0]  (Cyan, Cyan, Empty, Empty)
  → Layer 0: Cyan rectangle at (100, 100, 0.00-0.08mm)
  → Layer 1: Cyan rectangle at (100, 100, 0.08-0.16mm)
```

**Implementation Sketch:**

```javascript
function processSVG(svgString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');

    const shapes = doc.querySelectorAll('circle, rect, path, polygon');

    const layerMaps = initializeLayerMaps();

    for (let shape of shapes) {
        const fillColor = parseFillColor(shape);
        const sequence = lookupSequence(fillColor);
        const geometry = extractGeometry(shape);

        let layerIdx = 0;
        for (let fil of sequence) {
            if (fil > 0) {
                layerMaps[layerIdx][fil - 1].addShape(geometry);
                layerIdx++;
            }
        }
    }

    return generateSTLsFromShapes(layerMaps);
}
```

**Benefits:**
- Perfect vector quality (no pixelation)
- Smaller file sizes
- Faster processing
- Ideal for logos, graphics, text

---

## Conclusion

This document provides a complete mathematical breakdown of the image-to-STL pipeline. The current implementation uses custom algorithms for all phases, which works but has room for optimization.

**Key Takeaways:**

1. **Pixelization** is trivial but critical for dimensional accuracy
2. **Quantization** is the slowest phase (can benefit from K-D trees)
3. **Sequence expansion** is the core innovation (color → filament layers)
4. **Vectorization** has the most room for improvement (use imagetracerjs)
5. **STL generation** is straightforward (can use STLBuilder for better quality)

**Recommended Next Steps:**

1. Integrate imagetracerjs for better vectorization
2. Integrate STLBuilder for better STL generation
3. Add SVG upload workflow for vector artwork
4. Add model-viewer for 3D preview
5. Implement Web Workers for better performance

**Current Performance:**
- 640×480 image → ~1-2 seconds → 4 STL files

**Expected with Libraries:**
- 640×480 image → ~0.5-1 second → 4 STL files (50% smaller)
- Better quality, better maintainability, future-proof

---

**Document Version:** 1.0
**Date:** 2025-12-05
**Author:** Generated during refactoring session
