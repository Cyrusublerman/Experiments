/**
 * Grid Visualization Module
 * Handles canvas rendering of calibration grid
 */

import { simColour } from '../core/utils.js';

/**
 * Draw calibration grid on canvas
 *
 * @param {HTMLCanvasElement} canvas - Canvas element to draw on
 * @param {Object} gridData - Grid data object
 * @param {Object} options - Drawing options
 * @param {number} options.scale - Scale factor for grid size
 * @param {number} options.cellSize - Size of each cell in pixels (auto-calculated if not provided)
 * @returns {Object} Drawing metadata
 */
export function drawGrid(canvas, gridData, options = {}) {
    const ctx = canvas.getContext('2d');
    const { rows, cols, sequences, colours, emptyCells } = gridData;
    const scale = options.scale || 1;

    // Calculate cell size
    const cellSize = options.cellSize || Math.min(
        canvas.width / cols,
        canvas.height / rows
    ) * scale;

    // Set canvas dimensions
    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw filled cells
    sequences.forEach((seq, i) => {
        if (i >= rows * cols) return;

        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = col * cellSize;
        const y = row * cellSize;

        // Calculate and draw tile color
        const colour = simColour(seq, colours);
        ctx.fillStyle = `rgb(${colour.r},${colour.g},${colour.b})`;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw border (darker to reduce bevel effect)
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
    });

    // Draw empty cells
    if (emptyCells && emptyCells.length > 0) {
        emptyCells.forEach(emptyIdx => {
            const row = Math.floor(emptyIdx / cols);
            const col = emptyIdx % cols;
            const x = col * cellSize;
            const y = row * cellSize;

            // Grey background
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(x, y, cellSize, cellSize);

            // Grey border
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellSize, cellSize);

            // Draw X
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 5, y + 5);
            ctx.lineTo(x + cellSize - 5, y + cellSize - 5);
            ctx.moveTo(x + cellSize - 5, y + 5);
            ctx.lineTo(x + 5, y + cellSize - 5);
            ctx.stroke();
        });
    }

    return {
        cellSize,
        width: canvas.width,
        height: canvas.height
    };
}

/**
 * Get grid cell at canvas coordinates
 *
 * @param {Object} gridData - Grid data
 * @param {number} canvasX - X coordinate on canvas
 * @param {number} canvasY - Y coordinate on canvas
 * @param {number} cellSize - Size of each cell in pixels
 * @returns {Object|null} {row, col, index, sequence} or null if out of bounds
 */
export function getCellAtPosition(gridData, canvasX, canvasY, cellSize) {
    const { rows, cols, sequences, emptyCells } = gridData;

    const col = Math.floor(canvasX / cellSize);
    const row = Math.floor(canvasY / cellSize);

    // Check bounds
    if (col < 0 || col >= cols || row < 0 || row >= rows) {
        return null;
    }

    const index = row * cols + col;

    // Check if empty cell
    if (emptyCells && emptyCells.includes(index)) {
        return {
            row,
            col,
            index,
            sequence: null,
            isEmpty: true
        };
    }

    // Check if valid sequence
    if (index >= sequences.length) {
        return null;
    }

    return {
        row,
        col,
        index,
        sequence: sequences[index],
        isEmpty: false
    };
}

/**
 * Draw sequence details for popup display
 *
 * @param {HTMLCanvasElement} canvas - Canvas for drawing
 * @param {Array} sequence - Layer sequence
 * @param {Array} colours - Color objects
 * @param {number} layerHeight - Height in mm per layer
 * @returns {Object} Details for display
 */
export function renderSequenceDetails(canvas, sequence, colours, layerHeight) {
    const ctx = canvas.getContext('2d');
    const width = 200;
    const layerH = 30;
    const height = sequence.length * layerH + 40;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw title
    ctx.fillStyle = '#000000';
    ctx.font = '14px monospace';
    ctx.fillText(`Sequence: [${sequence.join(', ')}]`, 10, 20);

    // Draw layers from bottom to top
    let currentZ = 0;
    sequence.forEach((filIdx, layerIdx) => {
        const y = height - (layerIdx + 1) * layerH - 10;

        if (filIdx === 0) {
            // Empty layer
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(10, y, width - 20, layerH - 2);
            ctx.strokeStyle = '#999999';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(10, y, width - 20, layerH - 2);
            ctx.setLineDash([]);

            ctx.fillStyle = '#666666';
            ctx.font = '12px monospace';
            ctx.fillText(`Layer ${layerIdx}: Empty`, 15, y + 18);
        } else {
            // Filled layer
            const colour = colours[filIdx - 1];
            ctx.fillStyle = colour.h;
            ctx.fillRect(10, y, width - 20, layerH - 2);
            ctx.strokeStyle = '#333333';
            ctx.strokeRect(10, y, width - 20, layerH - 2);

            ctx.fillStyle = '#000000';
            ctx.font = '10px monospace';
            ctx.fillText(`L${layerIdx}: ${colour.n.substring(0, 20)}`, 15, y + 18);
        }

        currentZ += layerHeight;
    });

    return {
        totalHeight: currentZ,
        layerCount: sequence.filter(v => v > 0).length
    };
}
