# PixelForge Studio v2

Cinema-grade browser image editor foundation focused on **selection-first editing**, **shader stack architecture** (1000+ generated presets), and a **production-style non-destructive crop system**.

## What changed in this iteration

- Added an advanced Crop Tool architecture:
  - non-destructive crop state (`draft` vs `applied` crop rect)
  - aspect presets (free, fixed ratios, social formats)
  - rotate/zoom/flip transform controls
  - apply/cancel/reset controls with command-history compatibility
  - rule-of-thirds crop overlay and dimmed outside region
- Added `CropEngine` service for crop defaults, aspect application, clamping, and layer crop attachment.
- Preserved shader stack architecture:
  - `ShaderStackEngine` for ordered stack operations
  - `PresetManager` for 1000 generated presets
  - `RenderGraph` ping-pong pass planning
  - WGSL scaffolding in `WebGpuShaders`

## Architecture highlights

```text
src/
  core/
    models.ts
    utils.ts
  services/
    CropEngine.ts
    ShaderStackEngine.ts
    PresetManager.ts
    RenderGraph.ts
    WebGpuShaders.ts
    CommandSystem.ts
    MagicWandEngine.ts
    ...
  App.tsx
  main.tsx
public/
  service-worker.js
```

## Run

```bash
npm install
npm run dev
npm run build
```
