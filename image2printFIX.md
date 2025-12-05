# 4-Colour FDM Workflow - Complete Issue Resolution Guide

## Document Overview

This document provides a comprehensive analysis of all issues found in the 4-colour FDM workflow tool, along with detailed implementation strategies for fixing each issue. Issues are organized by severity and functional area.

---

## Table of Contents

1. [Critical Issues - Breaks Core Functionality](#critical-issues)
2. [Important Issues - Missing Features](#important-issues)
3. [Minor Issues - Polish & UX](#minor-issues)
4. [Implementation Strategy](#implementation-strategy)
5. [Testing Checklist](#testing-checklist)

---

## CRITICAL ISSUES

These issues completely break core functionality and must be fixed first.

---

### ISSUE #1: RGB Key Inconsistency - "Sequence Not Found" 🔴

**Severity:** CRITICAL - Breaks entire workflow  
**Affected Features:** Palette click, Print file generation, Sequence lookup

#### Problem Explanation

The `sequence_colour_map` is a JavaScript Map that stores the relationship between extracted RGB colours and their sequences. The map is populated during scan analysis, but lookups fail due to key format inconsistencies.

**Current Flow:**
```
1. Generate grid → Create sequences
2. Analyse scan → Extract RGB colours from each cell
3. Store in map: sequence_colour_map.set(key, data)
4. User clicks palette swatch → lookup with RGB key
5. Generate filament layers → lookup with RGB key
6. BOTH FAIL because keys don't match!
```

**Why It Fails:**

```javascript
// During scan analysis (storing):
let rgb = {r: 125.3, g: 1.7, b: 122.1};  // Averaged from pixels
let key = `${rgb.r},${rgb.g},${rgb.b}`;   // "125.3,1.7,122.1"
sequence_colour_map.set(key, {sequence: [1,2,3,0], ...});

// During palette click (retrieving):
let clickedRGB = {r: 125, g: 2, b: 122};  // From palette display
let lookupKey = `${clickedRGB.r},${clickedRGB.g},${clickedRGB.b}`;  // "125,2,122"
let found = sequence_colour_map.get(lookupKey);  // undefined! Keys don't match!
```

**Additional Issues:**
- Floating point precision: `125.00000001` vs `125`
- Integer vs float: Palette displays integers, map stores floats
- Whitespace: `"125, 1, 122"` vs `"125,1,122"`

#### Solution

**Create a standardized `rgb_to_key()` function:**

```javascript
function rgb_to_key(rgb) {
    // Always round to integers
    const r = Math.round(rgb.r);
    const g = Math.round(rgb.g);
    const b = Math.round(rgb.b);
    // No spaces, consistent format
    return `${r},${g},${b}`;
}
```

**Use everywhere:**

```javascript
// 1. During scan analysis (storing)
function extractColours() {
    // ... extract RGB ...
    const rgb = avgColour(imageData);
    const key = rgb_to_key(rgb);  // Use function
    sequence_colour_map.set(key, {
        sequence: sequences[cellIdx],
        colours: selectedColours,
        grid_position: {row, col, index: cellIdx},
        expected_rgb: simColour(sequences[cellIdx], selectedColours)
    });
}

// 2. During palette display (storing)
function displayPalette() {
    pal.forEach((c, i) => {
        let swatch = document.createElement('div');
        swatch.dataset.rgb = rgb_to_key(c);  // Store key
        swatch.onclick = () => showSequence(c);
    });
}

// 3. During palette click (retrieving)
function showSequence(c) {
    const key = rgb_to_key(c);  // Use function
    const data = sequence_colour_map.get(key);
    if (!data) {
        console.error(`Key not found: ${key}`);
        console.log('Available keys:', Array.from(sequence_colour_map.keys()));
        return;
    }
    // ... show popup ...
}

// 4. During filament layer generation (retrieving)
function generateFilamentLayers() {
    for (let p = 0; p < result.data.length; p += 4) {
        let rgb = {
            r: result.data[p],
            g: result.data[p + 1],
            b: result.data[p + 2]
        };
        const key = rgb_to_key(rgb);  // Use function
        const seqData = sequence_colour_map.get(key);
        // ... process ...
    }
}
```

#### Implementation Steps

1. **Add rgb_to_key function at top of script:**
```javascript
// RGB KEY STANDARDIZATION
function rgb_to_key(rgb) {
    return `${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)}`;
}
```

2. **Update extractColours function:**
```javascript
function extractColours() {
    // ... existing code ...
    const rgb = avgColour(imgData);
    const key = rgb_to_key(rgb);  // ADD THIS
    const cellIdx = r * grid.cols + c;
    
    // Store with standardized key
    sequence_colour_map.set(key, {
        sequence: grid.seqs[cellIdx],
        colours: grid.colours,
        grid_position: {row: r, col: c, index: cellIdx},
        expected_rgb: simColour(grid.seqs[cellIdx], grid.colours)
    });
    
    extracted_palette.push(rgb);
}
```

3. **Update showSequence function:**
```javascript
function showSequence(c) {
    const key = rgb_to_key(c);  // ADD THIS
    const data = sequences.get(key);
    
    if (!data) {
        msg(2, `Sequence not found for RGB(${c.r},${c.g},${c.b})`, 'err');
        // Debug output
        console.log('Looking for:', key);
        console.log('Available keys:', Array.from(sequences.keys()).slice(0, 10));
        return;
    }
    
    // ... rest of function ...
}
```

4. **Update generateFilamentLayers function:**
```javascript
function generateFilamentLayers() {
    // ... existing setup ...
    
    for (let p = 0; p < result.data.length; p += 4) {
        const pixelRGB = {
            r: result.data[p],
            g: result.data[p + 1],
            b: result.data[p + 2]
        };
        const key = rgb_to_key(pixelRGB);  // ADD THIS
        const seqData = sequences.get(key);
        
        if (seqData) {
            // ... process sequence ...
        }
    }
}
```

#### Testing Criteria

- [ ] Generate grid with 4 colours → 340 sequences
- [ ] Analyse scan → Extract 340 colours
- [ ] Click any palette swatch → Popup shows correct sequence
- [ ] Quantise image → Generate filament layers
- [ ] All filament layer previews show content (not empty)
- [ ] Console shows no "sequence not found" errors

---

### ISSUE #2: Empty Cells Not Rendered in Grid Overlay 🔴

**Severity:** CRITICAL - Breaks alignment accuracy  
**Affected Features:** Scan overlay, Grid alignment, 1:1 mapping

#### Problem Explanation

For 4 colours and 4 layers, we generate 340 sequences but the grid is 19×18 = 342 cells. The 2 extra cells (indices 340 and 341) are empty and should be:
1. Visually indicated in the overlay (grey border + X)
2. Skipped during colour extraction
3. Not included in the palette

**Current Behavior:**
- Overlay draws 342 cells (all look the same)
- Analysis tries to extract 342 colours
- Results in index misalignment

**Why This Matters:**
```
Grid position (1,1) should map to sequence index 1
But if we don't skip empties, position (1,1) might map to index 0
This breaks the entire 1:1 correspondence
```

#### Solution

**1. Calculate empty cells during grid generation:**

```javascript
function calculateGridLayout() {
    // ... existing code ...
    
    const totalCells = rows * cols;
    const emptyCells = [];
    
    for (let i = seqs.length; i < totalCells; i++) {
        emptyCells.push(i);
    }
    
    grid = {
        seqs,
        rows,
        cols,
        tile,
        gap,
        colours: sel.map(i => COLOURS[i]),
        width: cols * (tile + gap) - gap,
        height: rows * (tile + gap) - gap,
        empty_cells: emptyCells  // ADD THIS
    };
}
```

**2. Render empty cells differently in grid preview:**

```javascript
function drawGrid() {
    // ... existing code for filled cells ...
    
    // Draw empty cells with X
    grid.empty_cells.forEach(emptyIdx => {
        const row = Math.floor(emptyIdx / grid.cols);
        const col = emptyIdx % grid.cols;
        const x = col * scale;
        const y = row * scale;
        
        // Grey background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x, y, scale, scale);
        
        // Grey border
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, scale, scale);
        
        // Draw X
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 5);
        ctx.lineTo(x + scale - 5, y + scale - 5);
        ctx.moveTo(x + scale - 5, y + 5);
        ctx.lineTo(x + 5, y + scale - 5);
        ctx.stroke();
    });
}
```

**3. Render empty cells in scan overlay:**

```javascript
function drawScan() {
    // ... existing code ...
    
    if (showOverlay && grid) {
        ctx.save();
        ctx.translate(/* ... */);
        ctx.scale(/* ... */);
        
        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const cellIdx = r * grid.cols + c;
                const x = c * cellW;
                const y = r * cellH;
                
                // Check if empty
                if (grid.empty_cells.includes(cellIdx)) {
                    // Grey border for empty cells
                    ctx.strokeStyle = 'rgba(128, 128, 128, 0.8)';
                    ctx.lineWidth = 3 / scale;
                    ctx.strokeRect(x, y, cellW, cellH);
                    
                    // Draw X
                    ctx.strokeStyle = '#888';
                    ctx.lineWidth = 2 / scale;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + cellW, y + cellH);
                    ctx.moveTo(x + cellW, y);
                    ctx.lineTo(x, y + cellH);
                    ctx.stroke();
                } else {
                    // Red border for filled cells
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                    ctx.lineWidth = 2 / scale;
                    ctx.strokeRect(x, y, cellW, cellH);
                    
                    // Green sampling area
                    const dead = deadSpace / 100;
                    const dx = cellW * (1 - dead) / 2;
                    const dy = cellH * (1 - dead) / 2;
                    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
                    ctx.lineWidth = 1 / scale;
                    ctx.strokeRect(x + dx, y + dy, cellW * dead, cellH * dead);
                }
            }
        }
        
        ctx.restore();
    }
}
```

**4. Skip empty cells during scan analysis:**

```javascript
function extractColours() {
    const colours = [];
    const cellW = scan.img.width / grid.cols;
    const cellH = scan.img.height / grid.rows;
    const dead = deadSpace / 100;
    
    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            const cellIdx = r * grid.cols + c;
            
            // SKIP EMPTY CELLS
            if (grid.empty_cells.includes(cellIdx)) {
                continue;  // Don't extract, don't add to palette
            }
            
            // Extract colour from this cell
            const x = align.offsetX + c * cellW * align.scaleX;
            const y = align.offsetY + r * cellH * align.scaleY;
            // ... rest of extraction ...
            
            colours.push(rgb);
            
            const key = rgb_to_key(rgb);
            sequence_colour_map.set(key, {
                sequence: grid.seqs[cellIdx],
                colours: grid.colours,
                grid_position: {row: r, col: c, index: cellIdx}
            });
        }
    }
    
    return colours;
}
```

#### Implementation Steps

1. **Add empty_cells calculation to generateGrid():**
```javascript
function generateGrid() {
    // ... existing code ...
    
    grid = {
        seqs,
        rows,
        cols,
        tile,
        gap,
        colours: sel.map(i => COLOURS[i]),
        width: cols * (tile + gap) - gap,
        height: rows * (tile + gap) - gap,
        empty_cells: Array.from(
            {length: rows * cols - seqs.length},
            (_, i) => seqs.length + i
        )
    };
}
```

2. **Update drawGrid() to show empty cells**

3. **Update drawScan() to show empty cells in overlay**

4. **Update extractColours() to skip empty cells**

5. **Update tile click handler to ignore empty cells:**
```javascript
function setupGridClick() {
    const canvas = document.getElementById('gridCanvas');
    canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / grid.cols;
        const col = Math.floor((e.clientX - rect.left) / scale);
        const row = Math.floor((e.clientY - rect.top) / scale);
        const cellIdx = row * grid.cols + col;
        
        // Ignore empty cells
        if (grid.empty_cells.includes(cellIdx)) {
            return;
        }
        
        if (cellIdx < grid.seqs.length) {
            showSequencePopup(grid.seqs[cellIdx]);
        }
    });
}
```

#### Testing Criteria

- [ ] Grid preview shows empty cells with grey + X
- [ ] Scan overlay shows empty cells with grey + X
- [ ] Analysis extracts exactly 340 colours (not 342)
- [ ] Clicking empty cell does nothing (no popup)
- [ ] Clicking filled cell shows correct sequence
- [ ] Cell (1,1) maps to sequence index calculated correctly

---

### ISSUE #3: Tile Click Handler Not Connected 🔴

**Severity:** CRITICAL - Missing core feature  
**Affected Features:** Grid interactivity, Sequence popup

#### Problem Explanation

The grid preview canvas exists and displays sequences, but clicking tiles does nothing. The `tile_click_handler` mechanism is defined in the logic but never connected to the canvas click event.

**Current State:**
- Canvas renders correctly
- Click events not bound
- No way to see sequence details

#### Solution

**Add click event listener to grid canvas:**

```javascript
function setupGridClick() {
    const canvas = document.getElementById('gridCanvas');
    
    canvas.addEventListener('click', e => {
        if (!grid || !grid.seqs) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Calculate cell size (accounting for zoom/offset)
        const cellScale = Math.min(
            canvas.parentElement.clientWidth / grid.cols,
            canvas.parentElement.clientHeight / grid.rows
        ) * gridView.scale;
        
        // Adjust for canvas position
        const canvasOffsetX = parseFloat(canvas.style.left) || 0;
        const canvasOffsetY = parseFloat(canvas.style.top) || 0;
        
        const adjustedX = clickX - canvasOffsetX;
        const adjustedY = clickY - canvasOffsetY;
        
        // Calculate which cell was clicked
        const col = Math.floor(adjustedX / cellScale);
        const row = Math.floor(adjustedY / cellScale);
        
        // Bounds check
        if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) {
            return;
        }
        
        const cellIdx = row * grid.cols + col;
        
        // Check if empty cell
        if (grid.empty_cells && grid.empty_cells.includes(cellIdx)) {
            msg(1, 'Empty cell - no sequence', 'info');
            return;
        }
        
        // Check if valid sequence
        if (cellIdx >= grid.seqs.length) {
            return;
        }
        
        // Show sequence popup
        const sequence = grid.seqs[cellIdx];
        showSequencePopup(sequence, {row, col, index: cellIdx});
    });
}
```

**Create comprehensive showSequencePopup function:**

```javascript
function showSequencePopup(sequence, position) {
    // Calculate simulated colour
    const colour = simColour(sequence, grid.colours);
    
    // Populate popup
    document.getElementById('popRGB').textContent = 
        `rgb(${colour.r}, ${colour.g}, ${colour.b})`;
    document.getElementById('popSeq').textContent = 
        `[${sequence.join(', ')}]`;
    
    // Add position info
    if (position) {
        const posInfo = document.createElement('div');
        posInfo.textContent = `Position: Row ${position.row}, Col ${position.col} (Index ${position.index})`;
        posInfo.style.fontSize = '0.75em';
        posInfo.style.color = '#666';
        posInfo.style.marginTop = '4px';
        document.getElementById('popSeq').parentElement.appendChild(posInfo);
    }
    
    // Build layer display
    const layersDiv = document.getElementById('popLayers');
    layersDiv.innerHTML = '';
    
    sequence.forEach((filIdx, layerIdx) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer';
        
        if (filIdx === 0) {
            layerDiv.innerHTML = `
                <div class="layer-box" style="background:#fff;border:2px dashed #999"></div>
                <span>Layer ${layerIdx}: Empty</span>
            `;
        } else {
            const col = grid.colours[filIdx - 1];
            layerDiv.innerHTML = `
                <div class="layer-box" style="background:${col.h}"></div>
                <span>Layer ${layerIdx}: ${col.n}</span>
            `;
        }
        
        layersDiv.appendChild(layerDiv);
    });
    
    // Show popup
    document.getElementById('popup').classList.add('show');
}
```

**Call setup after grid generation:**

```javascript
function generateGrid() {
    // ... existing code ...
    
    drawGrid();
    setupGridClick();  // ADD THIS
    
    // ... rest of code ...
}
```

#### Implementation Steps

1. **Add setupGridClick() function**
2. **Add showSequencePopup() function** 
3. **Call setupGridClick() after drawGrid() in generateGrid()**
4. **Ensure popup HTML exists** (it does)

#### Testing Criteria

- [ ] Click any grid tile → Popup appears
- [ ] Popup shows correct RGB colour
- [ ] Popup shows correct sequence [1,2,3,0]
- [ ] Popup shows all layers with names
- [ ] Click empty cell → No popup or info message
- [ ] Close button works

---

## IMPORTANT ISSUES

These issues prevent features from working but don't break core workflow.

---

### ISSUE #4: Image Preview Missing on Upload 🟡

**Severity:** IMPORTANT - Missing UX feature  
**Affected Features:** Image quantisation preview

#### Problem Explanation

When uploading an artwork image for quantisation, nothing appears in the "Original" canvas until quantisation is performed. Users can't verify they uploaded the correct image.

**Expected Behavior:**
```
1. User clicks "Upload Image"
2. Selects file
3. Original canvas immediately shows the image
4. Quantise button becomes enabled
```

**Current Behavior:**
```
1. User clicks "Upload Image"
2. Selects file
3. Nothing happens (no preview)
4. User confused if upload worked
```

#### Solution

**Update loadImage function to show preview:**

```javascript
function loadImage() {
    const f = document.getElementById('imgFile').files[0];
    if (!f) return;
    
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            // Store image data
            quant = {img};
            
            // Show preview in original canvas
            const origCanvas = document.getElementById('origCanvas');
            const origCtx = origCanvas.getContext('2d');
            
            // Set canvas pixel dimensions to match image
            origCanvas.width = img.width;
            origCanvas.height = img.height;
            
            // Set CSS display to fill container
            origCanvas.style.width = '100%';
            origCanvas.style.height = '100%';
            origCanvas.style.objectFit = 'contain';
            
            // Draw image
            origCtx.drawImage(img, 0, 0);
            
            // Enable quantise button if palette exists
            document.getElementById('quantBtn').disabled = !pal;
            
            // Update min detail display
            updateMinDetail();
            
            // Show quantisation options box
            document.getElementById('quantBox').classList.remove('hidden');
            
            // Update palette preview
            updateQuantPalette();
            
            msg(3, `✓ Loaded image: ${img.width}×${img.height} pixels`, 'ok');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(f);
}
```

**Add palette preview function:**

```javascript
function updateQuantPalette() {
    if (!pal) return;
    
    const maxC = +document.getElementById('maxColours').value || pal.length;
    const qp = document.getElementById('quantPalette');
    qp.innerHTML = '';
    
    pal.slice(0, maxC).forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.background = `rgb(${c.r},${c.g},${c.b})`;
        swatch.style.width = '30px';
        swatch.style.height = '30px';
        swatch.title = `rgb(${c.r},${c.g},${c.b})`;
        qp.appendChild(swatch);
    });
}
```

#### Implementation Steps

1. **Update loadImage() to show preview immediately**
2. **Add updateQuantPalette() function**
3. **Ensure quantBox visibility controlled properly**

#### Testing Criteria

- [ ] Upload image → Original canvas shows image immediately
- [ ] Image aspect ratio preserved (not distorted)
- [ ] Quantise button enables if palette exists
- [ ] Palette preview shows colors being used

---

### ISSUE #5: Max Colours Not Defaulting to Palette Length 🟡

**Severity:** IMPORTANT - Wrong default value  
**Affected Features:** Image quantisation

#### Problem Explanation

The "Max Colours" input is hard-coded to 4, even when the extracted palette has 340 colours. This limits quantisation unnecessarily.

**Current:**
```
Extract 340 colours → Max Colours = 4 (hard-coded)
User must manually change to 340
```

**Expected:**
```
Extract 340 colours → Max Colours = 340 (automatic)
User can reduce if desired
```

#### Solution

**Update analyseScan to set max colours:**

```javascript
function analyseScan() {
    // ... existing extraction code ...
    
    pal = extractColours();
    displayPalette();
    
    // Set max colours to palette length
    document.getElementById('maxColours').value = pal.length;
    
    // Update stats
    document.getElementById('scannedCount').textContent = pal.length;
    document.getElementById('uniqueCount').textContent = pal.length;
    document.getElementById('dupsCount').textContent = 0;
    
    msg(2, `✓ Extracted ${pal.length} colours`, 'ok');
}
```

**Update removeDuplicates to update max colours:**

```javascript
function removeDuplicates() {
    if (!pal) return;
    
    const unique = [];
    const seen = new Set();
    
    pal.forEach(c => {
        const key = rgb_to_key(c);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(c);
        }
    });
    
    const removed = pal.length - unique.length;
    pal = unique;
    
    displayPalette();
    
    // Update max colours to new length
    document.getElementById('maxColours').value = pal.length;
    
    // Update stats
    document.getElementById('uniqueCount').textContent = unique.length;
    document.getElementById('dupsCount').textContent = removed;
    
    msg(2, `✓ Removed ${removed} duplicates`, 'ok');
}
```

#### Implementation Steps

1. **Update analyseScan() to set maxColours.value**
2. **Update removeDuplicates() to update maxColours.value**
3. **Remove hard-coded default value from HTML** (or keep as fallback)

#### Testing Criteria

- [ ] Analyse scan with 340 colours → Max Colours = 340
- [ ] Remove duplicates → Max Colours updates to new count
- [ ] User can still manually change value
- [ ] Quantisation uses correct palette size

---

### ISSUE #6: GPL Palette Import Missing 🟡

**Severity:** IMPORTANT - Missing feature  
**Affected Features:** Palette management, Custom workflows

#### Problem Explanation

Users may want to use a custom palette from another source (e.g., pre-defined palette, different calibration grid, manual creation). The UI and mechanism for importing .gpl files is missing.

**Use Cases:**
- Import palette from previous calibration
- Use manually created palette
- Use palette from other tools
- Test with limited colour sets

#### Solution

**Add palette source UI:**

```html
<!-- In Step 3, before quantisation options -->
<div class="box">
    <h3>Palette Source</h3>
    <label>
        <input type="radio" name="palSrc" value="extracted" checked onchange="updatePaletteSource()">
        Use Extracted Palette (from scan)
    </label>
    <label>
        <input type="radio" name="palSrc" value="imported" onchange="updatePaletteSource()">
        Import GPL Palette
    </label>
    <input type="file" id="importGPL" accept=".gpl" style="display:none" onchange="importGPLPalette()">
    <button id="importGPLBtn" onclick="document.getElementById('importGPL').click()" disabled>
        Import GPL File
    </button>
    <div id="paletteSummary" style="margin-top:8px;font-size:0.85em;color:#666"></div>
</div>
```

**Add palette source management:**

```javascript
let activePalette = null;  // Current palette for quantisation
let paletteSource = 'extracted';  // 'extracted' or 'imported'

function updatePaletteSource() {
    const radios = document.getElementsByName('palSrc');
    let selected = Array.from(radios).find(r => r.checked).value;
    paletteSource = selected;
    
    const importBtn = document.getElementById('importGPLBtn');
    
    if (selected === 'extracted') {
        // Use extracted palette
        activePalette = pal;
        importBtn.disabled = true;
        updatePaletteSummary(`Using extracted palette: ${pal ? pal.length : 0} colours`);
    } else {
        // Enable import
        importBtn.disabled = false;
        updatePaletteSummary('Click "Import GPL File" to load palette');
    }
    
    // Update max colours
    if (activePalette) {
        document.getElementById('maxColours').value = activePalette.length;
        updateQuantPalette();
    }
}

function updatePaletteSummary(text) {
    document.getElementById('paletteSummary').textContent = text;
}
```

**Add GPL import function:**

```javascript
function importGPLPalette() {
    const file = document.getElementById('importGPL').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const gpl = parseGPL(e.target.result);
            
            if (gpl.length === 0) {
                msg(3, 'No colours found in GPL file', 'err');
                return;
            }
            
            activePalette = gpl;
            
            // Update UI
            document.getElementById('maxColours').value = gpl.length;
            updatePaletteSummary(`Imported palette: ${gpl.length} colours from ${file.name}`);
            updateQuantPalette();
            
            // Enable quantise if image loaded
            if (quant && quant.img) {
                document.getElementById('quantBtn').disabled = false;
            }
            
            msg(3, `✓ Imported ${gpl.length} colours from ${file.name}`, 'ok');
            
        } catch (err) {
            msg(3, `Error parsing GPL: ${err.message}`, 'err');
        }
    };
    reader.readAsText(file);
}
```

**Add GPL parser:**

```javascript
function parseGPL(text) {
    const lines = text.split('\n');
    const palette = [];
    
    for (let line of lines) {
        line = line.trim();
        
        // Skip comments, headers, empty lines
        if (!line || line.startsWith('#') || 
            line.startsWith('GIMP') || 
            line.startsWith('Name:') || 
            line.startsWith('Columns:')) {
            continue;
        }
        
        // Parse RGB values
        // Format: "R G B [Name]" e.g., "255 128 64 Orange"
        const parts = line.split(/\s+/);
        
        if (parts.length >= 3) {
            const r = parseInt(parts[0]);
            const g = parseInt(parts[1]);
            const b = parseInt(parts[2]);
            
            // Validate RGB values
            if (r >= 0 && r <= 255 && 
                g >= 0 && g <= 255 && 
                b >= 0 && b <= 255) {
                palette.push({r, g, b});
            }
        }
    }
    
    return palette;
}
```

**Update quantiseImage to use activePalette:**

```javascript
function quantiseImage() {
    // Determine which palette to use
    let usePalette;
    if (paletteSource === 'imported' && activePalette) {
        usePalette = activePalette;
    } else if (pal) {
        usePalette = pal;
    } else {
        msg(3, 'No palette available', 'err');
        return;
    }
    
    const maxC = +document.getElementById('maxColours').value;
    usePalette = usePalette.slice(0, maxC);
    
    // ... rest of quantisation ...
}
```

#### Implementation Steps

1. **Add palette source HTML**
2. **Add activePalette state variable**
3. **Add updatePaletteSource() function**
4. **Add importGPLPalette() function**
5. **Add parseGPL() function**
6. **Update quantiseImage() to use activePalette**

#### Testing Criteria

- [ ] Radio buttons switch between extracted/imported
- [ ] Import button enables when "Import GPL" selected
- [ ] Import GPL file → Palette loads
- [ ] Palette summary shows colour count
- [ ] Quantisation uses imported palette
- [ ] Can switch back to extracted palette

---

### ISSUE #7: Canvas Dimensions Cause Distortion 🟡

**Severity:** IMPORTANT - Visual quality issue  
**Affected Features:** Image display, Quantisation preview

#### Problem Explanation

Canvas has two sets of dimensions:
1. **Pixel dimensions** (`canvas.width` / `canvas.height`) - Drawing resolution
2. **CSS dimensions** (`canvas.style.width` / `canvas.style.height`) - Display size

**Correct approach:**
```javascript
canvas.width = image.width;           // Drawing resolution
canvas.height = image.height;
canvas.style.width = '100%';          // Display size
canvas.style.height = '100%';
canvas.style.objectFit = 'contain';   // Preserve aspect
```

**Wrong approach (causes distortion):**
```javascript
canvas.width = containerWidth;   // Wrong!
canvas.height = containerHeight; // Wrong!
```

When pixel dimensions don't match display dimensions with different aspect ratios, the image gets stretched/squashed.

#### Solution

**Standard canvas setup pattern:**

```javascript
function setupCanvas(canvasId, image) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    // Set pixel dimensions to match image
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Set CSS to fill container while preserving aspect
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';
    
    // Draw image at native resolution
    ctx.drawImage(image, 0, 0);
    
    return {canvas, ctx};
}
```

**Update all canvas rendering:**

```javascript
// Grid preview - different approach (scale appropriately)
function drawGrid() {
    const canvas = document.getElementById('gridCanvas');
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Calculate scale to fit container
    const cellScale = Math.min(
        container.clientWidth / grid.cols,
        container.clientHeight / grid.rows
    ) * gridView.scale;
    
    // Set canvas pixel dimensions
    canvas.width = grid.cols * cellScale;
    canvas.height = grid.rows * cellScale;
    
    // Position canvas in center of container
    canvas.style.left = ((container.clientWidth - canvas.width) / 2 + gridView.offsetX) + 'px';
    canvas.style.top = ((container.clientHeight - canvas.height) / 2 + gridView.offsetY) + 'px';
    
    // NO style.width/height here - canvas displays at pixel size
    
    // Draw grid...
}

// Image canvases - maintain native resolution
function loadImage() {
    // ... load image ...
    img.onload = () => {
        const {canvas, ctx} = setupCanvas('origCanvas', img);
        msg(3, `✓ Loaded: ${img.width}×${img.height}px`, 'ok');
    };
}

function quantiseImage() {
    // ... quantise ...
    const {canvas, ctx} = setupCanvas('quantCanvas', quantCanvas);
    ctx.putImageData(imageData, 0, 0);
}
```

**Update CSS for canvas containers:**

```css
.canvas-wrap {
    position: relative;
    background: #f5f5f5;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
    width: 100%;
    height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.canvas-wrap canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;  /* Preserve aspect ratio */
}
```

#### Implementation Steps

1. **Create setupCanvas() helper function**
2. **Update drawGrid() to not set style.width/height**
3. **Update loadImage() to use setupCanvas()**
4. **Update quantiseImage() to use setupCanvas()**
5. **Update CSS to ensure containers use flexbox centering**

#### Testing Criteria

- [ ] Load square image → Displays square (not distorted)
- [ ] Load portrait image → Displays tall (not stretched)
- [ ] Load landscape image → Displays wide (not squashed)
- [ ] Quantised image matches original aspect ratio
- [ ] Grid preview displays without distortion
- [ ] Scan displays without distortion

---

### ISSUE #8: Min Detail Filter Not Visualized 🟡

**Severity:** IMPORTANT - Missing feedback  
**Affected Features:** Quantisation, Min detail filtering

#### Problem Explanation

The min detail filter removes small colour regions, but there's no visual indication of which pixels were filtered. Users can't see if the filter is working or if the threshold is appropriate.

**Expected Behavior:**
- Filtered pixels shown semi-transparent (alpha = 128)
- Clear visual distinction between kept and filtered pixels
- User can adjust min detail and see effect

**Current Behavior:**
- Filtered pixels look the same as kept pixels
- No way to verify filter is working

#### Solution

**Update quantiseImage to preserve alpha channel:**

```javascript
function quantiseData(imgData, palette, dither, mask) {
    const data = imgData.data;
    const w = imgData.width;
    const h = imgData.height;
    
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const pixelIdx = y * w + x;
            const dataIdx = pixelIdx * 4;
            
            const r = data[dataIdx];
            const g = data[dataIdx + 1];
            const b = data[dataIdx + 2];
            
            const closest = findClosest({r, g, b}, palette);
            
            data[dataIdx] = closest.r;
            data[dataIdx + 1] = closest.g;
            data[dataIdx + 2] = closest.b;
            
            // Set alpha based on filter mask
            if (mask && mask[pixelIdx] === 0) {
                // Filtered pixel - semi-transparent
                data[dataIdx + 3] = 128;  // 50% opacity
            } else {
                // Kept pixel - full opacity
                data[dataIdx + 3] = 255;
            }
            
            // Dithering...
            if (dither && (!mask || mask[pixelIdx] === 1)) {
                const er = r - closest.r;
                const eg = g - closest.g;
                const eb = b - closest.b;
                distributeError(data, w, h, x, y, er, eg, eb);
            }
        }
    }
}
```

**Add visual indicator option:**

```html
<!-- In quantisation options -->
<label>
    <input type="checkbox" id="showFiltered" onchange="updateQuantDisplay()">
    Show Filtered Pixels (semi-transparent)
</label>
```

**Add toggle function:**

```javascript
function updateQuantDisplay() {
    if (!quant || !quant.result) return;
    
    const showFiltered = document.getElementById('showFiltered').checked;
    const canvas = document.getElementById('quantCanvas');
    const ctx = canvas.getContext('2d');
    
    if (showFiltered) {
        // Show with alpha channel
        ctx.putImageData(quant.result, 0, 0);
    } else {
        // Show all pixels as opaque
        const displayData = ctx.createImageData(quant.result.width, quant.result.height);
        for (let i = 0; i < quant.result.data.length; i += 4) {
            displayData.data[i] = quant.result.data[i];
            displayData.data[i + 1] = quant.result.data[i + 1];
            displayData.data[i + 2] = quant.result.data[i + 2];
            displayData.data[i + 3] = 255;  // Force opaque
        }
        ctx.putImageData(displayData, 0, 0);
    }
}
```

**Add checkerboard background to show transparency:**

```css
.canvas-wrap canvas.show-alpha {
    background-image: 
        linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
        linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
        linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}
```

**Add statistics display:**

```javascript
function displayMinDetailStats(mask) {
    if (!mask) return;
    
    const total = mask.length;
    const filtered = mask.filter(v => v === 0).length;
    const kept = total - filtered;
    const filterPercent = ((filtered / total) * 100).toFixed(1);
    
    const statsDiv = document.getElementById('minDetailStats');
    statsDiv.innerHTML = `
        <strong>Min Detail Filter:</strong><br>
        Kept: ${kept.toLocaleString()} pixels (${(100 - filterPercent).toFixed(1)}%)<br>
        Filtered: ${filtered.toLocaleString()} pixels (${filterPercent}%)
    `;
}
```

#### Implementation Steps

1. **Update quantiseData() to set alpha channel**
2. **Add showFiltered checkbox**
3. **Add updateQuantDisplay() function**
4. **Add checkerboard background CSS**
5. **Add min detail statistics display**
6. **Call displayMinDetailStats() after filtering**

#### Testing Criteria

- [ ] Apply min detail filter → Stats show filtered count
- [ ] Check "Show Filtered" → Filtered pixels semi-transparent
- [ ] Uncheck "Show Filtered" → All pixels opaque
- [ ] Checkerboard background visible through filtered pixels
- [ ] Adjust min detail → Statistics update
- [ ] Export layers → Filtered pixels handled correctly

---

## MINOR ISSUES

These are polish and UX improvements.

---

### ISSUE #9: Grid Borders Create Bevel Appearance 🟢

**Severity:** MINOR - Aesthetic confusion  
**Affected Features:** Grid preview visual appearance

#### Problem Explanation

Light grey borders around grid tiles create an optical illusion of beveling, making it look like tiles have 3D chamfered edges. This is just visual but causes confusion about whether beveling is implemented.

**Current:**
```javascript
ctx.strokeStyle = '#999';  // Light grey
ctx.lineWidth = 1;
ctx.strokeRect(x, y, scale, scale);
```

This creates a light line that contrasts with darker colours, appearing raised.

#### Solution Options

**Option A: Remove borders entirely**
```javascript
// Don't draw borders - tiles touch directly
// Clean, minimal look
// May be harder to distinguish adjacent similar colours
```

**Option B: Use darker borders**
```javascript
ctx.strokeStyle = '#666';  // Darker grey
ctx.lineWidth = 1;
// Less "3D" appearance
```

**Option C: Use very thin borders**
```javascript
ctx.strokeStyle = '#999';
ctx.lineWidth = 0.5;  // Thinner
// More subtle
```

**Option D: Make borders optional**
```html
<label>
    <input type="checkbox" id="showBorders" checked onchange="drawGrid()">
    Show Grid Borders
</label>
```

```javascript
function drawGrid() {
    // ... draw tiles ...
    
    if (document.getElementById('showBorders').checked) {
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, scale, scale);
    }
}
```

#### Recommendation

**Use Option B (darker borders)** - Provides clear delineation without 3D effect:

```javascript
function drawGrid() {
    // ... existing code ...
    
    // Draw tile
    ctx.fillStyle = tileColour;
    ctx.fillRect(x, y, scale, scale);
    
    // Darker border - less "bevel" appearance
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, scale, scale);
}
```

#### Testing Criteria

- [ ] Grid tiles clearly delineated
- [ ] No appearance of 3D beveling
- [ ] Borders visible on both light and dark tiles
- [ ] Clean, professional appearance

---

### ISSUE #10: Layer Stack Visualization Missing 🟢

**Severity:** MINOR - Nice-to-have feature  
**Affected Features:** Grid preview, Visual feedback

#### Problem Explanation

Currently, grid tiles show the simulated averaged colour. It would be more insightful to visualize the actual layer stack - showing each layer as a horizontal band within the tile.

**Current:** Each tile is solid colour (average of layers)  
**Proposed:** Each tile shows stacked rectangles representing layers

**Example:**
```
Sequence [1, 2, 3, 0] (Cyan, Magenta, Yellow, Empty)

Current display:      Proposed display:
┌────────────┐       ┌────────────┐
│            │       │   Cyan     │ ← Layer 0
│   Grey     │       ├────────────┤
│  (average) │       │  Magenta   │ ← Layer 1
│            │       ├────────────┤
└────────────┘       │  Yellow    │ ← Layer 2
                     ├────────────┤
                     │  (empty)   │ ← Layer 3
                     └────────────┘
```

#### Solution

**Update render_grid_with_layers mechanism:**

```javascript
function drawGrid() {
    // ... existing setup ...
    
    grid.seqs.forEach((seq, seqIdx) => {
        const row = Math.floor(seqIdx / grid.cols);
        const col = seqIdx % grid.cols;
        const x = col * cellScale;
        const y = row * cellScale;
        
        // Count non-empty layers
        const nonEmptyLayers = seq.filter(v => v > 0);
        const layerCount = nonEmptyLayers.length || 1;
        const layerHeight = cellScale / layerCount;
        
        // Draw each layer as horizontal band
        nonEmptyLayers.forEach((filIdx, layerIdx) => {
            const colour = grid.colours[filIdx - 1];
            const layerY = y + layerIdx * layerHeight;
            
            ctx.fillStyle = colour.h;
            ctx.fillRect(x, y + layerIdx * layerHeight, cellScale, layerHeight);
        });
        
        // If all empty, show white
        if (nonEmptyLayers.length === 0) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(x, y, cellScale, cellScale);
        }
        
        // Border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellScale, cellScale);
    });
    
    // Empty cells with X...
}
```

**Add toggle option:**

```html
<label>
    <input type="checkbox" id="showLayers" onchange="drawGrid()">
    Show Layer Stack (experimental)
</label>
```

```javascript
function drawGrid() {
    const showLayers = document.getElementById('showLayers')?.checked || false;
    
    grid.seqs.forEach((seq, seqIdx) => {
        // ... calculate position ...
        
        if (showLayers) {
            // Draw stacked layers
            const nonEmpty = seq.filter(v => v > 0);
            const layerCount = nonEmpty.length || 1;
            const layerH = cellScale / layerCount;
            
            nonEmpty.forEach((filIdx, i) => {
                ctx.fillStyle = grid.colours[filIdx - 1].h;
                ctx.fillRect(x, y + i * layerH, cellScale, layerH);
            });
        } else {
            // Draw averaged colour (current method)
            const avgColour = simColour(seq, grid.colours);
            ctx.fillStyle = `rgb(${avgColour.r},${avgColour.g},${avgColour.b})`;
            ctx.fillRect(x, y, cellScale, cellScale);
        }
        
        // Border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellScale, cellScale);
    });
}
```

#### Benefits

- **Visual insight:** See actual layer composition
- **Verification:** Confirm sequences are correct
- **Understanding:** Better grasp of how colours mix
- **Debugging:** Identify sequence generation issues

#### Implementation Steps

1. **Add showLayers checkbox to grid preview**
2. **Update drawGrid() to check showLayers state**
3. **Implement layer stacking rendering**
4. **Default to OFF (use averaged colour)**
5. **Add tooltip explaining the feature**

#### Testing Criteria

- [ ] Default view shows averaged colours
- [ ] Enable "Show Layers" → Tiles show horizontal bands
- [ ] Each band colour matches layer filament
- [ ] Empty layers don't show (or show as white)
- [ ] 1-layer sequences show solid colour
- [ ] 4-layer sequences show 4 equal bands

---

## IMPLEMENTATION STRATEGY

### Phase 1: Critical Fixes (Must Have) 🔴

**Priority:** IMMEDIATE  
**Time Estimate:** 4-6 hours

1. **rgb_to_key() standardization**
   - Add function at top of script
   - Update all usage locations (3-4 places)
   - Test key matching works
   - **Impact:** Fixes sequence lookup and print files

2. **empty_cells implementation**
   - Add to grid generation
   - Update grid preview rendering
   - Update scan overlay rendering
   - Update scan analysis (skip empties)
   - **Impact:** Fixes 1:1 mapping and alignment

3. **tile_click_handler connection**
   - Add setupGridClick() function
   - Add showSequencePopup() function
   - Connect to canvas events
   - **Impact:** Enables tile interactivity

**Success Criteria:**
- Click palette swatch → See correct sequence ✓
- Scan overlay shows 340 filled + 2 empty cells ✓
- Click grid tile → See sequence popup ✓
- Generate print files → All show content ✓

---

### Phase 2: Important Features (Should Have) 🟡

**Priority:** HIGH  
**Time Estimate:** 3-4 hours

4. **Image preview on upload**
   - Update loadImage() function
   - Add setupCanvas() helper
   - Show in original canvas immediately
   - **Impact:** Better UX, verify upload

5. **Max colours auto-default**
   - Update analyseScan()
   - Update removeDuplicates()
   - Set to palette length automatically
   - **Impact:** Correct default behavior

6. **GPL palette import**
   - Add UI (radio buttons + file input)
   - Add parseGPL() function
   - Add palette source management
   - Update quantisation to use active palette
   - **Impact:** Enable custom palettes

7. **Canvas dimensions fix**
   - Create setupCanvas() helper
   - Update all canvas rendering
   - Ensure aspect ratio preserved
   - **Impact:** No image distortion

8. **Min detail visualization**
   - Update quantiseData() to set alpha
   - Add showFiltered checkbox
   - Add statistics display
   - **Impact:** Visual feedback for filtering

**Success Criteria:**
- Upload image → Preview shows immediately ✓
- Analyse scan → Max colours = palette length ✓
- Import GPL → Palette loads and works ✓
- Display images → No distortion ✓
- Min detail filter → See filtered pixels ✓

---

### Phase 3: Polish & UX (Nice to Have) 🟢

**Priority:** MEDIUM  
**Time Estimate:** 1-2 hours

9. **Grid border adjustment**
   - Change to darker colour (#666)
   - Or add toggle option
   - **Impact:** Less confusing appearance

10. **Layer stack visualization**
    - Add showLayers checkbox
    - Implement horizontal band rendering
    - Default to OFF
    - **Impact:** Better visual understanding

**Success Criteria:**
- Grid looks professional ✓
- Optional layer visualization works ✓

---

## TESTING CHECKLIST

### Pre-Implementation Tests (Current State)

- [ ] Generate grid → Does it display?
- [ ] Click grid tile → Does popup show?
- [ ] Analyse scan → Extract 340 or 342 colours?
- [ ] Click palette swatch → Does popup show sequence?
- [ ] Quantise image → Do print files show content?
- [ ] Upload image → Does preview show?

### Post-Phase-1 Tests (Critical Fixes)

**rgb_to_key():**
- [ ] Generate grid → Sequences created
- [ ] Analyse scan → Palette extracted
- [ ] Click palette swatch → Popup shows correct sequence
- [ ] Console shows no "sequence not found" errors
- [ ] sequence_colour_map has correct keys (check in console)

**empty_cells:**
- [ ] Grid preview shows 340 filled + 2 empty (grey + X)
- [ ] Scan overlay shows 340 filled + 2 empty
- [ ] Analyse scan extracts exactly 340 colours
- [ ] Statistics show 340 scanned (not 342)
- [ ] Export palette has 340 colours

**tile_click_handler:**
- [ ] Click any filled grid tile → Popup appears
- [ ] Popup shows correct RGB
- [ ] Popup shows correct sequence [1,2,3,0]
- [ ] Popup shows all layer names
- [ ] Click empty cell → No popup (or info message)
- [ ] Close button works

### Post-Phase-2 Tests (Important Features)

**Image preview:**
- [ ] Upload image → Original canvas shows immediately
- [ ] Image not distorted
- [ ] Quantise button enables
- [ ] Message shows image dimensions

**Max colours:**
- [ ] Analyse scan → Max colours = palette length
- [ ] Remove duplicates → Max colours updates
- [ ] User can still change value manually

**GPL import:**
- [ ] Switch to "Import GPL" → Import button enables
- [ ] Import GPL file → Palette loads
- [ ] Palette summary shows count
- [ ] Quantisation uses imported palette
- [ ] Can switch back to extracted palette

**Canvas dimensions:**
- [ ] Load square image → Displays square
- [ ] Load portrait image → Displays tall
- [ ] Load landscape image → Displays wide
- [ ] No stretching or squashing

**Min detail visualization:**
- [ ] Apply filter → Statistics show filtered count
- [ ] Enable "Show Filtered" → Pixels semi-transparent
- [ ] Checkerboard visible through filtered pixels
- [ ] Adjust min detail → Effect visible

### Post-Phase-3 Tests (Polish)

**Grid borders:**
- [ ] Tiles clearly delineated
- [ ] No 3D bevel appearance
- [ ] Professional look

**Layer visualization:**
- [ ] Toggle "Show Layers" → Horizontal bands appear
- [ ] Each band shows correct colour
- [ ] Empty layers handled correctly
- [ ] Toggle OFF → Shows averaged colour

### Integration Tests (End-to-End)

**Complete workflow:**
1. [ ] Select 4 colours
2. [ ] Generate grid → 340 sequences in 19×18
3. [ ] Export STLs → 5 files (base + 4 colours)
4. [ ] Export reference image → Shows all sequences with labels
5. [ ] Upload scan
6. [ ] Click "Auto-Scale from A4" → Grid aligns
7. [ ] Analyse scan → Extract 340 colours
8. [ ] Click any palette swatch → See correct sequence
9. [ ] Upload artwork image → Preview shows
10. [ ] Import GPL palette → Loads correctly
11. [ ] Quantise image → Dithering + min detail work
12. [ ] View print file previews → All show content
13. [ ] Export layer PNGs → 4 files download
14. [ ] Import to slicer → Files work correctly

---

## SUMMARY

### Critical Issues (Must Fix)
1. ❌ rgb_to_key() inconsistency
2. ❌ empty_cells not implemented
3. ❌ tile_click_handler not connected

### Important Issues (Should Fix)
4. ⚠️ Image preview missing
5. ⚠️ Max colours wrong default
6. ⚠️ GPL import missing
7. ⚠️ Canvas distortion
8. ⚠️ Min detail not visualized

### Minor Issues (Nice to Fix)
9. ✓ Grid borders look beveled
10. ✓ Layer visualization missing

### Estimated Total Time
- Phase 1 (Critical): 4-6 hours
- Phase 2 (Important): 3-4 hours
- Phase 3 (Polish): 1-2 hours
- **Total: 8-12 hours**

### Recommended Order
1. Fix rgb_to_key() → Unlocks sequence lookup
2. Implement empty_cells → Fixes alignment
3. Connect tile click → Basic interactivity working
4. **Test thoroughly** → Verify core workflow
5. Add image preview → Better UX
6. Fix canvas dimensions → No distortion
7. Add GPL import → Power user feature
8. Add min detail viz → Complete feedback
9. Polish appearance → Professional finish

---

**This document provides a complete roadmap for fixing all identified issues. Each issue includes detailed explanations, implementation code, and testing criteria.**
