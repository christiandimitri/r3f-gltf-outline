# React Three Fiber GLTF Outline Shader

A React Three Fiber TypeScript application that loads GLTF models with post-process outline shader effects. This is a port of the [webgl-outlines](https://github.com/OmarShehata/webgl-outlines) technique to React Three Fiber, using `EffectComposer` and custom post-processing passes.

## Features

- 🎨 GLTF model loading with drag-and-drop support
- ✨ Post-process outline shader effect (based on depth, normal, and surface ID buffers)
- 🎮 Orbit controls for camera navigation
- 📦 TypeScript support
- ⚡ Vite for fast development
- 🎯 Uses webgl-outlines technique for high-quality edge detection
- 🎛️ Real-time outline parameter controls

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Build

```bash
npm run build
```

## Usage

1. Place your GLB or GLTF model file in `public/models/model.glb` (or `model.gltf`)
2. The model will automatically load and display
3. The outline shader effect will be applied automatically
4. Use mouse to orbit, zoom, and pan around the model
5. Drag and drop GLTF/GLB files onto the viewer to load new models

**Note:** GLB files are recommended as they're self-contained (all assets in one binary file), but GLTF files also work.

## Customization

You can customize the outline shader in `src/App.tsx` by modifying the `OutlineEffect` props:

- `outlineColor`: Color of the outline (default: `'#ffffff'`)
- `depthBias`: Depth bias for edge detection (default: `0.9`)
- `depthMultiplier`: Depth multiplier for edge detection (default: `20.0`)
- `normalBias`: Normal bias for edge detection (default: `1.0`)
- `normalMultiplier`: Normal multiplier for edge detection (default: `1.0`)
- `debugVisualize`: Debug visualization mode (default: `0`)
  - `0`: Outlines V2 (surface ID based)
  - `1`: Outlines V1 (depth/normal based)
  - `2`: Original scene
  - `3`: Depth buffer
  - `4`: Normal buffer
  - `5`: SurfaceID debug buffer
  - `6`: Outlines only V2

## Dependencies

- `@react-three/fiber`: React renderer for Three.js
- `three`: 3D graphics library
- `react` & `react-dom`: React framework

## Implementation Details

The outline shader is based on the [webgl-outlines](https://github.com/OmarShehata/webgl-outlines) technique, which:

1. Renders the scene to depth and normal buffers
2. Uses a post-process shader to detect edges based on depth and normal differences
3. Applies the outline effect as a fullscreen quad render

This approach provides high-quality outlines that work on any geometry without requiring special setup.

## Project Structure

```
r3f-gltf-outline/
├── public/
│   ├── models/
│   │   └── model.glb      # Place your GLB/GLTF model here
│   └── box_with_plane.glb  # Default model
├── src/
│   ├── components/
│   │   ├── OutlineEffect.tsx    # Main outline effect component (EffectComposer setup)
│   │   ├── OutlineControls.tsx   # UI controls for outline parameters
│   │   ├── OrbitControls.tsx    # Camera controls wrapper
│   │   ├── GLTFModel.tsx        # GLTF loader component
│   │   └── Box.tsx              # Simple box component
│   ├── utils/
│   │   ├── CustomOutlinePass.ts  # Custom outline pass (extends THREE.Pass)
│   │   ├── FindSurfaces.ts      # Surface ID computation
│   │   ├── DragAndDropModels.ts # Drag-and-drop model loading
│   │   └── createOutlinePass.ts # Legacy outline pass (not used)
│   ├── App.tsx                  # Main app component
│   ├── App.css                  # App styles
│   ├── index.css                # Global styles
│   └── main.tsx                 # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```


