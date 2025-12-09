/**
 * Grid Layout Module
 * Calculates optimal grid dimensions and arrangement
 */

/**
 * Calculate grid layout to fit sequences within constraints
 *
 * @param {Object} params - Layout parameters
 * @param {number} params.sequenceCount - Number of sequences to fit
 * @param {number} params.tileSize - Size of each tile in mm
 * @param {number} params.gap - Gap between tiles in mm
 * @param {number} params.maxWidth - Maximum width constraint in mm
 * @param {number} params.maxHeight - Maximum height constraint in mm
 * @returns {Object} Layout result {rows, cols, width, height, emptyCells, fits, error}
 */
export function calculateGridLayout({
    sequenceCount,
    tileSize,
    gap,
    maxWidth,
    maxHeight
}) {
    const step = tileSize + gap;
    const tilesPerRow = Math.floor((maxWidth + gap) / step);
    const tilesPerCol = Math.floor((maxHeight + gap) / step);
    const maxTiles = tilesPerRow * tilesPerCol;

    // Check if sequences fit at all
    if (sequenceCount > maxTiles) {
        return {
            rows: 0,
            cols: 0,
            width: 0,
            height: 0,
            emptyCells: [],
            fits: false,
            error: `${sequenceCount} sequences won't fit in ${maxWidth}×${maxHeight}mm (max ${maxTiles} tiles)`
        };
    }

    // Start with square-ish layout
    let cols = Math.ceil(Math.sqrt(sequenceCount));
    let rows = Math.ceil(sequenceCount / cols);

    // Adjust to fit constraints
    while (cols > tilesPerRow || rows > tilesPerCol) {
        if (cols > tilesPerRow) {
            rows++;
            cols = Math.ceil(sequenceCount / rows);
        } else {
            cols++;
            rows = Math.ceil(sequenceCount / cols);
        }
        if (rows * cols > maxTiles) {
            return {
                rows: 0,
                cols: 0,
                width: 0,
                height: 0,
                emptyCells: [],
                fits: false,
                error: 'Cannot fit within constraints'
            };
        }
    }

    // Calculate empty cells
    const totalCells = rows * cols;
    const emptyCells = [];
    for (let i = sequenceCount; i < totalCells; i++) {
        emptyCells.push(i);
    }

    // Calculate physical dimensions
    const width = cols * step - gap;
    const height = rows * step - gap;

    return {
        rows,
        cols,
        width,
        height,
        emptyCells,
        fits: true,
        error: null
    };
}

/**
 * Calculate print bed constraints
 * Uses minimum of bed size and scan size
 *
 * @param {Object} params - Constraint parameters
 * @param {number} params.bedW - Bed width in mm
 * @param {number} params.bedH - Bed height in mm
 * @param {number} params.scanW - Scan width in mm
 * @param {number} params.scanH - Scan height in mm
 * @returns {Object} {maxWidth, maxHeight}
 */
export function calculateConstraints({ bedW, bedH, scanW, scanH }) {
    return {
        maxWidth: Math.min(bedW, scanW),
        maxHeight: Math.min(bedH, scanH)
    };
}
