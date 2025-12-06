/**
 * 4-Colour FDM Workflow - Main Application
 * Redesigned with tab-based UI
 */

// Import existing modules
import { COLOURS } from './js/constants.js';

// ============================================================================
// GLOBAL STATE
// ============================================================================

const state = {
  // Selected filament indices
  selectedFilaments: [],

  // Tab-specific data
  grid: null,
  scans: [],
  activeScan: null,
  imageProcess: {
    mode: 'auto', // 'auto', 'raster', 'vector'
    original: null,
    processed: null
  },
  model: null,

  // Shared data
  palette: null,
  sequences: new Map(),

  // UI state
  activeTab: 'grid',
  canvasStates: {}
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎨 4-Colour FDM Workflow - Initializing...');

  initTabs();
  initFilamentPicker();
  initCanvasControls();
  initUploadZones();
  initButtonHandlers();

  console.log('✅ Application ready');
});

// ============================================================================
// TAB NAVIGATION
// ============================================================================

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });

  // Navigation links (in export tab)
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.nav;
      switchTab(tabId);
    });
  });

  // Info buttons -> Docs tab
  document.querySelectorAll('.btn-info').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab('docs');
    });
  });
}

function switchTab(tabId) {
  // Update state
  state.activeTab = tabId;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Update tab views
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === `tab-${tabId}`);
  });

  // Tab-specific initialization
  onTabActivate(tabId);
}

function onTabActivate(tabId) {
  switch(tabId) {
    case 'grid':
      updateGridUI();
      break;
    case 'scan':
      updateScanUI();
      break;
    case 'image-process':
      updateImageProcessUI();
      break;
    case 'model-builder':
      updateModelBuilderUI();
      break;
    case 'export':
      updateExportSummary();
      break;
  }
}

// ============================================================================
// FILAMENT PICKER
// ============================================================================

function initFilamentPicker() {
  const grid = document.getElementById('filamentGrid');
  const searchBar = document.getElementById('filamentSearch');

  // Populate grid
  renderFilamentGrid(COLOURS);

  // Search functionality
  searchBar.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = COLOURS.filter(c =>
      c.n.toLowerCase().includes(query)
    );
    renderFilamentGrid(filtered);
  });
}

function renderFilamentGrid(colours) {
  const grid = document.getElementById('filamentGrid');
  grid.innerHTML = '';

  colours.forEach((colour, idx) => {
    const originalIdx = COLOURS.indexOf(colour);
    const div = document.createElement('div');
    div.className = 'filament-swatch';
    if (state.selectedFilaments.includes(originalIdx)) {
      div.classList.add('selected');
    }

    div.innerHTML = `
      <div class="filament-colour-box" style="background: ${colour.h}"></div>
      <div class="filament-name">${colour.n}</div>
    `;

    div.addEventListener('click', () => toggleFilament(originalIdx));
    grid.appendChild(div);
  });
}

function toggleFilament(idx) {
  const pos = state.selectedFilaments.indexOf(idx);

  if (pos > -1) {
    // Remove
    state.selectedFilaments.splice(pos, 1);
  } else {
    // Add (max 10)
    if (state.selectedFilaments.length >= 10) {
      showMessage('Maximum 10 filaments allowed', 'error');
      return;
    }
    state.selectedFilaments.push(idx);
  }

  updateSelectedColoursRow();
  renderFilamentGrid(COLOURS);
  updateBaseColourDropdown();
}

function updateSelectedColoursRow() {
  const row = document.getElementById('selectedColoursRow');

  if (state.selectedFilaments.length === 0) {
    row.innerHTML = '<span class="placeholder">Select 2-10 filaments below</span>';
    return;
  }

  row.innerHTML = '';
  state.selectedFilaments.forEach(idx => {
    const colour = COLOURS[idx];
    const chip = document.createElement('div');
    chip.className = 'selected-colour-chip';
    chip.style.background = colour.h;
    chip.title = colour.n;
    chip.addEventListener('click', () => toggleFilament(idx));
    row.appendChild(chip);
  });
}

function updateBaseColourDropdown() {
  const select = document.getElementById('baseColour');
  select.innerHTML = '<option value="-1">White (default)</option>';

  state.selectedFilaments.forEach(idx => {
    const colour = COLOURS[idx];
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = colour.n;
    select.appendChild(option);
  });
}

// ============================================================================
// CANVAS CONTROLS
// ============================================================================

function initCanvasControls() {
  // Grid canvas controls
  document.getElementById('gridZoomIn')?.addEventListener('click', () => zoomCanvas('gridCanvas', 1.2));
  document.getElementById('gridZoomOut')?.addEventListener('click', () => zoomCanvas('gridCanvas', 0.8));
  document.getElementById('gridReset')?.addEventListener('click', () => resetCanvas('gridCanvas'));

  // Scan canvas controls
  document.getElementById('scanZoomIn')?.addEventListener('click', () => zoomCanvas('scanCanvas', 1.2));
  document.getElementById('scanZoomOut')?.addEventListener('click', () => zoomCanvas('scanCanvas', 0.8));
  document.getElementById('scanReset')?.addEventListener('click', () => resetCanvas('scanCanvas'));
  document.getElementById('scanToggleOverlay')?.addEventListener('click', toggleScanOverlay);

  // Image process canvas controls
  document.getElementById('imgZoomIn')?.addEventListener('click', () => zoomCanvas('imageProcessCanvas', 1.2));
  document.getElementById('imgZoomOut')?.addEventListener('click', () => zoomCanvas('imageProcessCanvas', 0.8));
  document.getElementById('imgReset')?.addEventListener('click', () => resetCanvas('imageProcessCanvas'));

  // 3D viewer controls
  document.getElementById('viewFront')?.addEventListener('click', () => setViewerOrientation('front'));
  document.getElementById('viewTop')?.addEventListener('click', () => setViewerOrientation('top'));
  document.getElementById('viewSide')?.addEventListener('click', () => setViewerOrientation('side'));

  // Enable pinch/drag on all canvases
  enableCanvasInteraction('gridCanvas');
  enableCanvasInteraction('scanCanvas');
  enableCanvasInteraction('imageProcessCanvas');
}

function zoomCanvas(canvasId, factor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (!state.canvasStates[canvasId]) {
    state.canvasStates[canvasId] = { scale: 1, offsetX: 0, offsetY: 0 };
  }

  state.canvasStates[canvasId].scale *= factor;
  applyCanvasTransform(canvasId);
}

function resetCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  state.canvasStates[canvasId] = { scale: 1, offsetX: 0, offsetY: 0 };
  applyCanvasTransform(canvasId);
}

function applyCanvasTransform(canvasId) {
  const canvas = document.getElementById(canvasId);
  const canvasState = state.canvasStates[canvasId] || { scale: 1, offsetX: 0, offsetY: 0 };

  canvas.style.transform = `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px) scale(${canvasState.scale})`;
  canvas.style.transformOrigin = 'center center';
}

function enableCanvasInteraction(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  let isDragging = false;
  let startX, startY;

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    if (!state.canvasStates[canvasId]) {
      state.canvasStates[canvasId] = { scale: 1, offsetX: 0, offsetY: 0 };
    }

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    state.canvasStates[canvasId].offsetX += dx;
    state.canvasStates[canvasId].offsetY += dy;

    startX = e.clientX;
    startY = e.clientY;

    applyCanvasTransform(canvasId);
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  // Touch events (pinch zoom)
  let initialDistance = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDistance = getDistance(e.touches[0], e.touches[1]);
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const factor = currentDistance / initialDistance;

      if (!state.canvasStates[canvasId]) {
        state.canvasStates[canvasId] = { scale: 1, offsetX: 0, offsetY: 0 };
      }

      state.canvasStates[canvasId].scale *= factor;
      initialDistance = currentDistance;

      applyCanvasTransform(canvasId);
    }
  });

  // Wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomCanvas(canvasId, factor);
  }, { passive: false });

  canvas.style.cursor = 'grab';
}

function getDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function toggleScanOverlay() {
  // TODO: Implement overlay toggle
  console.log('Toggle scan overlay');
}

function setViewerOrientation(view) {
  const viewer = document.getElementById('viewer3d');
  if (!viewer) return;

  // TODO: Set camera orientation using model-viewer API
  console.log('Set view:', view);
}

// ============================================================================
// UPLOAD ZONES
// ============================================================================

function initUploadZones() {
  // Scan file upload
  const scanFileInput = document.getElementById('scanFileInput');
  document.getElementById('addScan')?.addEventListener('click', () => {
    scanFileInput.click();
  });
  scanFileInput.addEventListener('change', handleScanUpload);

  // Image upload zone
  const imageUploadZone = document.getElementById('imageUploadZone');
  const imageFileInput = document.getElementById('imageFileInput');

  imageUploadZone?.addEventListener('click', () => {
    imageFileInput.click();
  });

  imageFileInput?.addEventListener('change', handleImageUpload);

  // Drag and drop
  imageUploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadZone.style.borderColor = 'var(--primary)';
  });

  imageUploadZone?.addEventListener('dragleave', () => {
    imageUploadZone.style.borderColor = '';
  });

  imageUploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadZone.style.borderColor = '';

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    }
  });

  // GPL palette import
  const gplFileInput = document.getElementById('gplFileInput');
  document.getElementById('importGPL')?.addEventListener('click', () => {
    gplFileInput.click();
  });
}

function handleScanUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  console.log('📷 Scan uploaded:', file.name);
  // TODO: Process scan file
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  handleImageFile(file);
}

function handleImageFile(file) {
  console.log('🖼️ Image uploaded:', file.name);

  // Detect mode
  const isSVG = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
  const mode = isSVG ? 'vector' : 'raster';

  state.imageProcess.mode = mode;
  updateModeDisplay(mode);

  // TODO: Load and display image
}

function updateModeDisplay(mode) {
  const badge = document.getElementById('modeBadge');
  badge.textContent = `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;

  // Show/hide mode controls
  const rasterControls = document.getElementById('rasterControls');
  const vectorControls = document.getElementById('vectorControls');

  if (mode === 'raster') {
    rasterControls.classList.remove('hidden');
    vectorControls.classList.add('hidden');
  } else {
    rasterControls.classList.add('hidden');
    vectorControls.classList.remove('hidden');
  }
}

// ============================================================================
// BUTTON HANDLERS (Placeholders for now)
// ============================================================================

function initButtonHandlers() {
  // Grid tab
  document.getElementById('generateGrid')?.addEventListener('click', generateGrid);
  document.getElementById('exportGridJSON')?.addEventListener('click', () => console.log('Export grid JSON'));
  document.getElementById('exportGridSTLs')?.addEventListener('click', () => console.log('Export grid STLs'));

  // Scan tab
  document.getElementById('analyseExtractPalette')?.addEventListener('click', () => console.log('Analyse & extract'));
  document.getElementById('autoAlign')?.addEventListener('click', () => console.log('Auto-align'));
  document.getElementById('resetAlignment')?.addEventListener('click', () => console.log('Reset alignment'));

  // Image Process tab
  document.getElementById('quantiseImage')?.addEventListener('click', () => console.log('Quantise image'));
  document.getElementById('processVector')?.addEventListener('click', () => console.log('Process vector'));

  // Model Builder tab
  document.getElementById('generateModel')?.addEventListener('click', () => console.log('Generate model'));

  // Export tab
  document.getElementById('runExport')?.addEventListener('click', () => console.log('Run export'));

  // Popup
  document.getElementById('closePopup')?.addEventListener('click', closePopup);
}

function closePopup() {
  document.getElementById('popup').classList.remove('show');
}

// ============================================================================
// TAB-SPECIFIC UI UPDATES
// ============================================================================

function updateGridUI() {
  // Update stats
  if (state.grid) {
    document.getElementById('statSeqs').textContent = state.grid.seqs.length;
    document.getElementById('statRows').textContent = state.grid.rows;
    document.getElementById('statCols').textContent = state.grid.cols;
    document.getElementById('statSize').textContent = `${state.grid.width.toFixed(1)}×${state.grid.height.toFixed(1)}mm`;
  }
}

function updateScanUI() {
  const scanList = document.getElementById('scanList');

  if (state.scans.length === 0) {
    scanList.innerHTML = '<p class="placeholder">No scans loaded</p>';
    return;
  }

  // TODO: Render scan list
}

function updateImageProcessUI() {
  // Update mode display
  if (state.imageProcess.mode !== 'auto') {
    updateModeDisplay(state.imageProcess.mode);
  }
}

function updateModelBuilderUI() {
  // Update mesh list
  const meshItems = document.getElementById('meshItems');

  if (!state.model || !state.model.meshes) {
    meshItems.innerHTML = '<p class="placeholder">No model generated yet</p>';
    return;
  }

  // TODO: Render mesh list
}

function updateExportSummary() {
  document.getElementById('sumFilaments').textContent = state.selectedFilaments.length || '—';
  document.getElementById('sumSequences').textContent = state.grid?.seqs.length || '—';
  document.getElementById('sumScans').textContent = state.scans.length || '—';
  document.getElementById('sumImage').textContent = state.imageProcess.original ? 'Loaded' : '—';
  document.getElementById('sumMeshes').textContent = state.model?.meshes?.length || '—';

  // Render swatches
  const swatchRow = document.getElementById('sumSwatches');
  swatchRow.innerHTML = '';
  state.selectedFilaments.forEach(idx => {
    const colour = COLOURS[idx];
    const swatch = document.createElement('div');
    swatch.className = 'palette-swatch';
    swatch.style.background = colour.h;
    swatch.style.width = '32px';
    swatch.style.height = '32px';
    swatch.title = colour.n;
    swatchRow.appendChild(swatch);
  });
}

// ============================================================================
// CORE FUNCTIONALITY (Will be migrated from existing code)
// ============================================================================

function generateGrid() {
  if (state.selectedFilaments.length < 2) {
    showMessage('Please select at least 2 filaments', 'error');
    return;
  }

  console.log('🔧 Generating grid...');
  // TODO: Import and call grid generation logic from js/grid.js

  showMessage('Grid generation will be implemented next', 'info');
}

// ============================================================================
// UTILITIES
// ============================================================================

function showMessage(text, type = 'info') {
  // Simple console message for now
  console.log(`[${type.toUpperCase()}] ${text}`);

  // TODO: Implement proper toast/notification system
}

// Export state for debugging
window.appState = state;
