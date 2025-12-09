/**
 * Scan Module
 * Handles scan analysis and color extraction from scanned calibration grids
 */

import { rgb_to_key, avgColour } from '../core/utils.js';

/**
 * Extract colors from scanned grid using alignment
 * Samples from the center of each grid tile
 *
 * @param {HTMLCanvasElement} canvas - Canvas with scan image
 * @param {Object} gridData - Grid data for sampling positions
 * @param {Object} alignment - Alignment parameters {offsetX, offsetY, scaleX, scaleY}
 * @returns {Object} {palette, colorMap}
 */
export function extractColors(canvas, gridData, alignment) {
    const ctx = canvas.getContext('2d');
    const { sequences, rows, cols, tileSize, gap } = gridData;
    const { offsetX, offsetY, scaleX, scaleY } = alignment;

    const colorMap = new Map();
    const sampleRadius = 5; // Sample 5x5 pixel area

    sequences.forEach((seq, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;

        // Calculate grid position in mm
        const gridX = col * (tileSize + gap) + tileSize / 2;
        const gridY = row * (tileSize + gap) + tileSize / 2;

        // Transform to scan coordinates
        const scanX = Math.round(gridX * scaleX + offsetX);
        const scanY = Math.round(gridY * scaleY + offsetY);

        // Sample area around this point
        const sampleData = ctx.getImageData(
            scanX - sampleRadius,
            scanY - sampleRadius,
            sampleRadius * 2,
            sampleRadius * 2
        );

        const avgColor = avgColour(sampleData);
        const key = rgb_to_key(avgColor);

        if (!colorMap.has(key)) {
            colorMap.set(key, {
                color: avgColor,
                count: 1,
                positions: [i]
            });
        } else {
            const entry = colorMap.get(key);
            entry.count++;
            entry.positions.push(i);
        }
    });

    // Convert to palette sorted by frequency
    const palette = Array.from(colorMap.values())
        .map(e => e.color)
        .sort((a, b) => {
            const countA = colorMap.get(rgb_to_key(a)).count;
            const countB = colorMap.get(rgb_to_key(b)).count;
            return countB - countA;
        });

    return { palette, colorMap };
}

/**
 * Auto-calculate scale from A4 scan dimensions
 *
 * @param {number} scanWidth - Scan image width in pixels
 * @param {number} scanHeight - Scan image height in pixels
 * @param {number} gridWidth - Grid width in mm
 * @param {number} gridHeight - Grid height in mm
 * @param {number} a4Width - A4 width in mm (default 210)
 * @param {number} a4Height - A4 height in mm (default 297)
 * @returns {Object} {scaleX, scaleY}
 */
export function autoCalculateScale(scanWidth, scanHeight, gridWidth, gridHeight, a4Width = 210, a4Height = 297) {
    // Calculate pixels per mm for the scan
    const scanPxPerMmX = scanWidth / a4Width;
    const scanPxPerMmY = scanHeight / a4Height;

    // Grid is in mm, so scale = pixels per mm
    return {
        scaleX: scanPxPerMmX,
        scaleY: scanPxPerMmY
    };
}

/**
 * Draw grid overlay on scan canvas
 *
 * @param {HTMLCanvasElement} canvas - Canvas to draw on
 * @param {Object} gridData - Grid data
 * @param {Object} alignment - Alignment parameters
 * @param {string} color - Overlay color (default red)
 */
export function drawGridOverlay(canvas, gridData, alignment, color = 'rgba(255, 0, 0, 0.5)') {
    const ctx = canvas.getContext('2d');
    const { rows, cols, tileSize, gap, width, height } = gridData;
    const { offsetX, offsetY, scaleX, scaleY } = alignment;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleX, scaleY);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / scaleX; // Adjust line width for scale

    // Draw grid outline
    ctx.strokeRect(0, 0, width, height);

    // Draw individual cells
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * (tileSize + gap);
            const y = row * (tileSize + gap);
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }

    ctx.restore();
}
