# PixelForge Studio – Production Frontend (React + Tailwind)

A functional, frontend-only image editor architecture with class-based engine services and a Canva-style workspace.

## What is implemented

- **Class-based React app shell** with separated state + rendering.
- **Magic Wand engine** (`MagicWandEngine`) flood-fill selection, threshold and feathering.
- **Filter pipeline** (`FilterPipeline`) with stack controls and mask-aware processing.
- **Layer system** (`LayerManager`) for DRY layer CRUD and opacity controls.
- **Stitch module engine** (`StitchEngine`) for horizontal/vertical/smart merge logic.
- **Collage module engine** (`CollageEngine`) with reusable grid generation.
- **IndexedDB persistence** (`AssetStore`) for local mask/uploads.
- **Dynamic library adapters** (`LibraryAdapters`) to warm up optional integrations:
  - fabric / konva
  - magic-wand-tool / image-js
  - glfx / regl
  - pica / interactjs
  - face-api.js / @imgly/background-removal / tracking / jsfeat / gammacv

## Architecture

```text
src/
  core/      -> models + utility functions
  services/  -> algorithm/engine classes (logic separation)
  App.tsx    -> UI orchestration
```

## Performance-first decisions

- Debounced filter processing.
- Typed arrays for mask operations.
- Delayed loading transitions while engines warm up.
- Dynamic imports with fallback mode when optional libraries are unavailable.

## Run

```bash
npm install
npm run dev
npm run build
```

> If your environment blocks npm registry access, app dependencies cannot be installed until network policy is relaxed.
