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
// TAB 1: GRID GENERATION
// ============================================================================

/**
 * Generate all possible layer sequences for N colours and M layers
 */
function generateSequences(N, M) {
  const seqs = [];

  function isValid(s) {
    // Reject all-empty sequences
    if (s.every(v => v === 0)) return false;
    // Reject sequences with gaps (non-zero after zero)
    let z = false;
    for (let v of s) {
      if (v === 0) z = true;
      else if (z) return false;
    }
    return true;
  }

  function gen(cur, d) {
    if (d === M) {
      if (isValid(cur)) seqs.push([...cur]);
      return;
    }
    if (cur.length > 0 && cur[cur.length - 1] === 0) {
      gen([...cur, 0], d + 1);
    } else {
      for (let v = 0; v <= N; v++) {
        gen([...cur, v], d + 1);
      }
    }
  }

  gen([], 0);
  return seqs;
}

/**
 * Simulate the final color from a layer sequence
 */
function simColour(seq, colours) {
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
 * Convert hex color to RGB
 */
function hex2rgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  } : {r: 255, g: 255, b: 255};
}

/**
 * Standardized RGB key for Map lookups
 */
function rgb_to_key(rgb) {
  const r = Math.round(rgb.r);
  const g = Math.round(rgb.g);
  const b = Math.round(rgb.b);
  return `${r},${g},${b}`;
}

/**
 * Generate the calibration grid
 */
function generateGrid() {
  if (state.selectedFilaments.length < 2) {
    showMessage('Please select at least 2 filaments', 'error');
    return;
  }

  const N = state.selectedFilaments.length;
  const M = +document.getElementById('layersPerTile').value;
  const tile = +document.getElementById('tileSize').value;
  const gap = +document.getElementById('gapSize').value;
  const bedW = +document.getElementById('bedW').value;
  const bedH = +document.getElementById('bedH').value;
  const scanW = +document.getElementById('scanW').value;
  const scanH = +document.getElementById('scanH').value;

  const maxW = Math.min(bedW, scanW);
  const maxH = Math.min(bedH, scanH);

  // Generate sequences
  const seqs = generateSequences(N, M);
  console.log(`Generated ${seqs.length} sequences`);

  // Calculate grid layout
  const tilesPerRow = Math.floor(maxW / (tile + gap));
  const tilesPerCol = Math.floor(maxH / (tile + gap));
  const maxTiles = tilesPerRow * tilesPerCol;

  if (seqs.length > maxTiles) {
    showMessage(`${seqs.length} sequences won't fit! Max: ${maxTiles}`, 'error');
    return;
  }

  let rows = Math.ceil(Math.sqrt(seqs.length));
  let cols = Math.ceil(seqs.length / rows);

  while (cols > tilesPerRow || rows > tilesPerCol) {
    if (cols > tilesPerRow) {
      rows++;
      cols = Math.ceil(seqs.length / rows);
    } else {
      cols++;
      rows = Math.ceil(seqs.length / cols);
    }
    if (rows * cols > maxTiles) {
      showMessage('Cannot fit sequences in available space', 'error');
      return;
    }
  }

  // Calculate empty cells
  const totalCells = rows * cols;
  const emptyCells = [];
  for (let i = seqs.length; i < totalCells; i++) {
    emptyCells.push(i);
  }

  // Get selected colours
  const colours = state.selectedFilaments.map(i => COLOURS[i]);

  // Store grid data
  state.grid = {
    seqs,
    rows,
    cols,
    tile,
    gap,
    colours,
    width: cols * (tile + gap) - gap,
    height: rows * (tile + gap) - gap,
    empty_cells: emptyCells
  };

  // Build sequence map
  state.sequences.clear();
  seqs.forEach((seq, idx) => {
    const colour = simColour(seq, colours);
    const key = rgb_to_key(colour);
    state.sequences.set(key, {
      sequence: seq,
      colours: colours,
      grid_position: {
        row: Math.floor(idx / cols),
        col: idx % cols,
        index: idx
      }
    });
  });

  // Draw grid
  drawGrid();

  // Update visualizations
  drawZConfigViz();
  drawXYConfigViz();

  // Update UI
  updateGridUI();

  showMessage(`✓ Generated ${seqs.length} sequences in ${rows}×${cols} grid`, 'success');
}

/**
 * Draw the grid on canvas
 */
function drawGrid() {
  const canvas = document.getElementById('gridCanvas');
  const ctx = canvas.getContext('2d');

  if (!state.grid) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const { seqs, rows, cols, colours, empty_cells } = state.grid;
  const container = canvas.parentElement;

  // Calculate scale to fit container
  const scale = Math.min(
    container.clientWidth / cols,
    (container.clientHeight - 80) / rows  // Leave room for stats
  );

  // Set canvas size
  canvas.width = cols * scale;
  canvas.height = rows * scale;

  // Auto-fit canvas
  canvas.style.width = `${cols * scale}px`;
  canvas.style.height = `${rows * scale}px`;

  // Draw filled cells
  seqs.forEach((seq, i) => {
    if (i >= rows * cols) return;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const colour = simColour(seq, colours);

    ctx.fillStyle = `rgb(${colour.r},${colour.g},${colour.b})`;
    ctx.fillRect(col * scale, row * scale, scale, scale);

    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(col * scale, row * scale, scale, scale);
  });

  // Draw empty cells
  if (empty_cells) {
    empty_cells.forEach(emptyIdx => {
      const row = Math.floor(emptyIdx / cols);
      const col = emptyIdx % cols;
      const x = col * scale;
      const y = row * scale;

      // Grey background
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(x, y, scale, scale);

      // Grey border
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, scale, scale);

      // Draw X
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5);
      ctx.lineTo(x + scale - 5, y + scale - 5);
      ctx.moveTo(x + scale - 5, y + 5);
      ctx.lineTo(x + 5, y + scale - 5);
      ctx.stroke();
    });
  }

  // Add click handler
  setupGridClick();
}

/**
 * Setup click handler for grid tiles
 */
function setupGridClick() {
  const canvas = document.getElementById('gridCanvas');
  if (!state.grid) return;

  // Remove old listener
  const newCanvas = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(newCanvas, canvas);

  newCanvas.addEventListener('click', (e) => {
    const rect = newCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cellW = newCanvas.width / state.grid.cols;
    const cellH = newCanvas.height / state.grid.rows;

    const col = Math.floor(clickX / cellW);
    const row = Math.floor(clickY / cellH);

    if (col < 0 || col >= state.grid.cols || row < 0 || row >= state.grid.rows) {
      return;
    }

    const cellIdx = row * state.grid.cols + col;

    // Check if empty
    if (state.grid.empty_cells && state.grid.empty_cells.includes(cellIdx)) {
      showMessage('Empty cell - no sequence', 'info');
      return;
    }

    // Check if valid
    if (cellIdx >= state.grid.seqs.length) {
      return;
    }

    // Show popup
    const sequence = state.grid.seqs[cellIdx];
    showSequencePopup(sequence, {row, col, index: cellIdx});
  });

  // Re-apply canvas transform
  if (state.canvasStates['gridCanvas']) {
    applyCanvasTransform('gridCanvas');
  }
}

/**
 * Show sequence details popup
 */
function showSequencePopup(sequence, position) {
  const colour = simColour(sequence, state.grid.colours);

  let html = `
    <div style="margin-bottom: 12px;">
      <strong>Position:</strong> Row ${position.row}, Col ${position.col} (#${position.index})<br>
      <strong>RGB:</strong> rgb(${colour.r}, ${colour.g}, ${colour.b})<br>
      <strong>Sequence:</strong> [${sequence.join(', ')}]
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px;">
  `;

  sequence.forEach((filIdx, layerIdx) => {
    if (filIdx === 0) {
      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px; background: #f0f0f0; border-radius: 3px;">
          <div style="width: 20px; height: 14px; border: 2px dashed #999; background: #fff; border-radius: 2px;"></div>
          <span style="font-size: 11px;">Layer ${layerIdx}: Empty</span>
        </div>
      `;
    } else {
      const col = state.grid.colours[filIdx - 1];
      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 4px; background: #f0f0f0; border-radius: 3px;">
          <div style="width: 20px; height: 14px; background: ${col.h}; border: 1px solid #ccc; border-radius: 2px;"></div>
          <span style="font-size: 11px;">Layer ${layerIdx}: ${col.n}</span>
        </div>
      `;
    }
  });

  html += '</div>';

  document.getElementById('popupContent').innerHTML = html;
  document.getElementById('popup').classList.add('show');
}

/**
 * Draw Z-Config visualization (side view)
 */
function drawZConfigViz() {
  const viz = document.getElementById('zConfigViz');
  if (!state.grid) {
    viz.innerHTML = '<span class="placeholder">Generate grid to see visualization</span>';
    return;
  }

  const layers = +document.getElementById('layersPerTile').value;
  const layerH = +document.getElementById('layerH').value;
  const baseLayers = +document.getElementById('baseLayers').value;

  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');

  const totalH = (layers + baseLayers) * layerH;
  const scale = 80 / totalH;

  let y = 80;

  // Draw base layers
  if (baseLayers > 0) {
    const h = baseLayers * layerH * scale;
    ctx.fillStyle = '#ddd';
    ctx.fillRect(50, y - h, 100, h);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(50, y - h, 100, h);
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.fillText(`Base (${baseLayers}×${layerH}mm)`, 52, y - h/2 + 3);
    y -= h;
  }

  // Draw colour layers
  for (let i = 0; i < layers; i++) {
    const h = layerH * scale;
    const colour = state.grid.colours[i % state.grid.colours.length];
    ctx.fillStyle = colour.h;
    ctx.fillRect(50, y - h, 100, h);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(50, y - h, 100, h);
    y -= h;
  }

  viz.innerHTML = '';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  viz.appendChild(canvas);
}

/**
 * Draw XY-Config visualization (top-down view)
 */
function drawXYConfigViz() {
  const viz = document.getElementById('xyConfigViz');
  if (!state.grid) {
    viz.innerHTML = '<span class="placeholder">Generate grid to see visualization</span>';
    return;
  }

  const { rows, cols, tile, gap } = state.grid;

  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');

  const gridW = cols * (tile + gap) - gap;
  const gridH = rows * (tile + gap) - gap;
  const scale = Math.min(180 / gridW, 180 / gridH);

  const offsetX = (200 - gridW * scale) / 2;
  const offsetY = (200 - gridH * scale) / 2;

  // Draw tiles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * (tile + gap) * scale;
      const y = offsetY + r * (tile + gap) * scale;
      const w = tile * scale;
      const h = tile * scale;

      ctx.fillStyle = '#007bff';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#666';
      ctx.strokeRect(x, y, w, h);
    }
  }

  viz.innerHTML = '';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  viz.appendChild(canvas);
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
