/*
 * Image Quantization & Dithering Tool - script.js
 * COMPLETE CODE - Includes all features and logging.
 * Generated: Friday, April 11, 2025 at 1:17:36 PM AEST
 */

// Wrap everything in an IIFE (Immediately Invoked Function Expression)
// to avoid polluting the global scope
(function main() {

    /*****************************************************
     * 1) ColorSpaceConverter: sRGB <-> LAB
     *****************************************************/
    class ColorSpaceConverter {
        constructor() {
            this.cache = new Map();
            // D65 reference white point
            this.WHITE_REFERENCE = { X: 0.95047, Y: 1.0, Z: 1.08883 };
            this.epsilon = 0.008856; // CIE standard thresholds
            this.kappa = 903.3;
        }

        // --- Public Methods ---

        hexToRgb(hex) {
            const key = `hex-${hex}`;
            if (this.cache.has(key)) return this.cache.get(key);

            const c = hex.startsWith("#") ? hex.slice(1) : hex;
            let fullHex = c;
            if (c.length === 3) {
                fullHex = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
            }
            // More robust check for valid hex characters
            if (fullHex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(fullHex)) {
                console.warn(`Invalid hex: ${hex}. Defaulting to black.`);
                fullHex = '000000';
            }

            const rgb = {
                r: parseInt(fullHex.slice(0, 2), 16),
                g: parseInt(fullHex.slice(2, 4), 16),
                b: parseInt(fullHex.slice(4, 6), 16)
            };
            this.cache.set(key, rgb);
            return rgb;
        }

        rgbToLab(r, g, b) {
            const key = `rgb-${r}-${g}-${b}`;
            if (this.cache.has(key)) return this.cache.get(key);

            // Ensure inputs are valid numbers
            r = Number.isFinite(r) ? r : 0;
            g = Number.isFinite(g) ? g : 0;
            b = Number.isFinite(b) ? b : 0;

            const [lr, lg, lb] = this._srgbToLinear([r, g, b]);
            const [X, Y, Z] = this._linearToXyz([lr, lg, lb]);
            const lab = this._xyzToLab(X, Y, Z);

            this.cache.set(key, lab);
            return lab;
        }

        labToRgb(L, a, b_lab) { // Renamed b parameter
            const key = `lab-${L}-${a}-${b_lab}`;
            if (this.cache.has(key)) return this.cache.get(key);

            L = Number.isFinite(L) ? L : 0;
            a = Number.isFinite(a) ? a : 0;
            b_lab = Number.isFinite(b_lab) ? b_lab : 0;

            const { X, Y, Z } = this._labToXyz(L, a, b_lab);
            const [lr, lg, lb] = this._xyzToLinear(X, Y, Z);
            const [r, g, b] = this._linearToSrgb([lr, lg, lb]);

            const rgb = { r, g, b };
            this.cache.set(key, rgb);
            return rgb;
        }

        // --- Private Helpers ---

        _srgbToLinear(rgbArray) {
            return rgbArray.map(v => {
                v /= 255.0; // Use float division
                return (v <= 0.04045) ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
        }

        _linearToSrgb(linearArray) {
            return linearArray.map(v => {
                v = Math.max(0.0, Math.min(1.0, v)); // Clamp linear value 0-1
                let ret;
                if (v <= 0.0031308) {
                    ret = v * 12.92;
                } else {
                    ret = 1.055 * Math.pow(v, 1.0 / 2.4) - 0.055;
                }
                // Final clamp 0-1 and round to 0-255
                return Math.round(Math.max(0.0, Math.min(1.0, ret)) * 255.0);
            });
        }

        _linearToXyz(linearArray) {
            const [lr, lg, lb] = linearArray;
            // sRGB D65 matrix (standard coefficients)
            const X = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
            const Y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
            const Z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;
            return [X, Y, Z];
        }

        _xyzToLinear(X, Y, Z) {
            // Ensure non-negative before matrix multiplication
            X = Math.max(0.0, X); Y = Math.max(0.0, Y); Z = Math.max(0.0, Z);
            // Inverse sRGB D65 matrix (standard coefficients)
            const lr =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
            const lg = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
            const lb =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
            return [lr, lg, lb];
        }

        _xyzToLab(X, Y, Z) {
            const { X: Xn, Y: Yn, Z: Zn } = this.WHITE_REFERENCE;
            // Ensure non-negative before division
            X = Math.max(0.0, X); Y = Math.max(0.0, Y); Z = Math.max(0.0, Z);

            const xr = X / Xn, yr = Y / Yn, zr = Z / Zn;

            const fx = (xr > this.epsilon) ? Math.cbrt(xr) : (this.kappa * xr + 16.0) / 116.0;
            const fy = (yr > this.epsilon) ? Math.cbrt(yr) : (this.kappa * yr + 16.0) / 116.0;
            const fz = (zr > this.epsilon) ? Math.cbrt(zr) : (this.kappa * zr + 16.0) / 116.0;

            const L = (116.0 * fy) - 16.0;
            const a = 500.0 * (fx - fy);
            const b = 200.0 * (fy - fz);

            return { L, a, b };
        }

        _labToXyz(L, a, b_lab) {
            const fy = (L + 16.0) / 116.0;
            const fx = a / 500.0 + fy;
            const fz = fy - b_lab / 200.0;

            const fx3 = fx ** 3;
            const fz3 = fz ** 3;

            const xr = (fx3 > this.epsilon) ? fx3 : (116.0 * fx - 16.0) / this.kappa;
            // Corrected calculation for yr based on L directly when below threshold
            const yr = (L > this.kappa * this.epsilon) ? ((L + 16.0) / 116.0) ** 3 : L / this.kappa;
            const zr = (fz3 > this.epsilon) ? fz3 : (116.0 * fz - 16.0) / this.kappa;

            const { X: Xn, Y: Yn, Z: Zn } = this.WHITE_REFERENCE;
            // Ensure non-negative results
            return {
                X: Math.max(0.0, xr * Xn),
                Y: Math.max(0.0, yr * Yn),
                Z: Math.max(0.0, zr * Zn)
            };
        }
    }


    /*****************************************************
     * Logging Helper
     *****************************************************/
    function logWithTimestamp(message, ...args) {
        const time = performance.now().toFixed(1); // Time in ms since page load
        console.log(`[${time}ms] ${message}`, ...args);
    }

    /*****************************************************
     * 2) Delta E (CIE76) & Helpers
     *****************************************************/
    function deltaE76(lab1, lab2) {
        if (!lab1 || !lab2) return Infinity;
        const dL = lab1.L - lab2.L;
        const da = lab1.a - lab2.a;
        const db = lab1.b - lab2.b;
        return Math.sqrt(dL * dL + da * da + db * db);
    }

    function clamp(value, min = 0, max = 255) {
        return Math.max(min, Math.min(value, max));
    }


    /*****************************************************
     * 3) Nearest Color Finders
     *****************************************************/
    function pickNearestInLargePalette(targetLab, paletteLabs) {
        let bestDist = Infinity;
        let bestIdx = 0;
        if (!targetLab || !paletteLabs || paletteLabs.length === 0) return 0;

        for (let i = 0; i < paletteLabs.length; i++) {
            const labP = paletteLabs[i];
            if (!labP) continue; // Skip if palette entry is invalid
            const d = deltaE76(targetLab, labP);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
                if (d < 0.001) break; // Early exit if essentially perfect match
            }
        }
        return bestIdx;
    }



    /**
     * "No dithering": single nearest color in palette.
     */
    function doNoDitherLargePalette(imageData, palette, paletteLabs, colorSpace) {
        logWithTimestamp("doNoDitherLargePalette started");
        const startTime = performance.now();
        const { width, height, data } = imageData; const outArr = new Uint8ClampedArray(data.length);
        for (let i = 0; i < data.length; i += 4) {
            const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3]; const labPix=colorSpace.rgbToLab(r,g,b);
            const idx=pickNearestInLargePalette(labPix,paletteLabs); const safeIdx=(idx>=0&&idx<palette.length)?idx:0;
            if (idx !== safeIdx) console.warn(`Invalid index ${idx} from pickNearest. Defaulting to 0.`);
            const { r: qr, g: qg, b: qb } = colorSpace.hexToRgb(palette[safeIdx]);
            outArr[i]=qr;outArr[i+1]=qg;outArr[i+2]=qb;outArr[i+3]=a;
        }
        const endTime = performance.now();
        logWithTimestamp(`doNoDitherLargePalette finished in ${(endTime - startTime).toFixed(1)}ms`);
        return new ImageData(outArr, width, height);
    }

    /**
     * Applies Gamma, Contrast, Saturation adjustments.
     */
     function applyImageAdjustments(sourceImageData, adjustments) {
        logWithTimestamp("applyImageAdjustments started", adjustments);
        const startTime = performance.now();
        if (!sourceImageData) return null; const { gamma, contrast, saturation } = adjustments; const gammaExponent = gamma === 0 ? Infinity : 1.0 / gamma;
        const { width, height, data } = sourceImageData; const newData = new Uint8ClampedArray(data); const lumR=0.2126,lumG=0.7152,lumB=0.0722;
        for (let i=0;i<newData.length;i+=4) { let r=data[i],g=data[i+1],b=data[i+2];
            if(saturation!==1.0){const gray=r*lumR+g*lumG+b*lumB; r=clamp(gray+saturation*(r-gray));g=clamp(gray+saturation*(g-gray));b=clamp(gray+saturation*(b-gray));}
            if(contrast!==1.0){r=clamp(((r/255.0-0.5)*contrast+0.5)*255.0);g=clamp(((g/255.0-0.5)*contrast+0.5)*255.0);b=clamp(((b/255.0-0.5)*contrast+0.5)*255.0);}
            if(gamma!==1.0&&gamma>0){r=clamp(Math.pow(r/255.0,gammaExponent)*255.0);g=clamp(Math.pow(g/255.0,gammaExponent)*255.0);b=clamp(Math.pow(b/255.0,gammaExponent)*255.0);}
            newData[i]=Math.round(r); newData[i+1]=Math.round(g); newData[i+2]=Math.round(b);
        }
        const endTime = performance.now();
        logWithTimestamp(`applyImageAdjustments finished in ${(endTime - startTime).toFixed(1)}ms`);
        return new ImageData(newData, width, height);
    }

    /*****************************************************
     * 5) Main Application Logic & UI
     *****************************************************/

    // --- State Variables ---
    const colorSpace = new ColorSpaceConverter();
    let originalFileName = "image";
    let originalImageData = null;
    let previewImageData = null;
    let currentImageData = null;
    let isProcessing = false;
    let isEyedropperActive = false;
    let customPaletteArray = ['#000000', '#FFFFFF'];

    // --- UI Element References ---
    let uiElements = {};
    try {
         uiElements = {
            fileInput: document.getElementById("image-input"),
            paletteSelect: document.getElementById("palette-select"),
            customPaletteTools: document.getElementById("custom-palette-tools"),
            customColorPicker: document.getElementById("custom-color-picker"),
            customHexInput: document.getElementById("custom-hex-input"),
            addColorButton: document.getElementById("add-color-button"),
            paletteSwatchDisplay: document.getElementById("palette-swatch-display"),
            gammaSlider: document.getElementById("gamma-slider"),
            gammaValueSpan: document.getElementById("gamma-value"),
            contrastSlider: document.getElementById("contrast-slider"),
            contrastValueSpan: document.getElementById("contrast-value"),
            saturationSlider: document.getElementById("saturation-slider"),
            saturationValueSpan: document.getElementById("saturation-value"),
            resetAdjustmentsButton: document.getElementById("reset-adjustments-button"),
            processButton: document.getElementById("process-button"),
            undoButton: document.getElementById("undo-button"),
            downloadButton: document.getElementById("download-button"),
            canvas: document.getElementById("canvas"),
            ctx: document.getElementById("canvas")?.getContext("2d", { willReadFrequently: true }),
            statusMessage: document.getElementById("status-message"),
            paletteFileInput: document.getElementById("palette-file-input"),
            eyedropperButton: document.getElementById("eyedropper-button")
        };
        logWithTimestamp("INITIAL REF CHECK - paletteSelect:", uiElements.paletteSelect ? 'Found' : 'MISSING!');
        logWithTimestamp("INITIAL REF CHECK - customPaletteTools:", uiElements.customPaletteTools ? 'Found' : 'MISSING!');
        logWithTimestamp("INITIAL REF CHECK - canvas:", uiElements.canvas ? 'Found' : 'MISSING!');
        logWithTimestamp("INITIAL REF CHECK - ctx:", uiElements.ctx ? 'Found' : 'MISSING!');
        if (!uiElements.canvas || !uiElements.ctx || !uiElements.fileInput || !uiElements.paletteSelect || !uiElements.processButton || !uiElements.paletteSwatchDisplay) {
             throw new Error("One or more core UI elements could not be found! Check HTML IDs.");
        }
    } catch (error) { /* ... keep fatal error handling ... */ }

    // --- Predefined Palettes ---
    const predefined = {
      "1bit": ["#000000", "#FFFFFF"],
  "2bit": ["#000000", "#555555", "#AAAAAA", "#FFFFFF"],
  "3bit": [
    "#000000", "#FF0000", "#00FF00", "#FFFF00",
    "#0000FF", "#FF00FF", "#00FFFF", "#FFFFFF"
  ],
  "3bit-gray": [
    "#000000", "#242424", "#484848", "#6C6C6C",
    "#909090", "#B4B4B4", "#D8D8D8", "#FFFFFF"
  ],
  "nes": [
    "#7C7C7C", "#0000FC", "#0000BC", "#4428BC",
    "#940084", "#A80020", "#A81000", "#881400",
    "#503000", "#007800", "#006800", "#005800",
    "#004058", "#000000", "#F8F8F8", "#FFFFFF"
  ],
  "gameboy": ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
  "primaries": ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF"],
  "pastel": [
    "#FFC0CB", "#E6E6FA", "#ADD8E6",
    "#98FF98", "#FFFFE0", "#FFDAB9"
  ],
  "ggost": [
    "#000000", "#1E2223", "#224AC4", "#6245B9", "#65A3EC",
    "#6AB960", "#8B897D", "#9C3B35", "#B8C0C3", "#C56B60",
    "#F88127", "#FB5A9E", "#FBDF2B", "#FCC292", "#FD432A",
    "#FDE6C4", "#FFFFFF"
  ]
};

    // --- Helper Functions ---
    function showStatus(message) { if (uiElements.statusMessage) uiElements.statusMessage.textContent = message; }
    function formatHex(hexString) { if (!hexString) return null; let h=hexString.trim(); if(!h.startsWith('#'))h='#'+h; if (/^#[0-9A-F]{6}$/i.test(h)) return h.toUpperCase(); if (/^#[0-9A-F]{3}$/i.test(h)) return ('#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]).toUpperCase(); return null;}

    function renderPaletteSwatches(paletteArray) {
        logWithTimestamp("renderPaletteSwatches called");
        if (!uiElements.paletteSwatchDisplay) return;
        uiElements.paletteSwatchDisplay.innerHTML = '';
        const isCustomPaletteActive = (uiElements.paletteSelect.value === "custom");
        // console.log("Rendering swatches. Is Custom Active?", isCustomPaletteActive); // DEBUG

        paletteArray.forEach((hexColor, index) => {
            const swatch = document.createElement('div'); swatch.className = 'swatch';
            swatch.style.backgroundColor = hexColor; swatch.title = hexColor;
            if (isCustomPaletteActive) {
                 // console.log(`Adding remove button for index ${index}`); // DEBUG
                const removeBtn = document.createElement('button'); removeBtn.className = 'remove-color-btn';
                removeBtn.innerHTML = '&times;'; removeBtn.title = `Remove ${hexColor}`; removeBtn.type = 'button';
                removeBtn.dataset.index = index;
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    logWithTimestamp("Remove button clicked. dataset.index:", e.target.dataset.index); // DEBUG
                    const indexToRemove = parseInt(e.target.dataset.index, 10);
                    logWithTimestamp("Parsed index to remove:", indexToRemove); // DEBUG
                    if (!isNaN(indexToRemove) && indexToRemove >= 0 && indexToRemove < customPaletteArray.length) {
                        customPaletteArray.splice(indexToRemove, 1);
                        logWithTimestamp("Array after splice:", customPaletteArray); // DEBUG
                        renderPaletteSwatches(customPaletteArray); // Re-render
                    } else { console.error("Failed to parse index or index out of bounds:", e.target.dataset.index); }
                });
                swatch.appendChild(removeBtn);
            }
            uiElements.paletteSwatchDisplay.appendChild(swatch);
        });
    }

    function getUserPalette() {
        logWithTimestamp("getUserPalette called");
        const sel = uiElements.paletteSelect.value;
        if (sel === "custom") { if(customPaletteArray.length===0){showStatus("Warning: Custom palette empty.");return['#000000','#FFFFFF']} return [...customPaletteArray];}
        if (predefined[sel]) return predefined[sel];
        showStatus("Warning: Palette not found."); return ["#000000", "#FFFFFF"];
    }

    function parsePaletteFile(content, fileName) {
        logWithTimestamp("parsePaletteFile called", fileName);
        const colors = new Set(); const lines = content.split(/[\r\n]+/);
        if (fileName && fileName.toLowerCase().endsWith('.gpl')) { lines.forEach(line => { if(line.startsWith('#')||line.trim()===''||line.startsWith('GIMP Palette')||line.startsWith('Name:')||line.startsWith('Columns:'))return; const parts=line.trim().split(/\s+/); if(parts.length>=3){const r=parseInt(parts[0],10),g=parseInt(parts[1],10),b=parseInt(parts[2],10); if(!isNaN(r)&&!isNaN(g)&&!isNaN(b)){const rH=clamp(r).toString(16).padStart(2,'0'),gH=clamp(g).toString(16).padStart(2,'0'),bH=clamp(b).toString(16).padStart(2,'0'); colors.add(`#${rH}${gH}${bH}`.toUpperCase());}}}); }
        else { lines.forEach(line => { const parts = line.split(/[\s,;]+/); parts.forEach(part => { const formattedHex = formatHex(part); if (formattedHex) colors.add(formattedHex); }); }); }
        logWithTimestamp(`Parsed ${colors.size} unique colors from file.`);
        return Array.from(colors);
    }

    // --- Image Adjustments ---
    function updatePreview() {
        if (!originalImageData || isProcessing || !uiElements.ctx) return;
        logWithTimestamp("updatePreview started");
        showStatus("Applying adjustments...");
        try {
            const adjustments = { gamma: parseFloat(uiElements.gammaSlider.value)||1, contrast: (parseFloat(uiElements.contrastSlider.value)||100)/100, saturation: (parseFloat(uiElements.saturationSlider.value)||100)/100 };
             if (isNaN(adjustments.gamma+adjustments.contrast+adjustments.saturation)) throw new Error("Invalid adjustment value.");
            previewImageData = applyImageAdjustments(originalImageData, adjustments);
            if (previewImageData) { uiElements.ctx.putImageData(previewImageData, 0, 0); showStatus("Adjustments applied to preview."); currentImageData = previewImageData; }
            else { throw new Error("Adjustment calculation failed."); }
        } catch (error) { console.error("Error updating preview:", error); showStatus(`Preview Error: ${error.message}`); }
        logWithTimestamp("updatePreview finished");
    }

    // --- Loading Functions ---
    async function loadImage(url) {
        logWithTimestamp("loadImage started with URL:", url); // DEBUG
        if (!uiElements.ctx) { console.error("Canvas context (ctx) is not valid!"); showStatus("Error: Canvas context failed."); return; }
        showStatus("Loading image...");
        if(uiElements.processButton) uiElements.processButton.disabled = true; if(uiElements.undoButton) uiElements.undoButton.disabled = true; if(uiElements.downloadButton) uiElements.downloadButton.disabled = true;
        try {
            const img = new Image(); logWithTimestamp("Image object created."); // DEBUG
            img.onerror = (errEvent) => { console.error("Native img.onerror fired.", errEvent); showStatus("Error: Failed to load image file data."); }; // DEBUG
            img.src = url; logWithTimestamp("img.src set to:", url); // DEBUG
            await new Promise((resolve, reject) => { img.onload=()=>{logWithTimestamp("img.onload (Promise) fired."); resolve()}; img.onerror=(e)=>{console.error("img.onerror (Promise) fired:", e); reject(new Error("Image failed to load from source"))}; });
            logWithTimestamp("Image has loaded. Natural dimensions:", img.naturalWidth, "x", img.naturalHeight); // DEBUG
            if (img.naturalWidth === 0 || img.naturalHeight === 0) throw new Error("Image loaded but has zero dimensions.");
            uiElements.canvas.width = img.naturalWidth; uiElements.canvas.height = img.naturalHeight; logWithTimestamp(`Canvas resized to ${uiElements.canvas.width}x${uiElements.canvas.height}.`); // DEBUG
            uiElements.ctx.drawImage(img, 0, 0); logWithTimestamp("Image drawn to canvas."); // DEBUG
            originalImageData = uiElements.ctx.getImageData(0, 0, uiElements.canvas.width, uiElements.canvas.height); logWithTimestamp("Original image data acquired."); // DEBUG
            previewImageData = originalImageData; currentImageData = originalImageData;
            if(uiElements.resetAdjustmentsButton) uiElements.resetAdjustmentsButton.click(); else updatePreview(); // Reset sliders & update preview
            showStatus("Image loaded. Adjustments reset.");
            if(uiElements.undoButton) uiElements.undoButton.disabled = false; if(uiElements.downloadButton) uiElements.downloadButton.disabled = false; if(uiElements.processButton) uiElements.processButton.disabled = false;
        } catch (error) { console.error("Error within loadImage try block:", error); showStatus(`Error loading image: ${error.message}`); originalImageData=null; previewImageData=null; currentImageData=null; if(uiElements.processButton)uiElements.processButton.disabled=true; if(uiElements.undoButton)uiElements.undoButton.disabled=true; if(uiElements.downloadButton)uiElements.downloadButton.disabled=true; }
        finally { if (url && url.startsWith('blob:')) { logWithTimestamp("Revoking object URL:", url); URL.revokeObjectURL(url); } }
        logWithTimestamp("loadImage finished");
    }


    // --- Event Listeners Setup ---
    logWithTimestamp("Setting up event listeners...");
    try { // Wrap listener setup in try/catch for better debugging if uiElements missing
        if (uiElements.fileInput) uiElements.fileInput.addEventListener("change", (e) => {
            logWithTimestamp("fileInput 'change' event");
            const file = e.target.files[0]; logWithTimestamp("Selected file object:", file);
            if (!file) { logWithTimestamp("No file selected."); return; }
            originalFileName = file.name.replace(/\.[^/.]+$/, ""); const url = URL.createObjectURL(file); logWithTimestamp("Created object URL:", url);
            try { loadImage(url); logWithTimestamp("loadImage(url) function called successfully."); } catch(callError) { console.error("Error calling loadImage:", callError); showStatus("Error trying to load image."); }
            uiElements.fileInput.value = null;
        });

        if (uiElements.paletteFileInput) uiElements.paletteFileInput.addEventListener('change', (e) => {
            logWithTimestamp("paletteFileInput 'change' event");
            const file = e.target.files[0]; if (!file) return; showStatus(`Reading palette file: ${file.name}...`); const reader = new FileReader();
            reader.onload = (event) => { try { const fileContent = event.target.result; const newPalette = parsePaletteFile(fileContent, file.name); if (newPalette && newPalette.length > 0) { customPaletteArray = newPalette; renderPaletteSwatches(customPaletteArray); if(uiElements.paletteSelect){uiElements.paletteSelect.value='custom';uiElements.paletteSelect.dispatchEvent(new Event('change'));} showStatus(`Loaded ${newPalette.length} colors from ${file.name}.`); } else { showStatus(`Could not parse colors from ${file.name}.`); } } catch (error) { console.error("Error parsing palette file:", error); showStatus(`Error parsing file: ${error.message}`); alert(`Error parsing file: ${error.message}`); } finally { uiElements.paletteFileInput.value = null; } };
            reader.onerror = () => { console.error("Error reading file:", reader.error); showStatus(`Error reading file: ${reader.error}`); alert(`Error reading file: ${reader.error}`); uiElements.paletteFileInput.value = null; }; reader.readAsText(file);
        });

        if (uiElements.paletteSelect) uiElements.paletteSelect.addEventListener("change", () => {
            logWithTimestamp(">>> Palette 'change' listener FIRED. Value:", uiElements.paletteSelect.value);
            if (!uiElements.customPaletteTools) { console.error("Listener: customPaletteTools is null!"); return; }
            const isCustom = (uiElements.paletteSelect.value === "custom");
            logWithTimestamp("Listener: isCustom evaluated to:", isCustom);
            uiElements.customPaletteTools.style.display = isCustom ? "block" : "none";
            logWithTimestamp("Listener: Set customPaletteTools display to:", uiElements.customPaletteTools.style.display);
            renderPaletteSwatches(getUserPalette());
        });

        if (uiElements.customColorPicker) uiElements.customColorPicker.addEventListener('input', (e) => { if(uiElements.customHexInput) {uiElements.customHexInput.value = e.target.value.toUpperCase(); uiElements.customHexInput.style.borderColor = '';} });
        if (uiElements.customHexInput) uiElements.customHexInput.addEventListener('input', (e) => { const fH=formatHex(e.target.value); if(fH){if(uiElements.customColorPicker)uiElements.customColorPicker.value=fH; e.target.value=fH; e.target.style.borderColor='';} else {e.target.style.borderColor='red';}});
        if (uiElements.addColorButton) uiElements.addColorButton.addEventListener('click', () => {
            logWithTimestamp("addColorButton 'click' event"); const newHexColor = formatHex(uiElements.customHexInput.value); logWithTimestamp("Formatted Hex for Add:", newHexColor); if (newHexColor) { if (!customPaletteArray.includes(newHexColor)) { customPaletteArray.push(newHexColor); logWithTimestamp("Added. New customPaletteArray:", customPaletteArray); renderPaletteSwatches(customPaletteArray); uiElements.customHexInput.style.borderColor=''; } else { showStatus(`${newHexColor} already in palette.`); logWithTimestamp("Color already exists."); } } else { showStatus("Invalid hex code entered."); logWithTimestamp("Invalid hex for Add."); uiElements.customHexInput.style.borderColor='red'; }
        });

        if (uiElements.eyedropperButton) uiElements.eyedropperButton.addEventListener('click', () => {
            logWithTimestamp("eyedropperButton 'click' event"); isEyedropperActive = !isEyedropperActive; if (isEyedropperActive) { showStatus("Eyedropper active: Click on image preview."); uiElements.canvas.classList.add('eyedropper-active'); uiElements.eyedropperButton.textContent = "Cancel Eyedropper"; uiElements.eyedropperButton.style.borderColor='red'; } else { showStatus("Eyedropper deactivated."); uiElements.canvas.classList.remove('eyedropper-active'); uiElements.eyedropperButton.textContent = "Pick Color from Image (Eyedropper)"; uiElements.eyedropperButton.style.borderColor=''; }
        });
        if (uiElements.canvas) uiElements.canvas.addEventListener('click', (event) => {
            if (!isEyedropperActive) return; logWithTimestamp("canvas 'click' event (eyedropper active)"); const iDTS = previewImageData || originalImageData; if (!iDTS) return; const rect = uiElements.canvas.getBoundingClientRect(); const sX = uiElements.canvas.width/rect.width; const sY = uiElements.canvas.height/rect.height; const cX = Math.floor((event.clientX-rect.left)*sX); const cY = Math.floor((event.clientY-rect.top)*sY); if(cX<0||cX>=uiElements.canvas.width||cY<0||cY>=uiElements.canvas.height)return; const pI=(cY*uiElements.canvas.width+cX)*4; const r=iDTS.data[pI],g=iDTS.data[pI+1],b=iDTS.data[pI+2]; const rH=r.toString(16).padStart(2,'0'),gH=g.toString(16).padStart(2,'0'),bH=b.toString(16).padStart(2,'0'); const pH=`#${rH}${gH}${bH}`.toUpperCase(); if(uiElements.customColorPicker) uiElements.customColorPicker.value=pH; if(uiElements.customHexInput) { uiElements.customHexInput.value=pH; uiElements.customHexInput.style.borderColor=''; } showStatus(`Picked color: ${pH}`); isEyedropperActive=false; uiElements.canvas.classList.remove('eyedropper-active'); if(uiElements.eyedropperButton) { uiElements.eyedropperButton.textContent="Pick Color from Image (Eyedropper)"; uiElements.eyedropperButton.style.borderColor=''; }
        });

        if (uiElements.gammaSlider) uiElements.gammaSlider.addEventListener('input', () => { if(uiElements.gammaValueSpan) uiElements.gammaValueSpan.textContent = parseFloat(uiElements.gammaSlider.value).toFixed(1); updatePreview(); });
        if (uiElements.contrastSlider) uiElements.contrastSlider.addEventListener('input', () => { if(uiElements.contrastValueSpan) uiElements.contrastValueSpan.textContent = `${uiElements.contrastSlider.value}%`; updatePreview(); });
        if (uiElements.saturationSlider) uiElements.saturationSlider.addEventListener('input', () => { if(uiElements.saturationValueSpan) uiElements.saturationValueSpan.textContent = `${uiElements.saturationSlider.value}%`; updatePreview(); });
        if (uiElements.resetAdjustmentsButton) uiElements.resetAdjustmentsButton.addEventListener('click', () => { logWithTimestamp("resetAdjustmentsButton 'click' event"); uiElements.gammaSlider.value=1.0; uiElements.contrastSlider.value=100; uiElements.saturationSlider.value=100; if(uiElements.gammaValueSpan)uiElements.gammaValueSpan.textContent='1.0'; if(uiElements.contrastValueSpan)uiElements.contrastValueSpan.textContent='100%'; if(uiElements.saturationValueSpan)uiElements.saturationValueSpan.textContent='100%'; updatePreview(); showStatus("Adjustments reset."); });

        if (uiElements.processButton) uiElements.processButton.addEventListener("click", () => {
            logWithTimestamp("processButton 'click' event"); const iDTP = previewImageData || originalImageData; if (!iDTP) { showStatus("Please load an image first."); return; } if (isProcessing) { showStatus("Already processing..."); return; }
            isProcessing=true; showStatus("Processing image..."); uiElements.processButton.disabled=true; uiElements.undoButton.disabled=true; uiElements.downloadButton.disabled=true; if(uiElements.canvas.parentElement) uiElements.canvas.parentElement.classList.add("processing");
            setTimeout(() => { try { const palette = getUserPalette(); if (palette.length === 0) throw new Error("Palette is empty."); const pL = palette.map(h => { const rgb=colorSpace.hexToRgb(h); return colorSpace.rgbToLab(rgb.r,rgb.g,rgb.b); }); const sT=performance.now(); const oID = doNoDitherLargePalette(iDTP, palette, pL, colorSpace); const eT=performance.now(); showStatus(`Processing finished in ${((eT-sT)/1000).toFixed(2)}s.`); uiElements.ctx.putImageData(oID,0,0); currentImageData=oID; } catch (error) { console.error("Error during processing:",error); showStatus(`Error: ${error.message}. Reverting preview.`); alert(`Processing Error: ${error.message}`); const iTR=previewImageData||originalImageData; if(iTR&&uiElements.ctx)uiElements.ctx.putImageData(iTR,0,0); currentImageData=iTR; } finally { isProcessing=false; if(uiElements.processButton) uiElements.processButton.disabled=originalImageData===null; if(uiElements.undoButton) uiElements.undoButton.disabled=originalImageData===null; if(uiElements.downloadButton) uiElements.downloadButton.disabled=currentImageData===null; if(uiElements.canvas.parentElement) uiElements.canvas.parentElement.classList.remove("processing"); logWithTimestamp("Processing finished (in finally block)"); } }, 50);
        });

        if (uiElements.undoButton) uiElements.undoButton.addEventListener("click", () => {
            logWithTimestamp("undoButton 'click' event"); const iTR=previewImageData||originalImageData; if(iTR){showStatus("Last processing undone. Showing current preview."); uiElements.ctx.putImageData(iTR,0,0); currentImageData=iTR; if(uiElements.downloadButton)uiElements.downloadButton.disabled=currentImageData===null;} else {showStatus("No image data to restore to.");}
        });

        if (uiElements.downloadButton) uiElements.downloadButton.addEventListener("click", () => {
            logWithTimestamp("downloadButton 'click' event"); if (!currentImageData) { showStatus("No processed image to download."); return; } const pC=uiElements.paletteSelect.value; const fN=`${originalFileName}_quant_${pC}.png`; const tC=document.createElement("canvas"); tC.width=currentImageData.width; tC.height=currentImageData.height; const tCtx=tC.getContext("2d"); tCtx.putImageData(currentImageData,0,0); try { const link=document.createElement("a"); link.download=fN; link.href=tC.toDataURL("image/png"); link.click(); showStatus(`Download started: ${fN}`); } catch (error) { console.error("Error generating download link:",error); showStatus(`Error generating download: ${error.message}`); alert(`Error generating download: ${error.message}`); }
        });

        logWithTimestamp("Event listeners setup finished.");

    } catch (error) {
        console.error("Error setting up event listeners:", error);
        showStatus(`Error during setup: ${error.message}`);
        alert(`Application setup error: ${error.message}`);
    }

    // --- Initial Setup ---
    function initializeApp() {
        logWithTimestamp("initializeApp started");
        showStatus("Initializing application...");
        if (uiElements.processButton) uiElements.processButton.disabled = true; if (uiElements.undoButton) uiElements.undoButton.disabled = true; if (uiElements.downloadButton) uiElements.downloadButton.disabled = true;
        if (!uiElements.paletteSelect || !uiElements.paletteSwatchDisplay) { console.error("Cannot initialize: paletteSelect or paletteSwatchDisplay missing."); showStatus("Initialization failed."); return; }
        renderPaletteSwatches(customPaletteArray);
        logWithTimestamp("initializeApp: Checking paletteSelect before dispatch:", uiElements.paletteSelect); // DEBUG
        if (uiElements.paletteSelect) { logWithTimestamp("initializeApp: Dispatching 'change' event..."); uiElements.paletteSelect.dispatchEvent(new Event('change')); logWithTimestamp("initializeApp: 'change' event dispatched."); } // DEBUG
        else { console.error("initializeApp: Cannot dispatch event, paletteSelect is null."); } // DEBUG
        logWithTimestamp("initializeApp finished");
    }

    initializeApp(); // Run setup

})(); // End of main IIFE
