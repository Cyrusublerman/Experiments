/**
 * HueForge-Lite Library
 * Main entry point for the multi-color FDM printing library
 *
 * @version 1.0.0
 * @author HueForge-Lite Team
 * @license MIT
 */

// Core utilities
export {
    COLOURS,
    DEFAULTS
} from './core/constants.js';

export {
    rgb_to_key,
    hex2rgb,
    rgb2hex,
    simColour,
    colorDistance,
    findClosest,
    avgColour,
    distributeError,
    parseGPL,
    generateGPL,
    clamp
} from './core/utils.js';

export {
    createGridState,
    createScanState,
    createQuantizeState,
    createSequenceMap,
    createPalette
} from './core/state.js';

// Grid generation and management
export {
    generateSequences,
    buildSequenceMap,
    calculateSequenceCount,
    calculateGridLayout,
    calculateConstraints,
    drawGrid,
    getCellAtPosition,
    renderSequenceDetails,
    exportGridSTLs,
    exportGridJSON,
    importGridJSON,
    exportReferenceImage
} from './grid/index.js';

// Scan analysis
export {
    extractColors,
    autoCalculateScale,
    drawGridOverlay
} from './scan/index.js';

// Image quantization
export {
    quantizeImage,
    applyMinDetailFilter,
    expandToLayers
} from './quantize/index.js';

// STL export
export {
    vectorizePixels,
    generateBox,
    exportArtworkSTLs
} from './stl/index.js';

/**
 * Complete workflow helper function
 * Generates grid, returns data needed for subsequent steps
 *
 * @param {Array} selectedColors - Array of color objects from COLOURS
 * @param {Object} config - Configuration parameters
 * @returns {Object} {gridData, sequenceMap, config}
 */
export function createCalibrationGrid(selectedColors, config) {
    const {
        bedW,
        bedH,
        scanW,
        scanH,
        tileSize,
        gap,
        layers,
        layerHeight,
        baseLayers
    } = config;

    // Import from grid module
    const {
        generateSequences,
        buildSequenceMap,
        calculateGridLayout,
        calculateConstraints
    } = await import('./grid/index.js');

    // Generate sequences
    const sequences = generateSequences(selectedColors.length, layers);

    // Calculate constraints
    const constraints = calculateConstraints({ bedW, bedH, scanW, scanH });

    // Calculate layout
    const layout = calculateGridLayout({
        sequenceCount: sequences.length,
        tileSize,
        gap,
        maxWidth: constraints.maxWidth,
        maxHeight: constraints.maxHeight
    });

    if (!layout.fits) {
        throw new Error(layout.error);
    }

    // Build grid data
    const gridData = {
        sequences,
        colours: selectedColors,
        rows: layout.rows,
        cols: layout.cols,
        tileSize,
        gap,
        width: layout.width,
        height: layout.height,
        emptyCells: layout.emptyCells
    };

    // Build sequence map
    const sequenceMap = buildSequenceMap(sequences, selectedColors, layout.cols);

    return {
        gridData,
        sequenceMap,
        config: {
            layers,
            layerHeight,
            baseLayers
        }
    };
}

/**
 * Complete quantization workflow
 *
 * @param {ImageData} imageData - Image to quantize
 * @param {Array} palette - Color palette
 * @param {Object} options - Quantization options
 * @returns {ImageData} Quantized image data
 */
export function quantizeWorkflow(imageData, palette, options = {}) {
    const {
        dither = true,
        applyMinDetail = false,
        minDetailMM = 1.0,
        printWidth = 170
    } = options;

    // Import from quantize module
    const { quantizeImage, applyMinDetailFilter } = await import('./quantize/index.js');

    // Apply min-detail filter if requested
    const mask = applyMinDetail ?
        applyMinDetailFilter(imageData, palette, minDetailMM, printWidth) :
        null;

    // Quantize
    return quantizeImage(imageData, palette, { dither, mask });
}
