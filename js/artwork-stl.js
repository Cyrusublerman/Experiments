/**
 * Artwork to STL Module
 * Converts quantized images to STL files for multi-color FDM printing
 */

import { quant, sequences, sel, grid } from './state.js';
import { COLOURS } from './constants.js';
import { rgb_to_key, msg } from './utils.js';

/**
 * Export quantized artwork as STL files (one per layer per filament)
 */
export function exportArtworkSTLs() {
    if (!quant || !quant.result || !grid) {
        msg(4, 'Need quantized image and grid data', 'err');
        return;
    }

    msg(4, 'Generating artwork STLs...', 'info');

    setTimeout(() => {
        try {
            // Step 1: Calculate physical dimensions
            const printW = +document.getElementById('printW').value; // mm
            const imgW = quant.width; // pixels
            const imgH = quant.height; // pixels
            const printH = printW * (imgH / imgW); // mm
            const pixelSize = printW / imgW; // mm per pixel

            console.log(`Image: ${imgW}×${imgH}px → Print: ${printW}×${printH}mm → Pixel: ${pixelSize}mm`);

            // Step 2: Expand image into layer data
            const layerH = +document.getElementById('layerH').value;
            const maxLayers = Math.max(...grid.seqs.map(seq => seq.filter(v => v > 0).length));

            console.log(`Max layers in any sequence: ${maxLayers}`);

            // Create layer maps: layerMaps[layerIdx][filamentIdx] = Set of pixel coords
            const layerMaps = [];
            for (let li = 0; li < maxLayers; li++) {
                layerMaps[li] = Array(sel.length).fill(null).map(() => new Set());
            }

            // Step 3: Populate layer maps from quantized image
            const result = quant.result;
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

                    // Expand this pixel's sequence into layers
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

            // Step 4: Vectorize each layer (combine adjacent pixels)
            const stls = {};
            let fileCount = 0;

            for (let li = 0; li < maxLayers; li++) {
                for (let fi = 0; fi < sel.length; fi++) {
                    const pixels = layerMaps[li][fi];
                    if (pixels.size === 0) continue;

                    console.log(`Layer ${li}, Filament ${fi}: ${pixels.size} pixels`);

                    // Convert pixel set to 2D grid for vectorization
                    const pixelGrid = new Set(pixels);
                    const rectangles = vectorizePixels(pixelGrid, imgW, imgH);

                    console.log(`  → Vectorized to ${rectangles.length} rectangles`);

                    // Generate STL geometry
                    let facets = '';
                    const z0 = li * layerH;
                    const z1 = z0 + layerH;

                    for (let rect of rectangles) {
                        const x0 = rect.x * pixelSize;
                        const y0 = rect.y * pixelSize;
                        const x1 = (rect.x + rect.w) * pixelSize;
                        const y1 = (rect.y + rect.h) * pixelSize;

                        facets += generateBox(x0, y0, z0, x1, y1, z1);
                    }

                    const filName = COLOURS[sel[fi]].n.replace(/[^a-zA-Z0-9]/g, '_');
                    const fileName = `artwork_layer${li}_${filName}.stl`;
                    stls[fileName] = wrapSTL(facets, `Artwork_L${li}_F${fi}`);
                    fileCount++;
                }
            }

            // Step 5: Export all STLs
            Object.entries(stls).forEach(([fileName, content]) => {
                const blob = new Blob([content], {type: 'text/plain'});
                saveAs(blob, fileName);
            });

            msg(4, `✓ Exported ${fileCount} artwork STL files`, 'ok');

        } catch (e) {
            msg(4, `Error: ${e.message}`, 'err');
            console.error('STL generation error:', e);
        }
    }, 100);
}

/**
 * Vectorize pixel grid into rectangles (greedy rectangle merging)
 * @param {Set} pixelSet - Set of "x,y" pixel coordinates
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {Array} Array of {x, y, w, h} rectangles
 */
function vectorizePixels(pixelSet, width, height) {
    const rectangles = [];
    const processed = new Set();

    // Convert set to 2D array for easier access
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

            // Start new rectangle
            let w = 1, h = 1;

            // Expand horizontally
            while (x + w < width && grid[y][x + w] && !processed.has(`${x + w},${y}`)) {
                w++;
            }

            // Try to expand vertically (check if all rows match)
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

            // Mark all pixels in this rectangle as processed
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

/**
 * Generate STL box geometry (ASCII format)
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
