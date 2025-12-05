# Test Files

This folder contains standalone HTML files for testing the 4-Colour FDM Workflow.

## Files

### `Image2Print-cdn.html` ⭐ **RECOMMENDED**
Single HTML file that loads all resources from jsDelivr CDN.
- Uses: `https://cdn.jsdelivr.net/gh/Cyrusublerman/Experiments@<branch>/`
- Best compatibility with ES6 modules
- Proper MIME types
- Fast CDN delivery

### `Image2Print-github.html`
Single HTML file that loads from GitHub raw URLs.
- Uses: `https://raw.githubusercontent.com/Cyrusublerman/Experiments/<branch>/`
- May have CORS/MIME type issues with some browsers
- Fallback option

## Usage

1. **Push your branch to GitHub first:**
   ```bash
   git push -u origin claude/refactor-image2print-modular-01UCd6FvZsXqJ71x6cydW1Bf
   ```

2. **Wait a few minutes** for jsDelivr to cache the files (first time only)

3. **Open the HTML file** in your browser:
   - Download `Image2Print-cdn.html`
   - Open it in any modern browser
   - Works from anywhere with internet connection

## How It Works

The HTML files use **ES6 Import Maps** to load JavaScript modules directly from GitHub/CDN:

```html
<script type="importmap">
{
  "imports": {
    "./js/init.js": "https://cdn.jsdelivr.net/gh/Cyrusublerman/Experiments@branch/js/init.js",
    ...
  }
}
</script>
```

This means:
- ✅ Single HTML file (easy to share/deploy)
- ✅ Loads latest code from GitHub
- ✅ Maintains modular architecture
- ✅ No build process needed

## Alternative: Local Testing

To test with local files instead, use the parent directory's `index.html` with a local web server:

```bash
python -m http.server 8000
# Then open: http://localhost:8000
```

Note: ES6 modules require a web server (can't use `file://` protocol).
