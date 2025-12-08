/**
 * Grid Export Module
 * Handles exporting calibration grid as STL and JSON
 */

import { simColour } from '../core/utils.js';

/**
 * Generate STL box geometry (12 triangular facets)
 * @param {number} x0 - Min X
 * @param {number} y0 - Min Y
 * @param {number} z0 - Min Z
 * @param {number} x1 - Max X
 * @param {number} y1 - Max Y
 * @param {number} z1 - Max Z
 * @returns {string} STL facets
 */
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
facet normal 0 0 1
  outer loop
    vertex ${x0} ${y0} ${z1}
    vertex ${x1} ${y1} ${z1}
    vertex ${x1} ${y0} ${z1}
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex ${x0} ${y0} ${z1}
    vertex ${x0} ${y1} ${z1}
    vertex ${x1} ${y1} ${z1}
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y0} ${z1}
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y0} ${z1}
    vertex ${x0} ${y0} ${z1}
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex ${x0} ${y1} ${z0}
    vertex ${x1} ${y1} ${z1}
    vertex ${x1} ${y1} ${z0}
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex ${x0} ${y1} ${z0}
    vertex ${x0} ${y1} ${z1}
    vertex ${x1} ${y1} ${z1}
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x0} ${y1} ${z1}
    vertex ${x0} ${y1} ${z0}
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x0} ${y0} ${z1}
    vertex ${x0} ${y1} ${z1}
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y1} ${z0}
    vertex ${x1} ${y1} ${z1}
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y1} ${z1}
    vertex ${x1} ${y0} ${z1}
  endloop
endfacet
`;
}

/**
 * Wrap STL facets with header/footer
 * @param {string} facets - STL facet data
 * @param {string} name - Object name
 * @returns {string} Complete STL file content
 */
function wrapSTL(facets, name) {
    return `solid ${name}\n${facets}endsolid ${name}\n`;
}

/**
 * Export calibration grid as STL files
 * Generates one STL per filament (all layers combined) plus base layer
 *
 * @param {Object} gridData - Grid data object
 * @param {Object} config - Export configuration
 * @param {number} config.layerHeight - Height of each layer in mm
 * @param {number} config.baseLayers - Number of base layers
 * @param {number} config.baseColorIndex - Base color index (-1 for white/default)
 * @returns {Object} Map of filename -> STL content
 */
export function exportGridSTLs(gridData, config) {
    const { sequences, colours, rows, cols, tileSize, gap } = gridData;
    const { layerHeight, baseLayers, baseColorIndex } = config;
    const stls = {};

    // Generate base layer
    if (baseLayers > 0) {
        let baseFacets = '';
        for (let l = 0; l < baseLayers; l++) {
            baseFacets += generateBox(
                0, 0, l * layerHeight,
                gridData.width, gridData.height, (l + 1) * layerHeight
            );
        }
        const baseName = baseColorIndex === -1 ? 'base_white' : `base_color_${baseColorIndex}`;
        stls[`${baseName}.stl`] = wrapSTL(baseFacets, 'Base');
    }

    // Generate filament layers
    const filamentFacets = Array(colours.length).fill('');

    sequences.forEach((seq, i) => {
        if (i >= rows * cols) return;

        const row = Math.floor(i / cols);
        const col = i % cols;
        const x0 = col * (tileSize + gap);
        const y0 = row * (tileSize + gap);
        let z = baseLayers * layerHeight;

        // Process each layer in the sequence
        for (let layerIdx = 0; layerIdx < seq.length; layerIdx++) {
            const filIdx = seq[layerIdx];
            if (filIdx > 0) {
                // Add to corresponding filament's geometry
                filamentFacets[filIdx - 1] += generateBox(
                    x0, y0, z,
                    x0 + tileSize, y0 + tileSize, z + layerHeight
                );
                z += layerHeight;
            }
        }
    });

    // Create STL file for each filament
    colours.forEach((colour, i) => {
        if (filamentFacets[i].length > 0) {
            const fileName = `filament_${i}_${colour.n.replace(/[^a-zA-Z0-9]/g, '_')}.stl`;
            stls[fileName] = wrapSTL(filamentFacets[i], `Filament_${i}`);
        }
    });

    return stls;
}

/**
 * Export grid configuration as JSON
 *
 * @param {Object} gridData - Grid data object
 * @param {Object} config - Configuration parameters
 * @returns {string} JSON string
 */
export function exportGridJSON(gridData, config) {
    const data = {
        version: "1.0",
        colours: gridData.colours,
        sequences: gridData.sequences,
        config: {
            rows: gridData.rows,
            cols: gridData.cols,
            tileSize: gridData.tileSize,
            gap: gridData.gap,
            width: gridData.width,
            height: gridData.height,
            ...config
        }
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Import grid configuration from JSON
 *
 * @param {string} jsonString - JSON string
 * @returns {Object} {gridData, config}
 */
export function importGridJSON(jsonString) {
    const data = JSON.parse(jsonString);

    const gridData = {
        sequences: data.sequences,
        colours: data.colours,
        rows: data.config.rows,
        cols: data.config.cols,
        tileSize: data.config.tileSize,
        gap: data.config.gap,
        width: data.config.width,
        height: data.config.height
    };

    // Calculate empty cells
    const totalCells = gridData.rows * gridData.cols;
    gridData.emptyCells = [];
    for (let i = gridData.sequences.length; i < totalCells; i++) {
        gridData.emptyCells.push(i);
    }

    const config = {
        layers: data.config.layers,
        layerHeight: data.config.layerHeight,
        baseLayers: data.config.baseLayers
    };

    return { gridData, config };
}

/**
 * Export reference image showing grid with sequence labels
 *
 * @param {HTMLCanvasElement} canvas - Canvas to draw on
 * @param {Object} gridData - Grid data object
 * @param {number} cellSize - Size of each cell in pixels
 * @returns {HTMLCanvasElement} Canvas with reference image
 */
export function exportReferenceImage(canvas, gridData, cellSize = 120) {
    const { sequences, colours, rows, cols } = gridData;
    const ctx = canvas.getContext('2d');
    const padding = 5;
    const cellTotal = cellSize + padding;

    canvas.width = cols * cellTotal + padding;
    canvas.height = rows * cellTotal + padding;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each cell with label
    sequences.forEach((seq, i) => {
        if (i >= rows * cols) return;

        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = padding + col * cellTotal;
        const y = padding + row * cellTotal;

        // Draw colored cell
        const colour = simColour(seq, colours);
        ctx.fillStyle = `rgb(${colour.r},${colour.g},${colour.b})`;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Draw sequence label
        const brightness = colour.r + colour.g + colour.b;
        ctx.fillStyle = brightness > 384 ? '#000000' : '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`[${seq.join(',')}]`, x + cellSize / 2, y + cellSize / 2);

        // Draw index
        ctx.font = '10px monospace';
        ctx.fillText(`#${i}`, x + cellSize / 2, y + cellSize / 2 + 20);
    });

    return canvas;
}
