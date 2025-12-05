/**
 * Grid Generation and Management Module
 * Handles calibration grid generation, visualization, and interaction
 */

import { COLOURS } from './constants.js';
import { sel, grid, gridView, sequences, setGrid, setGridView, setSequences } from './state.js';
import { simColour, rgb_to_key, msg } from './utils.js';

/**
 * Generate all possible layer sequences for N colours and M layers
 * @param {number} N - Number of colours
 * @param {number} M - Number of layers
 * @returns {Array} Array of valid sequences
 */
function generateSequences(N, M) {
    const seqs = [];

    function isValid(s) {
        // Reject all-empty sequences
        if (s.every(v => v === 0)) return false;
        // Reject sequences with gaps (non-zero after zero)
        let z = false;
        for (let v of s) {
            if (v === 0) z = true;
            else if (z) return false;
        }
        return true;
    }

    function gen(cur, d) {
        if (d === M) {
            if (isValid(cur)) seqs.push([...cur]);
            return;
        }
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

/**
 * Generate the calibration grid
 * CRITICAL FIX #2: Implements empty_cells tracking
 */
export function generateGrid() {
    if (sel.length < 2) {
        msg(1, 'Select 2+ colours', 'err');
        return;
    }

    const N = sel.length;
    const M = +document.getElementById('layers').value;
    const tile = +document.getElementById('tileSize').value;
    const gap = +document.getElementById('gap').value;
    const bedW = +document.getElementById('bedW').value;
    const bedH = +document.getElementById('bedH').value;
    const scanW = +document.getElementById('scanW').value;
    const scanH = +document.getElementById('scanH').value;

    const maxW = Math.min(bedW, scanW);
    const maxH = Math.min(bedH, scanH);

    const seqs = generateSequences(N, M);
    msg(1, `Generated ${seqs.length} sequences (${N}(${N}^${M}-1)/${N-1})`, 'info');

    const tilesPerRow = Math.floor(maxW / (tile + gap));
    const tilesPerCol = Math.floor(maxH / (tile + gap));
    const maxTiles = tilesPerRow * tilesPerCol;

    if (seqs.length > maxTiles) {
        msg(1, `${seqs.length} sequences won't fit!`, 'err');
        return;
    }

    let rows = Math.ceil(Math.sqrt(seqs.length));
    let cols = Math.ceil(seqs.length / rows);

    while (cols > tilesPerRow || rows > tilesPerCol) {
        if (cols > tilesPerRow) {
            rows++;
            cols = Math.ceil(seqs.length / rows);
        } else {
            cols++;
            rows = Math.ceil(seqs.length / cols);
        }
        if (rows * cols > maxTiles) {
            msg(1, 'Cannot fit', 'err');
            return;
        }
    }

    // CRITICAL FIX #2: Calculate empty cells
    const totalCells = rows * cols;
    const emptyCells = [];
    for (let i = seqs.length; i < totalCells; i++) {
        emptyCells.push(i);
    }

    setGrid({
        seqs,
        rows,
        cols,
        tile,
        gap,
        colours: sel.map(i => COLOURS[i]),
        width: cols * (tile + gap) - gap,
        height: rows * (tile + gap) - gap,
        empty_cells: emptyCells  // CRITICAL FIX #2
    });

    drawGrid();
    setupGridClick();  // CRITICAL FIX #3: Connect click handler

    document.getElementById('gridBox').classList.remove('hidden');
    document.getElementById('totSeqs').textContent = seqs.length;
    document.getElementById('gridRows').textContent = rows;
    document.getElementById('gridCols').textContent = cols;
    document.getElementById('gridDims').textContent = `${grid.width.toFixed(1)}×${grid.height.toFixed(1)}mm`;

    // Build sequence map with standardized RGB keys
    sequences.clear();
    grid.seqs.forEach((seq, idx) => {
        const colour = simColour(seq, grid.colours);
        const key = rgb_to_key(colour);  // CRITICAL FIX #1: Use standardized key
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

    msg(1, `✓ Generated ${seqs.length} sequences in ${rows}×${cols} grid`, 'ok');
}

/**
 * Draw the grid visualization
 * CRITICAL FIX #2: Renders empty cells with grey + X
 * MINOR FIX #9: Uses darker borders (#666) to reduce bevel effect
 */
export function drawGrid() {
    if (!grid) return;

    const canvas = document.getElementById('gridCanvas');
    const ctx = canvas.getContext('2d');
    const wrap = canvas.parentElement;

    // Calculate scale to fit container
    const scale = Math.min(
        wrap.clientWidth / grid.cols,
        wrap.clientHeight / grid.rows
    ) * gridView.scale;

    // Set canvas pixel dimensions
    canvas.width = grid.cols * scale;
    canvas.height = grid.rows * scale;

    // Position canvas in center of container
    canvas.style.left = ((wrap.clientWidth - canvas.width) / 2 + gridView.offsetX) + 'px';
    canvas.style.top = ((wrap.clientHeight - canvas.height) / 2 + gridView.offsetY) + 'px';

    // Draw filled cells
    grid.seqs.forEach((seq, i) => {
        if (i >= grid.rows * grid.cols) return;
        const row = Math.floor(i / grid.cols);
        const col = i % grid.cols;
        const colour = simColour(seq, grid.colours);

        ctx.fillStyle = `rgb(${colour.r},${colour.g},${colour.b})`;
        ctx.fillRect(col * scale, row * scale, scale, scale);

        // MINOR FIX #9: Darker border to reduce bevel appearance
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(col * scale, row * scale, scale, scale);
    });

    // CRITICAL FIX #2: Draw empty cells with grey + X
    if (grid.empty_cells) {
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
}

/**
 * CRITICAL FIX #3: Setup grid tile click handler
 * Allows users to click grid tiles to see sequence details
 */
export function setupGridClick() {
    const canvas = document.getElementById('gridCanvas');

    // Remove old listener if exists
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);

    newCanvas.addEventListener('click', e => {
        if (!grid || !grid.seqs) return;

        const rect = newCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Calculate cell size (accounting for zoom/offset)
        const cellScale = Math.min(
            newCanvas.parentElement.clientWidth / grid.cols,
            newCanvas.parentElement.clientHeight / grid.rows
        ) * gridView.scale;

        // Adjust for canvas position
        const canvasOffsetX = parseFloat(newCanvas.style.left) || 0;
        const canvasOffsetY = parseFloat(newCanvas.style.top) || 0;

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

/**
 * Show popup with sequence details
 * @param {Array} sequence - Layer sequence
 * @param {Object} position - Grid position {row, col, index}
 */
export function showSequencePopup(sequence, position) {
    // Calculate simulated colour
    const colour = simColour(sequence, grid.colours);

    // Populate popup
    document.getElementById('popRGB').textContent = `rgb(${colour.r}, ${colour.g}, ${colour.b})`;
    document.getElementById('popSeq').textContent = `[${sequence.join(', ')}]`;

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

/**
 * Close the sequence popup
 */
export function closePopup() {
    document.getElementById('popup').classList.remove('show');
}

/**
 * Zoom the grid view
 * @param {number} factor - Zoom factor (> 1 to zoom in, < 1 to zoom out)
 */
export function zoomGrid(factor) {
    setGridView({...gridView, scale: gridView.scale * factor});
    drawGrid();
}

/**
 * Reset grid view to default
 */
export function resetGridView() {
    setGridView({scale: 1, offsetX: 0, offsetY: 0});
    drawGrid();
}
