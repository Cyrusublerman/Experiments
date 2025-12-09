/**
 * State Management Module
 * Provides state factory functions and validators
 */

/**
 * Create initial grid state
 * @returns {Object|null} Grid state object
 */
export function createGridState() {
    return null;
}

/**
 * Create initial scan state
 * @returns {Object|null} Scan state object
 */
export function createScanState() {
    return {
        img: null,
        alignment: {
            offsetX: 0,
            offsetY: 0,
            scaleX: 1,
            scaleY: 1
        }
    };
}

/**
 * Create initial quantize state
 * @returns {Object|null} Quantize state object
 */
export function createQuantizeState() {
    return {
        img: null,
        result: null,
        width: 0,
        height: 0
    };
}

/**
 * Create sequence map (RGB key -> sequence data)
 * @returns {Map} Sequence map
 */
export function createSequenceMap() {
    return new Map();
}

/**
 * Create palette from colors
 * @param {Array} colors - Array of RGB objects
 * @returns {Array} Palette array
 */
export function createPalette(colors) {
    return colors || [];
}
