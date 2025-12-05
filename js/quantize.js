/**
 * Image Quantization Module
 * Handles image loading, quantization, and print file generation
 */

import { pal, quant, sequences, grid, sel, activePalette, paletteSource,
         setQuant, setActivePalette, setPaletteSource, setFilamentLayers } from './state.js';
import { COLOURS } from './constants.js';
import { setupCanvas, findClosest, distributeError, rgb_to_key, parseGPL, msg } from './utils.js';

/**
 * Load image for quantization
 * IMPORTANT FIX #4: Shows preview immediately
 */
export function loadImage() {
    const f = document.getElementById('imgFile').files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            // Store image data
            setQuant({img});

            // IMPORTANT FIX #4: Show preview in original canvas immediately
            const {canvas} = setupCanvas('origCanvas', img);

            // Enable quantise button if palette exists
            document.getElementById('quantBtn').disabled = !pal && !activePalette;

            // Update min detail display
            updateMinDetail();

            // Show quantisation options box
            document.getElementById('quantBox').classList.remove('hidden');

            // Update palette preview
            updateQuantPalette();

            msg(3, `✓ Loaded image: ${img.width}×${img.height} pixels`, 'ok');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(f);
}

/**
 * Update min detail pixel estimate
 */
export function updateMinDetail() {
    if (!quant) return;

    const pw = +document.getElementById('printW').value;
    const md = +document.getElementById('minDetail').value;
    const ppMM = quant.img.width / pw;
    const px = Math.round(md * ppMM);
    document.getElementById('minDetailPx').textContent = `≈${px}px`;
}

/**
 * Update quantization palette preview
 */
function updateQuantPalette() {
    const usePal = activePalette || pal;
    if (!usePal) return;

    const maxC = +document.getElementById('maxColours').value || usePal.length;
    const qp = document.getElementById('quantPalette');
    qp.innerHTML = '';

    usePal.slice(0, maxC).forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.background = `rgb(${c.r},${c.g},${c.b})`;
        swatch.style.width = '30px';
        swatch.style.height = '30px';
        swatch.title = `rgb(${c.r},${c.g},${c.b})`;
        qp.appendChild(swatch);
    });
}

/**
 * IMPORTANT FIX #6: Update palette source
 */
export function updatePaletteSource() {
    const radios = document.getElementsByName('palSrc');
    const selected = Array.from(radios).find(r => r.checked)?.value || 'extracted';
    setPaletteSource(selected);

    const importBtn = document.getElementById('importGPLBtn');

    if (selected === 'extracted') {
        // Use extracted palette
        setActivePalette(pal);
        if (importBtn) importBtn.disabled = true;
        updatePaletteSummary(`Using extracted palette: ${pal ? pal.length : 0} colours`);
    } else {
        // Enable import
        if (importBtn) importBtn.disabled = false;
        updatePaletteSummary('Click "Import GPL File" to load palette');
    }

    // Update max colours
    const usePal = activePalette || pal;
    if (usePal) {
        document.getElementById('maxColours').value = usePal.length;
        updateQuantPalette();
    }
}

/**
 * Update palette summary message
 */
function updatePaletteSummary(text) {
    const summaryEl = document.getElementById('paletteSummary');
    if (summaryEl) {
        summaryEl.textContent = text;
    }
}

/**
 * IMPORTANT FIX #6: Import GPL palette file
 */
export function importGPLPalette() {
    const file = document.getElementById('importGPL').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const gpl = parseGPL(e.target.result);

            if (gpl.length === 0) {
                msg(3, 'No colours found in GPL file', 'err');
                return;
            }

            setActivePalette(gpl);

            // Update UI
            document.getElementById('maxColours').value = gpl.length;
            updatePaletteSummary(`Imported palette: ${gpl.length} colours from ${file.name}`);
            updateQuantPalette();

            // Enable quantise if image loaded
            if (quant && quant.img) {
                document.getElementById('quantBtn').disabled = false;
            }

            msg(3, `✓ Imported ${gpl.length} colours from ${file.name}`, 'ok');

        } catch (err) {
            msg(3, `Error parsing GPL: ${err.message}`, 'err');
        }
    };
    reader.readAsText(file);
}

/**
 * Quantize image with palette
 */
export function quantiseImage() {
    // Determine which palette to use
    let usePalette;
    if (paletteSource === 'imported' && activePalette) {
        usePalette = activePalette;
    } else if (pal) {
        usePalette = pal;
    } else {
        msg(3, 'No palette available', 'err');
        return;
    }

    if (!quant) return;

    msg(3, 'Quantising...', 'info');

    setTimeout(() => {
        try {
            const maxC = +document.getElementById('maxColours').value;
            const palette = usePalette.slice(0, maxC);
            const dither = document.getElementById('dither').checked;
            const applyMin = document.getElementById('applyMinDetail').checked;

            // Draw original
            const oc = document.getElementById('origCanvas');
            const octx = oc.getContext('2d');
            oc.width = quant.img.width;
            oc.height = quant.img.height;
            oc.style.width = '100%';
            oc.style.height = '100%';
            octx.drawImage(quant.img, 0, 0);

            // Get image data
            const imgData = octx.getImageData(0, 0, oc.width, oc.height);
            const mask = applyMin ? applyMinDetailFilter(imgData, palette) : null;
            quantiseData(imgData, palette, dither, mask);

            // Draw quantized
            const qc = document.getElementById('quantCanvas');
            const qctx = qc.getContext('2d');
            qc.width = oc.width;
            qc.height = oc.height;
            qc.style.width = '100%';
            qc.style.height = '100%';
            qctx.putImageData(imgData, 0, 0);

            // Store result
            setQuant({
                ...quant,
                result: imgData,
                width: oc.width,
                height: oc.height
            });

            document.getElementById('quantBox').classList.remove('hidden');
            generatePrintFiles();
            msg(3, '✓ Quantised', 'ok');
        } catch (e) {
            msg(3, `Error: ${e.message}`, 'err');
        }
    }, 100);
}

/**
 * Apply min detail filter
 */
function applyMinDetailFilter(imgData, palette) {
    const w = imgData.width;
    const h = imgData.height;
    const mask = new Uint8Array(w * h).fill(1);
    const pw = +document.getElementById('printW').value;
    const md = +document.getElementById('minDetail').value;
    const ppMM = w / pw;
    const minPx = Math.round(md * ppMM);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const c = {r: imgData.data[i], g: imgData.data[i + 1], b: imgData.data[i + 2]};
            const closest = findClosest(c, palette);

            let same = 0;
            for (let dy = -minPx; dy <= minPx; dy++) {
                for (let dx = -minPx; dx <= minPx; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const ni = (ny * w + nx) * 4;
                        const nc = {r: imgData.data[ni], g: imgData.data[ni + 1], b: imgData.data[ni + 2]};
                        const nClosest = findClosest(nc, palette);
                        if (nClosest.r === closest.r && nClosest.g === closest.g && nClosest.b === closest.b) {
                            same++;
                        }
                    }
                }
            }

            const threshold = (2 * minPx + 1) * (2 * minPx + 1) * 0.5;
            if (same < threshold) {
                mask[y * w + x] = 0;
            }
        }
    }

    return mask;
}

/**
 * Quantize image data with palette
 */
function quantiseData(imgData, palette, dither, mask) {
    const data = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const closest = findClosest({r, g, b}, palette);
            data[i] = closest.r;
            data[i + 1] = closest.g;
            data[i + 2] = closest.b;

            // Set alpha based on filter mask
            if (mask && mask[y * w + x] === 0) {
                data[i + 3] = 128;  // Filtered pixel - semi-transparent
            } else {
                data[i + 3] = 255;  // Kept pixel - full opacity
            }

            if (dither && (!mask || mask[y * w + x] === 1)) {
                const er = r - closest.r;
                const eg = g - closest.g;
                const eb = b - closest.b;
                distributeError(data, w, h, x, y, er, eg, eb);
            }
        }
    }
}

/**
 * Reset quantization
 */
export function resetQuant() {
    setQuant(null);
    document.getElementById('imgFile').value = '';
    document.getElementById('quantBox').classList.add('hidden');
    document.getElementById('printBox').classList.add('hidden');
    document.getElementById('quantBtn').disabled = true;
}

/**
 * Generate print files
 * CRITICAL FIX #1: Uses rgb_to_key() for sequence lookup
 */
function generatePrintFiles() {
    if (!quant || !quant.result || !grid) return;

    const {result, width, height} = quant;
    const layers = [];

    sel.forEach((colIdx, i) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const layerData = ctx.createImageData(width, height);

        for (let p = 0; p < result.data.length; p += 4) {
            const pixelRGB = {
                r: result.data[p],
                g: result.data[p + 1],
                b: result.data[p + 2]
            };
            const key = rgb_to_key(pixelRGB);  // CRITICAL FIX #1
            const seqData = sequences.get(key);

            if (seqData) {
                for (let li = 0; li < seqData.sequence.length; li++) {
                    if (seqData.sequence[li] === i + 1) {
                        layerData.data[p] = result.data[p];
                        layerData.data[p + 1] = result.data[p + 1];
                        layerData.data[p + 2] = result.data[p + 2];
                        layerData.data[p + 3] = 255;
                        break;
                    }
                }
            }
        }

        ctx.putImageData(layerData, 0, 0);
        layers.push({
            name: `Filament_${COLOURS[colIdx].n.replace(/[^a-zA-Z0-9]/g, '_')}`,
            canvas: canvas,
            colour: COLOURS[colIdx]
        });
    });

    displayFilamentLayers(layers);
    document.getElementById('printBox').classList.remove('hidden');

    const pw = +document.getElementById('printW').value;
    const ph = pw * (height / width);
    document.getElementById('printW').textContent = pw.toFixed(1);
    document.getElementById('printH').textContent = ph.toFixed(1);
    document.getElementById('printL').textContent = layers.length;
}

/**
 * Display filament layer previews
 */
function displayFilamentLayers(layers) {
    const preview = document.getElementById('layerPreview');
    preview.innerHTML = '';

    layers.forEach(layer => {
        const div = document.createElement('div');
        div.style.textAlign = 'center';

        const canvas = document.createElement('canvas');
        canvas.style.width = '100px';
        canvas.style.border = '1px solid #ccc';
        canvas.style.borderRadius = '4px';
        canvas.width = layer.canvas.width;
        canvas.height = layer.canvas.height;
        canvas.getContext('2d').drawImage(layer.canvas, 0, 0);

        const label = document.createElement('div');
        label.style.fontSize = '0.7em';
        label.style.marginTop = '4px';
        label.textContent = layer.name;

        div.appendChild(canvas);
        div.appendChild(label);
        preview.appendChild(div);
    });

    setFilamentLayers(layers);
}
