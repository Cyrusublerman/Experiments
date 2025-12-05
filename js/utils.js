/**
 * Utility Functions Module
 * Contains helper functions used throughout the application
 */

/**
 * CRITICAL FIX #1: RGB Key Standardization
 * Always round RGB values to integers for consistent Map key lookups
 * @param {Object} rgb - Object with r, g, b properties
 * @returns {string} Standardized key in format "r,g,b"
 */
export function rgb_to_key(rgb) {
    const r = Math.round(rgb.r);
    const g = Math.round(rgb.g);
    const b = Math.round(rgb.b);
    return `${r},${g},${b}`;
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (#RRGGBB)
 * @returns {Object} RGB object {r, g, b}
 */
export function hex2rgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16)
    } : {r: 255, g: 255, b: 255};
}

/**
 * Simulate the final color from a layer sequence
 * @param {Array} seq - Layer sequence array
 * @param {Array} colours - Array of color objects
 * @returns {Object} RGB object {r, g, b}
 */
export function simColour(seq, colours) {
    let r = 0, g = 0, b = 0, cnt = 0;
    for (let i = 0; i < seq.length; i++) {
        const fi = seq[i];
        if (fi > 0) {
            const rgb = hex2rgb(colours[fi - 1].h);
            r += rgb.r;
            g += rgb.g;
            b += rgb.b;
            cnt++;
        }
    }
    return cnt === 0 ? {r: 255, g: 255, b: 255} : {
        r: Math.round(r / cnt),
        g: Math.round(g / cnt),
        b: Math.round(b / cnt)
    };
}

/**
 * Display a message to the user
 * @param {number} step - Step number (1-4)
 * @param {string} text - Message text
 * @param {string} type - Message type ('ok', 'err', 'info')
 */
export function msg(step, text, type) {
    const m = document.getElementById(`msg${step}`);
    m.textContent = text;
    m.className = `msg ${type}`;
    m.classList.remove('hidden');
}

/**
 * Setup canvas with proper dimensions to avoid distortion
 * IMPORTANT FIX #7: Canvas dimensions fix
 * @param {string} canvasId - Canvas element ID
 * @param {Image} image - Image to display
 * @returns {Object} {canvas, ctx}
 */
export function setupCanvas(canvasId, image) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    // Set pixel dimensions to match image (native resolution)
    canvas.width = image.width;
    canvas.height = image.height;

    // Set CSS to fill container while preserving aspect ratio
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';

    // Draw image at native resolution
    ctx.drawImage(image, 0, 0);

    return {canvas, ctx};
}

/**
 * Calculate average color from image data
 * @param {ImageData} imgData - Image data to analyze
 * @returns {Object} RGB object {r, g, b}
 */
export function avgColour(imgData) {
    let r = 0, g = 0, b = 0, cnt = 0;
    for (let i = 0; i < imgData.data.length; i += 4) {
        r += imgData.data[i];
        g += imgData.data[i + 1];
        b += imgData.data[i + 2];
        cnt++;
    }
    return {
        r: Math.round(r / cnt),
        g: Math.round(g / cnt),
        b: Math.round(b / cnt)
    };
}

/**
 * Find the closest color in a palette to a given color
 * @param {Object} c - RGB color to match
 * @param {Array} palette - Array of RGB colors
 * @returns {Object} Closest RGB color from palette
 */
export function findClosest(c, palette) {
    let min = Infinity;
    let closest = palette[0];
    palette.forEach(p => {
        const dist = Math.sqrt((c.r - p.r) ** 2 + (c.g - p.g) ** 2 + (c.b - p.b) ** 2);
        if (dist < min) {
            min = dist;
            closest = p;
        }
    });
    return closest;
}

/**
 * Distribute dithering error to neighboring pixels (Floyd-Steinberg)
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} w - Image width
 * @param {number} h - Image height
 * @param {number} x - Current x position
 * @param {number} y - Current y position
 * @param {number} er - Red error
 * @param {number} eg - Green error
 * @param {number} eb - Blue error
 */
export function distributeError(data, w, h, x, y, er, eg, eb) {
    const offsets = [
        {dx: 1, dy: 0, f: 7/16},
        {dx: -1, dy: 1, f: 3/16},
        {dx: 0, dy: 1, f: 5/16},
        {dx: 1, dy: 1, f: 1/16}
    ];
    offsets.forEach(({dx, dy, f}) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const i = (ny * w + nx) * 4;
            data[i] = Math.max(0, Math.min(255, data[i] + er * f));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + eg * f));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + eb * f));
        }
    });
}

/**
 * Parse GPL (GIMP Palette) file format
 * IMPORTANT FIX #6: GPL palette import
 * @param {string} text - GPL file contents
 * @returns {Array} Array of RGB objects
 */
export function parseGPL(text) {
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

        // Parse RGB values (format: "R G B [Name]")
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
