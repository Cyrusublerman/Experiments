/**
 * Export Functions Module
 * Handles exporting grids, STLs, palettes, and print files
 */

import { COLOURS } from './constants.js';
import { grid, pal, sel, align, quant, filamentLayers } from './state.js';
import { simColour, msg } from './utils.js';

/**
 * Export grid configuration as JSON
 */
export function exportGridJSON() {
    if (!grid) return;

    const data = {
        version: "1.0",
        colours: grid.colours,
        sequences: grid.seqs,
        config: {
            rows: grid.rows,
            cols: grid.cols,
            tile: grid.tile,
            gap: grid.gap,
            layers: document.getElementById('layers').value,
            layerH: document.getElementById('layerH').value,
            baseLayers: document.getElementById('baseLayers').value
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    saveAs(blob, 'calibration_grid.json');
    msg(1, '✓ Exported', 'ok');
}

/**
 * Import grid configuration from JSON
 */
export function importGridJSON() {
    const f = document.getElementById('importJSON').files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);

            // Reconstruct grid
            const importedGrid = {
                seqs: data.sequences,
                rows: data.config.rows,
                cols: data.config.cols,
                tile: data.config.tile,
                gap: data.config.gap,
                colours: data.colours,
                width: data.config.cols * (data.config.tile + data.config.gap) - data.config.gap,
                height: data.config.rows * (data.config.tile + data.config.gap) - data.config.gap
            };

            // Calculate empty cells
            const totalCells = importedGrid.rows * importedGrid.cols;
            importedGrid.empty_cells = [];
            for (let i = importedGrid.seqs.length; i < totalCells; i++) {
                importedGrid.empty_cells.push(i);
            }

            // Update state
            window.grid = importedGrid;

            // Rebuild sequences map
            window.sequences.clear();
            importedGrid.seqs.forEach((seq, idx) => {
                const colour = simColour(seq, importedGrid.colours);
                const key = `${Math.round(colour.r)},${Math.round(colour.g)},${Math.round(colour.b)}`;
                window.sequences.set(key, {
                    sequence: seq,
                    colours: importedGrid.colours,
                    grid_position: {
                        row: Math.floor(idx / importedGrid.cols),
                        col: idx % importedGrid.cols,
                        index: idx
                    }
                });
            });

            // Reconstruct selected colors
            window.sel = [];
            importedGrid.colours.forEach(col => {
                const idx = COLOURS.findIndex(c => c.h === col.h && c.n === col.n);
                if (idx >= 0) window.sel.push(idx);
            });

            // Update UI
            document.getElementById('layers').value = data.config.layers;
            document.getElementById('layerH').value = data.config.layerH;
            document.getElementById('baseLayers').value = data.config.baseLayers;

            // Redraw
            const drawGridFunc = window.drawGrid || (() => {});
            drawGridFunc();

            document.getElementById('gridBox').classList.remove('hidden');
            document.getElementById('totSeqs').textContent = importedGrid.seqs.length;
            document.getElementById('gridRows').textContent = importedGrid.rows;
            document.getElementById('gridCols').textContent = importedGrid.cols;
            document.getElementById('gridDims').textContent = `${importedGrid.width.toFixed(1)}×${importedGrid.height.toFixed(1)}mm`;

            msg(1, '✓ Imported', 'ok');
        } catch (e) {
            msg(1, `Error: ${e.message}`, 'err');
        }
    };
    reader.readAsText(f);
}

/**
 * Export reference image showing all grid cells with labels
 */
export function exportReferenceImage() {
    if (!grid) return;
    msg(1, 'Generating...', 'info');

    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const cellSize = 120;
        const pad = 5;
        const cellTotal = cellSize + pad;

        canvas.width = grid.cols * cellTotal + pad;
        canvas.height = grid.rows * cellTotal + pad;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        grid.seqs.forEach((seq, i) => {
            if (i >= grid.rows * grid.cols) return;
            const row = Math.floor(i / grid.cols);
            const col = i % grid.cols;
            const x = pad + col * cellTotal;
            const y = pad + row * cellTotal;

            const colour = simColour(seq, grid.colours);
            ctx.fillStyle = `rgb(${colour.r},${colour.g},${colour.b})`;
            ctx.fillRect(x, y, cellSize, cellSize);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellSize, cellSize);

            ctx.fillStyle = colour.r + colour.g + colour.b > 384 ? '#000' : '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`[${seq.join(',')}]`, x + cellSize / 2, y + cellSize / 2);
            ctx.font = '10px monospace';
            ctx.fillText(`#${i}`, x + cellSize / 2, y + cellSize / 2 + 20);
        });

        canvas.toBlob(blob => {
            saveAs(blob, 'reference_grid.png');
            msg(1, '✓ Exported', 'ok');
        });
    }, 100);
}

/**
 * Export STL files for 3D printing
 */
export function exportSTLs() {
    if (!grid) return;
    msg(1, 'Generating...', 'info');

    setTimeout(() => {
        const stls = {};
        const layerH = +document.getElementById('layerH').value;
        const base = +document.getElementById('baseLayers').value;
        const baseColIdx = +document.getElementById('baseColour').value;

        // Base layer
        if (base > 0) {
            let facets = '';
            for (let l = 0; l < base; l++) {
                facets += box(0, 0, l * layerH, grid.width, grid.height, (l + 1) * layerH);
            }
            const baseName = baseColIdx === -1 ? 'base_white' : 'base_' + COLOURS[baseColIdx].n.replace(/[^a-zA-Z0-9]/g, '_');
            stls[baseName + '.stl'] = wrapSTL(facets, 'Base');
        }

        // Colour layers
        const cFacets = Array(sel.length).fill('');
        grid.seqs.forEach((seq, i) => {
            if (i >= grid.rows * grid.cols) return;
            const row = Math.floor(i / grid.cols);
            const col = i % grid.cols;
            const x0 = col * (grid.tile + grid.gap);
            const y0 = row * (grid.tile + grid.gap);
            let z = base * layerH;

            for (let li = 0; li < seq.length; li++) {
                const fi = seq[li];
                if (fi > 0) {
                    cFacets[fi - 1] += box(x0, y0, z, x0 + grid.tile, y0 + grid.tile, z + layerH);
                    z += layerH;
                }
            }
        });

        sel.forEach((ci, i) => {
            const name = COLOURS[ci].n.replace(/[^a-zA-Z0-9]/g, '_');
            stls[`colour_${i}_${name}.stl`] = wrapSTL(cFacets[i], `Colour_${i}`);
        });

        Object.entries(stls).forEach(([fn, content]) => {
            const blob = new Blob([content], {type: 'text/plain'});
            saveAs(blob, fn);
        });

        msg(1, `✓ Exported ${Object.keys(stls).length} STLs`, 'ok');
    }, 100);
}

/**
 * Generate STL box geometry
 */
function box(x0, y0, z0, x1, y1, z1) {
    return `facet normal 0 0 -1
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y1} ${z0}
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y1} ${z0}
    vertex ${x0} ${y1} ${z0}
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex ${x0} ${y0} ${z1}
    vertex ${x1} ${y1} ${z1}
    vertex ${x1} ${y0} ${z1}
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex ${x0} ${y0} ${z1}
    vertex ${x0} ${y1} ${z1}
    vertex ${x1} ${y1} ${z1}
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y0} ${z1}
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x1} ${y0} ${z1}
    vertex ${x0} ${y0} ${z1}
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex ${x0} ${y1} ${z0}
    vertex ${x1} ${y1} ${z1}
    vertex ${x1} ${y1} ${z0}
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex ${x0} ${y1} ${z0}
    vertex ${x0} ${y1} ${z1}
    vertex ${x1} ${y1} ${z1}
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x0} ${y1} ${z1}
    vertex ${x0} ${y1} ${z0}
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex ${x0} ${y0} ${z0}
    vertex ${x0} ${y0} ${z1}
    vertex ${x0} ${y1} ${z1}
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y1} ${z0}
    vertex ${x1} ${y1} ${z1}
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex ${x1} ${y0} ${z0}
    vertex ${x1} ${y1} ${z1}
    vertex ${x1} ${y0} ${z1}
  endloop
endfacet
`;
}

/**
 * Wrap STL facets with header/footer
 */
function wrapSTL(facets, name) {
    return `solid ${name}\n${facets}endsolid ${name}\n`;
}

/**
 * Export palette as GPL (GIMP Palette)
 */
export function exportPalette() {
    if (!pal) return;

    let gpl = `GIMP Palette\nName: 4Colour\nColumns: 17\n#\n`;
    pal.forEach((c, i) => {
        gpl += `${c.r.toString().padStart(3)} ${c.g.toString().padStart(3)} ${c.b.toString().padStart(3)} C${i}\n`;
    });

    const blob = new Blob([gpl], {type: 'text/plain'});
    saveAs(blob, 'palette.gpl');
    msg(2, '✓ Exported', 'ok');
}

/**
 * Export comparison CSV (expected vs measured colours)
 */
export function exportComparison() {
    if (!pal || !grid) return;

    let csv = 'Index,Sequence,Expected,Measured\n';
    grid.seqs.forEach((seq, i) => {
        if (i >= pal.length) return;
        const exp = simColour(seq, grid.colours);
        const meas = pal[i];
        csv += `${i},"[${seq.join(' ')}]","${exp.r} ${exp.g} ${exp.b}","${meas.r} ${meas.g} ${meas.b}"\n`;
    });

    const blob = new Blob([csv], {type: 'text/csv'});
    saveAs(blob, 'comparison.csv');
    msg(2, '✓ Exported', 'ok');
}

/**
 * Export alignment configuration
 */
export function exportAlignment() {
    if (!grid || !align) return;

    const data = {
        alignment: align,
        grid: {rows: grid.rows, cols: grid.cols}
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    saveAs(blob, 'alignment.json');
    msg(2, '✓ Exported', 'ok');
}

/**
 * Export layer PNGs for printing
 */
export function exportLayers() {
    if (!filamentLayers) return;

    filamentLayers.forEach(layer => {
        layer.canvas.toBlob(blob => saveAs(blob, `${layer.name}.png`));
    });

    msg(4, `✓ Exported ${filamentLayers.length} layers`, 'ok');
}

/**
 * Export print info JSON
 */
export function exportPrintInfo() {
    if (!filamentLayers || !quant) return;

    const pw = +document.getElementById('printW').value;
    const info = {
        dimensions: {
            width: pw,
            height: pw * (quant.height / quant.width),
            units: 'mm'
        },
        filaments: filamentLayers.map(l => ({name: l.name, colour: l.colour.n})),
        settings: {layerH: document.getElementById('layerH').value}
    };

    const blob = new Blob([JSON.stringify(info, null, 2)], {type: 'application/json'});
    saveAs(blob, 'print_info.json');
    msg(4, '✓ Exported', 'ok');
}
