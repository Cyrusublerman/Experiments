/**
 * State Management Module
 * Contains all application state variables
 */

// Selected color indices
export let sel = [];

// Grid data
export let grid = null;

// Scan data
export let scan = null;

// Palette data
export let pal = null;

// Active palette for quantization (can be extracted or imported)
export let activePalette = null;

// Palette source type ('extracted' or 'imported')
export let paletteSource = 'extracted';

// Quantization data
export let quant = null;

// Sequence to colour mapping
export let sequences = new Map();

// UI state
export let showOverlay = false;
export let gridView = {scale: 1, offsetX: 0, offsetY: 0};
export let scanView = {scale: 1, panX: 0, panY: 0};
export let align = {offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1};
export let isDragging = false;
export let dragStart = {x: 0, y: 0};

// Filament layers for export
export let filamentLayers = [];

// Functions to update state (to maintain reactivity)
export function setSel(value) {
    sel = value;
}

export function setGrid(value) {
    grid = value;
}

export function setScan(value) {
    scan = value;
}

export function setPal(value) {
    pal = value;
}

export function setActivePalette(value) {
    activePalette = value;
}

export function setPaletteSource(value) {
    paletteSource = value;
}

export function setQuant(value) {
    quant = value;
}

export function setSequences(value) {
    sequences = value;
}

export function setShowOverlay(value) {
    showOverlay = value;
}

export function setGridView(value) {
    gridView = value;
}

export function setScanView(value) {
    scanView = value;
}

export function setAlign(value) {
    align = value;
}

export function setIsDragging(value) {
    isDragging = value;
}

export function setDragStart(value) {
    dragStart = value;
}

export function setFilamentLayers(value) {
    filamentLayers = value;
}
