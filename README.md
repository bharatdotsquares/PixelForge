# PixelForge Studio – WebGL Magic Editor (Frontend)

Production-style React + Tailwind single-page editor shell designed for browser-only image editing workflows.

## Included modules

- Canva-style layout: top nav, left tool rail, center workspace, right property panel, bottom layers
- Magic Wand settings panel with threshold/blur/feather controls and conversion actions
- GPU filter stack chips for real-time effects pipeline
- Layer cards and selection visuals
- Stitch module feature summary with IndexedDB-first workflow

## Stack

- React 18 + TypeScript
- Tailwind CSS
- Vite
- Lucide icons

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Notes

This implementation is frontend-only, backend-free, and set up for extending into real canvas, WebGL shader passes, workers, and IndexedDB persistence.
