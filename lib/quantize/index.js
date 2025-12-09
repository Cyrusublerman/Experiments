/**
 * Quantize Module
 * Handles image quantization with dithering and min-detail filtering
 */

import { findClosest, distributeError, parseGPL, generateGPL, rgb_to_key } from '../core/utils.js';

/**
 * Quantize image data to a palette
 *
 * @param {ImageData} imageData - Image data to quantize (will be modified in place)
 * @param {Array} palette - Array of RGB colors to quantize to
 * @param {Object} options - Quantization options
 * @param {boolean} options.dither - Apply Floyd-Steinberg dithering
 * @param {Uint8Array|null} options.mask - Optional mask (1=keep, 0=filter)
 * @returns {ImageData} Quantized image data (same as input, modified)
 */
export function quantizeImage(imageData, palette, options = {}) {
    const { dither = true, mask = null } = options;
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const closest = findClosest({r, g, b}, palette);

            // Apply quantized color
            data[i] = closest.r;
            data[i + 1] = closest.g;
            data[i + 2] = closest.b;

            // Set alpha based on mask
            if (mask && mask[y * w + x] === 0) {
                data[i + 3] = 128; // Filtered pixel - semi-transparent
            } else {
                data[i + 3] = 255; // Kept pixel - full opacity
            }

            // Apply dithering if enabled
            if (dither && (!mask || mask[y * w + x] === 1)) {
                const er = r - closest.r;
                const eg = g - closest.g;
                const eb = b - closest.b;
                distributeError(data, w, h, x, y, er, eg, eb);
            }
        }
    }

    return imageData;
}

/**
 * Apply min-detail filter to remove small isolated regions
 *
 * @param {ImageData} imageData - Image data to analyze
 * @param {Array} palette - Palette for color matching
 * @param {number} minDetailMM - Minimum detail size in mm
 * @param {number} printWidth - Print width in mm
 * @returns {Uint8Array} Mask array (1=keep, 0=filter)
 */
export function applyMinDetailFilter(imageData, palette, minDetailMM, printWidth) {
    const w = imageData.width;
    const h = imageData.height;
    const mask = new Uint8Array(w * h).fill(1);

    // Calculate min detail in pixels
    const pixelsPerMM = w / printWidth;
    const minDetailPx = Math.round(minDetailMM * pixelsPerMM);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const centerColor = {
                r: imageData.data[i],
                g: imageData.data[i + 1],
                b: imageData.data[i + 2]
            };
            const centerClosest = findClosest(centerColor, palette);

            // Count similar neighbors in radius
            let sameCount = 0;
            let totalCount = 0;

            for (let dy = -minDetailPx; dy <= minDetailPx; dy++) {
                for (let dx = -minDetailPx; dx <= minDetailPx; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const ni = (ny * w + nx) * 4;
                        const neighborColor = {
                            r: imageData.data[ni],
                            g: imageData.data[ni + 1],
                            b: imageData.data[ni + 2]
                        };
                        const neighborClosest = findClosest(neighborColor, palette);

                        if (centerClosest.r === neighborClosest.r &&
                            centerClosest.g === neighborClosest.g &&
                            centerClosest.b === neighborClosest.b) {
                            sameCount++;
                        }
                        totalCount++;
                    }
                }
            }

            // Filter if less than 50% of neighbors are the same color
            if (sameCount < totalCount * 0.5) {
                mask[y * w + x] = 0;
            }
        }
    }

    return mask;
}

/**
 * Expand quantized image into layer maps using sequence map
 *
 * @param {ImageData} imageData - Quantized image data
 * @param {Map} sequenceMap - Map from RGB key to sequence data
 * @param {number} filamentCount - Number of filaments
 * @returns {Array} Array of layer maps [layer][filament] = Set of "x,y" coords
 */
export function expandToLayers(imageData, sequenceMap, filamentCount) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;

    // Find max layers needed
    let maxLayers = 0;
    for (let seqData of sequenceMap.values()) {
        const layerCount = seqData.sequence.filter(v => v > 0).length;
        maxLayers = Math.max(maxLayers, layerCount);
    }

    // Initialize layer maps
    const layerMaps = [];
    for (let li = 0; li < maxLayers; li++) {
        layerMaps[li] = Array(filamentCount).fill(null).map(() => new Set());
    }

    // Populate layer maps
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const pixelRGB = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2]
            };

            const key = rgb_to_key(pixelRGB);
            const seqData = sequenceMap.get(key);

            if (!seqData) continue;

            // Expand sequence into layers
            let layerIdx = 0;
            for (let seqValue of seqData.sequence) {
                if (seqValue > 0) {
                    const filIdx = seqValue - 1;
                    layerMaps[layerIdx][filIdx].add(`${x},${y}`);
                    layerIdx++;
                }
            }
        }
    }

    return layerMaps;
}

// Re-export palette functions from utils
export { parseGPL, generateGPL };
