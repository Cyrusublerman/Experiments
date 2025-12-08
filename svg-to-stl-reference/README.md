# SVG to STL Reference

This directory contains a complete copy of the [ryancalme/svg-to-stl](https://github.com/ryancalme/svg-to-stl) repository, cloned for reference and potential integration into our project.

## Source

- **Original Repository**: https://github.com/ryancalme/svg-to-stl
- **Original Author**: Ryan Calme
- **License**: MIT (see LICENSE file)
- **Cloned on**: 2025-12-08

## Overview

This is a browser-based tool that converts SVG (Scalable Vector Graphics) files to STL (Stereo-Lithography) files for 3D printing. It runs entirely in the browser using WebGL and various JavaScript libraries.

## Directory Structure

```
svg-to-stl-reference/
├── SVGtoSTL.html           # Main HTML interface
├── js/
│   ├── SVGtoSTL.js         # Core conversion logic
│   ├── form-green.js       # Form handling
│   └── external/           # Third-party libraries
│       ├── FileSaver.js    # Client-side file saving
│       ├── OrbitControls.js # Three.js camera controls
│       ├── STLExporter.js  # Exports Three.js geometry to STL format
│       ├── ThreeCSG.js     # Constructive Solid Geometry operations
│       ├── d3-threeD.js    # Converts SVG paths to Three.js geometries
│       ├── flatten.js      # Flattens SVG transforms to paths
│       ├── jquery-2.1.4.min.js
│       ├── spectrum.js     # Color picker
│       ├── svg-mesh-3d.js  # SVG to 3D mesh conversion
│       └── three.js        # WebGL 3D library
├── css/                    # Stylesheets
├── img/                    # UI icons
└── example-svg/            # Example SVG files (Entypo icon set)
```

## Key JavaScript Files

### Core Conversion Logic (`js/SVGtoSTL.js`)

The main conversion file contains three primary functions:

1. **`renderObject(paths, scene, group, options)`**
   - Main rendering function that takes SVG paths and creates 3D geometry
   - Handles material creation, extrusion, and CSG operations
   - Supports both raised and sunken type
   - Can add base plates (rectangular or circular)

2. **`getBasePlateObject(options, svgMesh)`**
   - Creates rectangular or circular base plates
   - Calculates proper dimensions based on SVG bounding box
   - Positions base plate correctly on the print bed

3. **`getExtrudedSvgObject(paths, options)`**
   - Converts SVG paths to extruded 3D meshes
   - Handles bevel options
   - Scales to requested size while maintaining aspect ratio
   - Centers the object on X/Y origin

### External Libraries

- **FileSaver.js** - Client-side file download functionality
- **OrbitControls.js** - Interactive 3D camera controls for viewing the model
- **STLExporter.js** - Exports Three.js geometry to ASCII STL format
- **ThreeCSG.js** - Boolean operations (union, intersect, subtract) on 3D geometry
- **d3-threeD.js** - Converts SVG path data to Three.js shapes
- **flatten.js** - Applies all hierarchical SVG transforms to path coordinates
- **three.js** - Core WebGL 3D rendering library

## Features

- Convert SVG files to 3D printable STL files
- Real-time 3D preview with orbit controls
- Configurable options:
  - Type size (mm)
  - Type depth (mm) - positive for raised, negative for sunken
  - Invert type (for printing press use)
  - Flare type (bevel for added strength)
  - Reverse winding order (for incorrectly built SVGs)
  - Base plate options (on/off, rectangular/circular)
  - Base depth and buffer settings
  - Rendering options (wireframe, edges, normals)
  - Color customization

## Integration Notes

For potential integration into our project, key considerations:

1. **Dependencies**: The tool requires Three.js and several specialized libraries
2. **SVG Requirements**:
   - Text must be converted to paths/outlines
   - Proper winding order (CW for outlines, CCW for holes or vice versa)
   - No scientific notation in path data
3. **Browser Requirements**: WebGL support and File API
4. **Core Algorithm**:
   - Parses SVG paths
   - Flattens transforms
   - Extrudes paths to 3D geometry
   - Optionally creates base plate
   - Uses CSG operations to combine/subtract geometries
   - Exports to STL format

## Known Limitations

- SVG text elements not supported (must convert to paths first)
- Winding order issues with some SVG creation tools
- Shapes filled with background color won't render as holes
- Scientific notation in paths causes infinite loops

## Usage

To test the tool locally, open `SVGtoSTL.html` in a modern browser (Chrome, Firefox) with WebGL support.

## License

MIT License - Copyright © 2016 Ryan Calme

See LICENSE file for full text.
