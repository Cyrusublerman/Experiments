/**
 * Scan Analysis Module
 * Handles scan loading, alignment, and colour extraction
 */

import { grid, scan, scanView, align, isDragging, dragStart, showOverlay, pal, sequences,
         setScan, setScanView, setAlign, setIsDragging, setDragStart, setShowOverlay, setPal } from './state.js';
import { avgColour, rgb_to_key, msg } from './utils.js';

/**
 * Load scan image
 */
export function loadScan() {
    const f = document.getElementById('scanFile').files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            setScan({img});
            document.getElementById('analyseBtn').disabled = !grid;
            document.getElementById('overlayBtn').disabled = false;
            setScanView({scale: 1, panX: 0, panY: 0});
            drawScan();
            document.getElementById('scanBox').classList.remove('hidden');
            msg(2, '✓ Loaded. Use Auto-Scale or adjust alignment.', 'ok');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(f);
}

/**
 * Setup scan canvas drag functionality
 */
export function setupScanDrag() {
    const canvas = document.getElementById('scanCanvas');

    canvas.addEventListener('mousedown', e => {
        if (!showOverlay) return;
        setIsDragging(true);
        setDragStart({x: e.offsetX - align.offsetX, y: e.offsetY - align.offsetY});
    });

    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        setAlign({
            ...align,
            offsetX: e.offsetX - dragStart.x,
            offsetY: e.offsetY - dragStart.y
        });
        document.getElementById('offsetX').value = Math.round(align.offsetX);
        document.getElementById('offsetY').value = Math.round(align.offsetY);
        drawScan();
    });

    canvas.addEventListener('mouseup', () => {
        setIsDragging(false);
    });

    canvas.addEventListener('mouseleave', () => {
        setIsDragging(false);
    });
}

/**
 * Draw scan with optional grid overlay
 * CRITICAL FIX #2: Shows empty cells in overlay with grey + X
 */
export function drawScan() {
    if (!scan) return;

    const canvas = document.getElementById('scanCanvas');
    const ctx = canvas.getContext('2d');
    const wrap = canvas.parentElement;

    // Fit to container
    const scale = Math.min(
        wrap.clientWidth / scan.img.width,
        wrap.clientHeight / scan.img.height
    ) * scanView.scale;

    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;

    const imgW = scan.img.width * scale;
    const imgH = scan.img.height * scale;
    const imgX = (canvas.width - imgW) / 2 + scanView.panX;
    const imgY = (canvas.height - imgH) / 2 + scanView.panY;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(scan.img, imgX, imgY, imgW, imgH);

    // Draw overlay
    if (showOverlay && grid) {
        ctx.save();
        ctx.translate(imgX + align.offsetX * scale, imgY + align.offsetY * scale);
        ctx.scale(align.scaleX * scale, align.scaleY * scale);

        const cellW = scan.img.width / grid.cols;
        const cellH = scan.img.height / grid.rows;
        const deadSpace = +document.getElementById('deadSpace').value / 100;

        for (let r = 0; r < grid.rows; r++) {
            for (let c = 0; c < grid.cols; c++) {
                const cellIdx = r * grid.cols + c;
                const x = c * cellW;
                const y = r * cellH;

                // CRITICAL FIX #2: Check if empty cell
                if (grid.empty_cells && grid.empty_cells.includes(cellIdx)) {
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
                    const dx = cellW * (1 - deadSpace) / 2;
                    const dy = cellH * (1 - deadSpace) / 2;
                    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
                    ctx.lineWidth = 1 / scale;
                    ctx.strokeRect(x + dx, y + dy, cellW * deadSpace, cellH * deadSpace);
                }
            }
        }

        ctx.restore();
    }
}

/**
 * Toggle grid overlay visibility
 */
export function toggleOverlay() {
    setShowOverlay(!showOverlay);
    drawScan();
}

/**
 * Update alignment from input fields
 */
export function updateAlign() {
    setAlign({
        offsetX: +document.getElementById('offsetX').value,
        offsetY: +document.getElementById('offsetY').value,
        scaleX: +document.getElementById('scaleX').value,
        scaleY: +document.getElementById('scaleY').value
    });
    drawScan();
}

/**
 * Reset alignment to default
 */
export function resetAlign() {
    setAlign({offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1});
    document.getElementById('offsetX').value = 0;
    document.getElementById('offsetY').value = 0;
    document.getElementById('scaleX').value = 1;
    document.getElementById('scaleY').value = 1;
    drawScan();
}

/**
 * Auto-calculate scale from A4 dimensions
 */
export function autoScale() {
    if (!scan || !grid) return;

    // A4 dimensions in mm
    const a4W = +document.getElementById('scanW').value;
    const a4H = +document.getElementById('scanH').value;

    // Pixels per mm
    const pxPerMM_X = scan.img.width / a4W;
    const pxPerMM_Y = scan.img.height / a4H;

    // Grid dimensions in mm
    const gridMM_W = grid.cols * (grid.tile + grid.gap) - grid.gap;
    const gridMM_H = grid.rows * (grid.tile + grid.gap) - grid.gap;

    // Grid dimensions in pixels
    const gridPX_W = gridMM_W * pxPerMM_X;
    const gridPX_H = gridMM_H * pxPerMM_Y;

    // Calculate scale
    const scaleX = gridPX_W / scan.img.width;
    const scaleY = gridPX_H / scan.img.height;

    // Center alignment
    const offsetX = (scan.img.width - gridPX_W / scaleX) / 2;
    const offsetY = (scan.img.height - gridPX_H / scaleY) / 2;

    setAlign({
        scaleX: scaleX,
        scaleY: scaleY,
        offsetX: offsetX,
        offsetY: offsetY
    });

    document.getElementById('scaleX').value = scaleX.toFixed(3);
    document.getElementById('scaleY').value = scaleY.toFixed(3);
    document.getElementById('offsetX').value = Math.round(offsetX);
    document.getElementById('offsetY').value = Math.round(offsetY);

    drawScan();
    msg(2, '✓ Auto-scaled from A4 dimensions', 'ok');
}

/**
 * Zoom scan view
 * @param {number} factor - Zoom factor
 */
export function zoomScan(factor) {
    setScanView({...scanView, scale: scanView.scale * factor});
    drawScan();
}

/**
 * Pan scan view
 * @param {number} dx - X offset
 * @param {number} dy - Y offset
 */
export function panScan(dx, dy) {
    setScanView({...scanView, panX: scanView.panX + dx, panY: scanView.panY + dy});
    drawScan();
}

/**
 * Reset scan view
 */
export function resetScanView() {
    setScanView({scale: 1, panX: 0, panY: 0});
    drawScan();
}

/**
 * Analyse scan and extract colours
 * CRITICAL FIX #2: Skips empty cells during extraction
 * IMPORTANT FIX #5: Sets max colours to palette length
 */
export function analyseScan() {
    if (!scan || !grid) return;
    msg(2, 'Analysing...', 'info');

    setTimeout(() => {
        try {
            const extractedPal = extractColours();
            setPal(extractedPal);
            displayPalette();

            // IMPORTANT FIX #5: Set max colours to palette length
            document.getElementById('maxColours').value = extractedPal.length;

            document.getElementById('scannedCount').textContent = extractedPal.length;
            document.getElementById('uniqueCount').textContent = extractedPal.length;
            document.getElementById('dupsCount').textContent = 0;
            msg(2, `✓ Extracted ${extractedPal.length} colours`, 'ok');
        } catch (e) {
            msg(2, `Error: ${e.message}`, 'err');
        }
    }, 100);
}

/**
 * Extract colours from scan
 * CRITICAL FIX #2: Skips empty cells
 * CRITICAL FIX #1: Uses rgb_to_key() for standardized keys
 */
function extractColours() {
    const workCanvas = document.getElementById('work');
    const ctx = workCanvas.getContext('2d');
    workCanvas.width = scan.img.width;
    workCanvas.height = scan.img.height;
    ctx.drawImage(scan.img, 0, 0);

    const colours = [];
    const deadSpace = +document.getElementById('deadSpace').value / 100;
    const cellW = scan.img.width / grid.cols;
    const cellH = scan.img.height / grid.rows;

    for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
            const cellIdx = r * grid.cols + c;

            // CRITICAL FIX #2: Skip empty cells
            if (grid.empty_cells && grid.empty_cells.includes(cellIdx)) {
                continue;
            }

            const x = align.offsetX + c * cellW * align.scaleX;
            const y = align.offsetY + r * cellH * align.scaleY;
            const w = cellW * align.scaleX;
            const h = cellH * align.scaleY;

            const cx = x + w / 2;
            const cy = y + h / 2;
            const sw = w * deadSpace;
            const sh = h * deadSpace;

            try {
                const imgData = ctx.getImageData(cx - sw / 2, cy - sh / 2, sw, sh);
                const rgb = avgColour(imgData);
                colours.push(rgb);

                // Store in sequences map with standardized key
                const key = rgb_to_key(rgb);  // CRITICAL FIX #1
                sequences.set(key, {
                    sequence: grid.seqs[cellIdx],
                    colours: grid.colours,
                    grid_position: {row: r, col: c, index: cellIdx}
                });
            } catch (e) {
                colours.push({r: 128, g: 128, b: 128});
            }
        }
    }

    return colours;
}

/**
 * Display extracted palette
 */
function displayPalette() {
    const paletteDiv = document.getElementById('palette');
    paletteDiv.innerHTML = '';

    pal.forEach((c, i) => {
        const swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.background = `rgb(${c.r},${c.g},${c.b})`;
        swatch.title = `#${i}: rgb(${c.r},${c.g},${c.b})`;
        swatch.dataset.rgb = rgb_to_key(c);  // CRITICAL FIX #1: Store standardized key
        swatch.onclick = () => showSequence(c);
        paletteDiv.appendChild(swatch);
    });
}

/**
 * Show sequence for a palette colour
 * CRITICAL FIX #1: Uses rgb_to_key() for lookup
 */
function showSequence(c) {
    const key = rgb_to_key(c);  // CRITICAL FIX #1
    const data = sequences.get(key);

    if (!data) {
        msg(2, `Sequence not found for RGB(${c.r},${c.g},${c.b})`, 'err');
        console.log('Looking for:', key);
        console.log('Available keys:', Array.from(sequences.keys()).slice(0, 10));
        return;
    }

    document.getElementById('popRGB').textContent = `rgb(${c.r},${c.g},${c.b})`;
    document.getElementById('popSeq').textContent = `[${data.sequence.join(', ')}]`;

    const layersDiv = document.getElementById('popLayers');
    layersDiv.innerHTML = '';

    data.sequence.forEach((fi, li) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer';

        if (fi === 0) {
            layerDiv.innerHTML = `
                <div class="layer-box" style="background:#fff;border:2px dashed #999"></div>
                <span>Layer ${li}: Empty</span>
            `;
        } else {
            const col = data.colours[fi - 1];
            layerDiv.innerHTML = `
                <div class="layer-box" style="background:${col.h}"></div>
                <span>Layer ${li}: ${col.n}</span>
            `;
        }

        layersDiv.appendChild(layerDiv);
    });

    document.getElementById('popup').classList.add('show');
}

/**
 * Remove duplicate colours from palette
 * IMPORTANT FIX #5: Updates max colours value
 */
export function removeDuplicates() {
    if (!pal) return;

    const unique = [];
    const seen = new Set();

    pal.forEach(c => {
        const key = rgb_to_key(c);  // CRITICAL FIX #1
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(c);
        }
    });

    const removed = pal.length - unique.length;
    setPal(unique);
    displayPalette();

    // IMPORTANT FIX #5: Update max colours to new length
    document.getElementById('maxColours').value = unique.length;

    document.getElementById('uniqueCount').textContent = unique.length;
    document.getElementById('dupsCount').textContent = removed;
    msg(2, `✓ Removed ${removed} duplicates`, 'ok');
}
