/**
 * CodePen Loader - Single Entry Point
 * This module builds the entire app when imported
 * All changes to app.html, app-styles.css, and app.js will be reflected here
 */

import { COLOURS } from './lib/core/constants.js';

/**
 * Initialize the complete application
 * Injects CSS, HTML structure, and runs all application logic
 */
export async function init() {
  console.log('🎨 Initializing Multifilament Image Print Studio...');

  // 1. Inject CSS
  injectStyles();

  // 2. Build HTML structure
  buildHTML();

  // 3. Initialize application logic
  await initializeApp();

  console.log('✅ Application ready');
}

/**
 * Inject CSS stylesheets
 */
function injectStyles() {
  // Main application styles
  const appStyles = document.createElement('link');
  appStyles.rel = 'stylesheet';
  appStyles.href = 'https://cdn.jsdelivr.net/gh/Cyrusublerman/Experiments@main/app-styles.css';
  document.head.appendChild(appStyles);

  // Google Fonts
  const fonts = document.createElement('link');
  fonts.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap';
  fonts.rel = 'stylesheet';
  document.head.appendChild(fonts);

  // FileSaver.js
  const fileSaver = document.createElement('script');
  fileSaver.src = 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js';
  document.head.appendChild(fileSaver);

  // Model Viewer
  const modelViewer = document.createElement('script');
  modelViewer.type = 'module';
  modelViewer.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
  document.head.appendChild(modelViewer);
}

/**
 * Build complete HTML structure
 * This is the entire app.html content as a template
 */
function buildHTML() {
  document.body.innerHTML = `
<!-- TAB BAR -->
<nav class="tab-bar">
  <button class="tab-btn active" data-tab="grid">Grid</button>
  <button class="tab-btn" data-tab="scan">Scan</button>
  <button class="tab-btn" data-tab="image-process">Image Process</button>
  <button class="tab-btn" data-tab="model-builder">Model Builder</button>
  <button class="tab-btn" data-tab="export">Export</button>
  <button class="tab-btn" data-tab="docs">Docs</button>
</nav>

<!-- TAB 1: GRID -->
<div class="tab-view active" id="tab-grid">
  <div class="left-column">
    <section class="control-group">
      <h3>Filament Picker</h3>
      <div class="selected-colours-row" id="selectedColoursRow">
        <span class="placeholder">Select 2-10 filaments below</span>
      </div>
      <input type="text" class="search-bar" placeholder="Search filaments..." id="filamentSearch">
      <div class="filament-swatch-grid" id="filamentGrid"></div>
    </section>

    <section class="control-group">
      <h3>Physical Constraints</h3>
      <div class="form-row">
        <label>Bed Width (mm)</label>
        <input type="number" id="bedW" value="256" min="100">
      </div>
      <div class="form-row">
        <label>Bed Height (mm)</label>
        <input type="number" id="bedH" value="256" min="100">
      </div>
      <div class="form-row">
        <label>Scan Width (mm)</label>
        <input type="number" id="scanW" value="210" min="100">
      </div>
      <div class="form-row">
        <label>Scan Height (mm)</label>
        <input type="number" id="scanH" value="297" min="100">
      </div>
    </section>

    <section class="control-group">
      <h3>Grid Z-Config</h3>
      <div class="form-row">
        <label>Layers per Tile</label>
        <input type="number" id="layersPerTile" value="4" min="1" max="10">
      </div>
      <div class="form-row">
        <label>Layer Height (mm)</label>
        <input type="number" id="layerH" value="0.08" min="0.04" max="0.4" step="0.01">
      </div>
      <div class="form-row">
        <label>Base Layers</label>
        <input type="number" id="baseLayers" value="3" min="0" max="10">
      </div>
      <div class="form-row">
        <label>Base Layer Colour</label>
        <select id="baseColour">
          <option value="-1">White (default)</option>
        </select>
      </div>
      <div class="visualisation-box" id="zConfigViz">
        <span class="placeholder">Side-view visualization</span>
      </div>
    </section>

    <section class="control-group">
      <h3>Grid XY-Config</h3>
      <div class="form-row">
        <label>Tile Size (mm)</label>
        <input type="number" id="tileSize" value="10" min="2" max="20" step="0.5">
      </div>
      <div class="form-row">
        <label>Gap Size (mm)</label>
        <input type="number" id="gapSize" value="1" min="0" max="5" step="0.5">
      </div>
      <div class="form-row">
        <label>
          <input type="checkbox" id="baseFill" checked>
          Base Fill
        </label>
      </div>
      <div class="visualisation-box" id="xyConfigViz">
        <span class="placeholder">Top-down visualization</span>
      </div>
    </section>

    <section class="control-group">
      <h3>Actions</h3>
      <button class="btn-primary" id="generateGrid">Generate Grid</button>
      <div class="btn-group">
        <button class="btn-secondary" id="exportGridJSON">Export Grid JSON</button>
        <button class="btn-secondary" id="importGridJSON">Import Grid JSON</button>
        <button class="btn-secondary" id="exportGridSTLs">Export STLs</button>
        <button class="btn-secondary" id="exportRefImage">Export Reference Image</button>
      </div>
    </section>
  </div>

  <div class="right-pane">
    <div class="canvas-container">
      <canvas id="gridCanvas"></canvas>
      <div class="icon-btn-cluster">
        <button class="btn-icon" title="Zoom In" id="gridZoomIn">+</button>
        <button class="btn-icon" title="Zoom Out" id="gridZoomOut">−</button>
        <button class="btn-icon" title="Reset" id="gridReset">⟲</button>
      </div>
      <button class="btn-info" title="Help">?</button>
    </div>
    <div class="stats-row" id="gridStats">
      <div class="stat"><span class="stat-label">Sequences</span><span class="stat-value" id="statSeqs">0</span></div>
      <div class="stat"><span class="stat-label">Rows</span><span class="stat-value" id="statRows">0</span></div>
      <div class="stat"><span class="stat-label">Columns</span><span class="stat-value" id="statCols">0</span></div>
      <div class="stat"><span class="stat-label">Size</span><span class="stat-value" id="statSize">0×0mm</span></div>
    </div>
  </div>
</div>

<!-- TAB 2: SCAN -->
<div class="tab-view" id="tab-scan">
  <div class="left-column">
    <section class="control-group">
      <h3>Scan List</h3>
      <button class="btn-secondary" id="addScan">+ Add Scan</button>
      <input type="file" id="scanFileInput" accept="image/*" style="display:none">
      <div class="scan-list" id="scanList">
        <p class="placeholder">No scans loaded</p>
      </div>
    </section>

    <section class="control-group">
      <h3>Alignment</h3>
      <div class="form-row">
        <label>Offset X (px)</label>
        <input type="number" id="alignOffsetX" value="0" step="1">
      </div>
      <div class="form-row">
        <label>Offset Y (px)</label>
        <input type="number" id="alignOffsetY" value="0" step="1">
      </div>
      <div class="form-row">
        <label>Scale X</label>
        <input type="number" id="alignScaleX" value="1" step="0.01" min="0.1" max="5">
      </div>
      <div class="form-row">
        <label>Scale Y</label>
        <input type="number" id="alignScaleY" value="1" step="0.01" min="0.1" max="5">
      </div>
      <div class="form-row">
        <label>Dead Space (%)</label>
        <input type="number" id="deadSpace" value="60" min="20" max="90">
      </div>
      <div class="btn-group">
        <button class="btn-secondary" id="autoAlign">Auto-Align</button>
        <button class="btn-tertiary" id="resetAlignment">Reset Alignment</button>
      </div>
    </section>

    <section class="control-group">
      <h3>Analysis</h3>
      <button class="btn-primary" id="analyseExtractPalette">Analyse & Extract Palette</button>
      <div class="btn-group">
        <button class="btn-secondary" id="exportAlignJSON">Export Alignment JSON</button>
        <button class="btn-tertiary" id="removeDuplicates">Remove Duplicates</button>
      </div>
    </section>
  </div>

  <div class="right-pane">
    <div class="canvas-container">
      <canvas id="scanCanvas"></canvas>
      <div class="icon-btn-cluster">
        <button class="btn-icon" title="Zoom In" id="scanZoomIn">+</button>
        <button class="btn-icon" title="Zoom Out" id="scanZoomOut">−</button>
        <button class="btn-icon" title="Toggle Overlay" id="scanToggleOverlay">⊞</button>
        <button class="btn-icon" title="Reset" id="scanReset">⟲</button>
      </div>
      <button class="btn-info" title="Help">?</button>
    </div>
    <div class="palette-strip" id="paletteStrip">
      <p class="placeholder">Palette will appear after analysis</p>
    </div>
    <div class="summary-metrics" id="scanMetrics">
      <div class="metric"><span class="metric-label">Scanned</span><span class="metric-value" id="metricScanned">0</span></div>
      <div class="metric"><span class="metric-label">Unique</span><span class="metric-value" id="metricUnique">0</span></div>
      <div class="metric"><span class="metric-label">Duplicates</span><span class="metric-value" id="metricDups">0</span></div>
      <div class="metric"><span class="metric-label">px/mm</span><span class="metric-value" id="metricPxMm">—</span></div>
    </div>
  </div>
</div>

<!-- TAB 3-6: Placeholder stubs -->
<div class="tab-view" id="tab-image-process">
  <div class="left-column">
    <section class="control-group">
      <h3>Image Process</h3>
      <p>Coming soon...</p>
    </section>
  </div>
</div>

<div class="tab-view" id="tab-model-builder">
  <div class="left-column">
    <section class="control-group">
      <h3>Model Builder</h3>
      <p>Coming soon...</p>
    </section>
  </div>
</div>

<div class="tab-view" id="tab-export">
  <div class="left-column">
    <section class="control-group">
      <h3>Export</h3>
      <p>Coming soon...</p>
    </section>
  </div>
</div>

<div class="tab-view" id="tab-docs">
  <div class="right-pane" style="grid-column: 1 / -1;">
    <div class="docs-content">
      <h1>Multifilament Image Print - Technical Documentation</h1>
      <p>For complete documentation, visit the <a href="https://github.com/Cyrusublerman/Experiments" target="_blank">GitHub repository</a>.</p>
      <p>This is a live demo pulling from the main branch. All improvements are automatically reflected here.</p>
    </div>
  </div>
</div>

<!-- Popup for sequence details -->
<div class="popup" id="popup">
  <button class="btn-close" id="closePopup">×</button>
  <h4>Sequence Details</h4>
  <div class="popup-content" id="popupContent"></div>
</div>

<!-- Hidden canvases for processing -->
<canvas id="workCanvas" style="display:none"></canvas>
  `;
}

/**
 * Initialize application logic (from app.js)
 * This dynamically imports and runs the main application module
 */
async function initializeApp() {
  // Import the main app module which contains all the logic
  const appModule = await import('./app.js');

  // The app.js file runs automatically when imported (it's not exported as a module yet)
  // For now, we just import it and it initializes itself
  console.log('App module loaded');
}
