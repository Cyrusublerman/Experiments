/**
 * STL Export Module
 * Handles vectorization and STL generation for artwork
 */

/**
 * Vectorize pixel set into rectangles using greedy merging
 *
 * @param {Set} pixelSet - Set of "x,y" pixel coordinates
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {Array} Array of {x, y, w, h} rectangles
 */
export function vectorizePixels(pixelSet, width, height) {
    const rectangles = [];
    const processed = new Set();

    // Convert set to 2D grid for easier access
    const grid = Array(height).fill(null).map(() => Array(width).fill(false));
    for (let coord of pixelSet) {
        const [x, y] = coord.split(',').map(Number);
        if (y >= 0 && y < height && x >= 0 && x < width) {
            grid[y][x] = true;
        }
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
 * Generate STL box geometry (12 triangular facets)
 *
 * @param {number} x0 - Min X
 * @param {number} y0 - Min Y
 * @param {number} z0 - Min Z
 * @param {number} x1 - Max X
 * @param {number} y1 - Max Y
 * @param {number} z1 - Max Z
 * @returns {string} STL facets (ASCII format)
 */
export function generateBox(x0, y0, z0, x1, y1, z1) {
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
 *
 * @param {string} facets - STL facet data
 * @param {string} name - Object name
 * @returns {string} Complete STL file content
 */
function wrapSTL(facets, name) {
    return `solid ${name}\n${facets}endsolid ${name}\n`;
}

/**
 * Export artwork as STL files
 *
 * @param {Array} layerMaps - Layer maps from expandToLayers()
 * @param {Array} filamentNames - Names for each filament
 * @param {Object} config - Export configuration
 * @param {number} config.imageWidth - Image width in pixels
 * @param {number} config.imageHeight - Image height in pixels
 * @param {number} config.printWidth - Print width in mm
 * @param {number} config.layerHeight - Layer height in mm
 * @returns {Object} Map of filename -> STL content
 */
export function exportArtworkSTLs(layerMaps, filamentNames, config) {
    const { imageWidth, imageHeight, printWidth, layerHeight } = config;
    const printHeight = printWidth * (imageHeight / imageWidth);
    const pixelSize = printWidth / imageWidth;

    const stls = {};
    const filamentCount = layerMaps[0].length;

    // Generate one STL per filament (all layers combined)
    for (let fi = 0; fi < filamentCount; fi++) {
        let filamentFacets = '';
        let totalRects = 0;

        // Combine all layers for this filament
        for (let li = 0; li < layerMaps.length; li++) {
            const pixels = layerMaps[li][fi];
            if (pixels.size === 0) continue;

            // Vectorize pixels to rectangles
            const rectangles = vectorizePixels(pixels, imageWidth, imageHeight);
            totalRects += rectangles.length;

            // Generate geometry for this layer
            const z0 = li * layerHeight;
            const z1 = z0 + layerHeight;

            for (let rect of rectangles) {
                const x0 = rect.x * pixelSize;
                const y0 = rect.y * pixelSize;
                const x1 = (rect.x + rect.w) * pixelSize;
                const y1 = (rect.y + rect.h) * pixelSize;

                filamentFacets += generateBox(x0, y0, z0, x1, y1, z1);
            }
        }

        // Only create STL if this filament has geometry
        if (filamentFacets.length > 0) {
            const fileName = `artwork_${filamentNames[fi].replace(/[^a-zA-Z0-9]/g, '_')}.stl`;
            stls[fileName] = wrapSTL(filamentFacets, `Artwork_${filamentNames[fi]}`);
        }
    }

    return stls;
}
