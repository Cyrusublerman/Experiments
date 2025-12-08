/**
 * Utility Functions Module
 * Contains helper functions used throughout the application
 */

/**
 * CRITICAL: RGB Key Standardization
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
 * Convert RGB object to hex string
 * @param {Object} rgb - RGB object {r, g, b}
 * @returns {string} Hex color string
 */
export function rgb2hex(rgb) {
    const r = Math.round(rgb.r).toString(16).padStart(2, '0');
    const g = Math.round(rgb.g).toString(16).padStart(2, '0');
    const b = Math.round(rgb.b).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

/**
 * Simulate the final color from a layer sequence
 * Color mixing formula: average of all non-empty layers
 * @param {Array} seq - Layer sequence array
 * @param {Array} colours - Array of color objects with .h (hex) property
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
 * Calculate Euclidean distance between two colors
 * @param {Object} c1 - RGB color 1
 * @param {Object} c2 - RGB color 2
 * @returns {number} Distance value
 */
export function colorDistance(c1, c2) {
    return Math.sqrt(
        (c1.r - c2.r) ** 2 +
        (c1.g - c2.g) ** 2 +
        (c1.b - c2.b) ** 2
    );
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
        const dist = colorDistance(c, p);
        if (dist < min) {
            min = dist;
            closest = p;
        }
    });
    return closest;
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
        {dx: 1, dy: 0, f: 7/16},  // Right
        {dx: -1, dy: 1, f: 3/16}, // Bottom-left
        {dx: 0, dy: 1, f: 5/16},  // Bottom
        {dx: 1, dy: 1, f: 1/16}   // Bottom-right
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

/**
 * Generate GPL (GIMP Palette) file content
 * @param {Array} palette - Array of RGB objects
 * @param {string} name - Palette name
 * @returns {string} GPL file content
 */
export function generateGPL(palette, name = 'Palette') {
    let gpl = `GIMP Palette\nName: ${name}\nColumns: 8\n#\n`;
    palette.forEach((c, i) => {
        gpl += `${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)} Color${i}\n`;
    });
    return gpl;
}

/**
 * Clamp value between min and max
 * @param {number} val - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
