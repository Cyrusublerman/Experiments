/**
 * Initialization Module
 * Sets up the application, event handlers, and UI components
 */

import { COLOURS } from './constants.js';
import { sel, setSel } from './state.js';
import { generateGrid, closePopup, zoomGrid, resetGridView } from './grid.js';
import { loadScan, setupScanDrag, analyseScan, toggleOverlay, updateAlign, resetAlign, autoScale,
         zoomScan, panScan, resetScanView, removeDuplicates } from './scan.js';
import { loadImage, updateMinDetail, quantiseImage, resetQuant, updatePaletteSource, importGPLPalette } from './quantize.js';
import { exportGridJSON, importGridJSON, exportReferenceImage, exportSTLs,
         exportPalette, exportComparison, exportAlignment, exportLayers, exportPrintInfo } from './export.js';

/**
 * Initialize the application
 */
export function init() {
    // Populate colour grid
    const colourGrid = document.getElementById('colourGrid');
    COLOURS.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'colour-item';
        div.onclick = () => toggleColour(i);
        div.innerHTML = `<div class="colour-box" style="background:${c.h}"></div><div class="colour-name">${c.n}</div>`;
        colourGrid.appendChild(div);
    });

    updateSelCount();
    updateBaseColourOptions();

    // Setup event handlers
    document.getElementById('scanFile').onchange = loadScan;
    document.getElementById('imgFile').onchange = loadImage;
    document.getElementById('printW').oninput = updateMinDetail;
    document.getElementById('minDetail').oninput = updateMinDetail;

    setupScanDrag();

    // Make functions globally available for inline handlers
    window.generateGrid = generateGrid;
    window.exportGridJSON = exportGridJSON;
    window.importGridJSON = importGridJSON;
    window.exportSTLs = exportSTLs;
    window.exportReferenceImage = exportReferenceImage;
    window.zoomGrid = zoomGrid;
    window.resetGridView = resetGridView;

    window.analyseScan = analyseScan;
    window.toggleOverlay = toggleOverlay;
    window.exportAlignment = exportAlignment;
    window.removeDuplicates = removeDuplicates;
    window.zoomScan = zoomScan;
    window.panScan = panScan;
    window.resetScanView = resetScanView;
    window.updateAlign = updateAlign;
    window.autoScale = autoScale;
    window.resetAlign = resetAlign;
    window.exportPalette = exportPalette;
    window.exportComparison = exportComparison;

    window.quantiseImage = quantiseImage;
    window.resetQuant = resetQuant;
    window.updatePaletteSource = updatePaletteSource;
    window.importGPLPalette = importGPLPalette;

    window.exportLayers = exportLayers;
    window.exportPrintInfo = exportPrintInfo;

    window.closePopup = closePopup;

    // Initialize palette source if GPL import UI exists
    if (document.getElementsByName('palSrc').length > 0) {
        updatePaletteSource();
    }
}

/**
 * Toggle colour selection
 * @param {number} i - Colour index
 */
function toggleColour(i) {
    const idx = sel.indexOf(i);
    if (idx > -1) {
        sel.splice(idx, 1);
    } else {
        if (sel.length >= 10) {
            const msg = window.msg || ((step, text, type) => {
                const m = document.getElementById(`msg${step}`);
                if (m) {
                    m.textContent = text;
                    m.className = `msg ${type}`;
                    m.classList.remove('hidden');
                }
            });
            msg(1, 'Max 10 colours', 'err');
            return;
        }
        sel.push(i);
    }
    updateSelCount();
    updateBaseColourOptions();
}

/**
 * Update selected colour count display
 */
function updateSelCount() {
    document.querySelectorAll('.colour-item').forEach((el, i) => {
        el.classList.toggle('selected', sel.includes(i));
    });
    document.getElementById('selCount').textContent = sel.length;
}

/**
 * Update base colour dropdown options
 */
function updateBaseColourOptions() {
    const select = document.getElementById('baseColour');
    select.innerHTML = '<option value="-1">White (default)</option>';

    sel.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = COLOURS[i].n;
        select.appendChild(opt);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
