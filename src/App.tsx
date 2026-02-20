import React from 'react';
import {
  Crop,
  Eye,
  EyeOff,
  Gauge,
  Layers,
  LayoutGrid,
  Sparkles,
  Undo2,
  Redo2,
  WandSparkles,
  Upload,
  ChevronDown,
  ChevronUp,
  FlipHorizontal,
  FlipVertical
} from 'lucide-react';
import type {
  CropRect,
  CropTransform,
  FilterPreset,
  FilterState,
  LayerModel,
  MagicWandSettings,
  SelectionMask,
  SelectionVisualSettings,
  ShaderNode,
  ToolId
} from './core/models';
import { debounce, hexToRgba, uid } from './core/utils';
import { MagicWandEngine } from './services/MagicWandEngine';
import { FilterPipeline } from './services/FilterPipeline';
import { LayerManager } from './services/LayerManager';
import { CommandSystem } from './services/CommandSystem';
import { WebGpuEngine } from './services/WebGpuEngine';
import { PresetManager } from './services/PresetManager';
import { ShaderStackEngine } from './services/ShaderStackEngine';
import { RenderGraph } from './services/RenderGraph';
import { CropEngine } from './services/CropEngine';

const TOOLS: Array<{ id: ToolId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'select', label: 'Select', icon: WandSparkles },
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'adjust', label: 'Adjust', icon: Sparkles },
  { id: 'filter', label: 'Filter', icon: Layers },
  { id: 'stitch', label: 'Stitch', icon: Gauge },
  { id: 'layout', label: 'Layout', icon: LayoutGrid }
];

const CROP_PRESETS: Array<{ label: string; ratio: number | null }> = [
  { label: 'Free', ratio: null },
  { label: '1:1', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '9:16', ratio: 9 / 16 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '2:3', ratio: 2 / 3 },
  { label: 'Instagram Post', ratio: 1 },
  { label: 'Story', ratio: 9 / 16 },
  { label: 'YouTube Thumb', ratio: 16 / 9 },
  { label: 'LinkedIn Banner', ratio: 4 / 1 }
];

const DEFAULT_WAND: MagicWandSettings = {
  sensitivity: 0.22,
  featherRadius: 2,
  edgeSmoothness: 0.5,
  mode: 'classic',
  colorMetric: 'lab',
  gradientAware: true,
  addMode: false
};

const DEFAULT_FILTERS: FilterState = {
  brightness: 0,
  contrast: 0,
  temperature: 0,
  tint: 0,
  duotone: 0,
  bloom: 0,
  glitch: 0
};

const DEFAULT_VISUAL: SelectionVisualSettings = {
  borderColor: '#ffffff',
  borderThickness: 2,
  overlayColor: '#1cd6e2',
  overlayOpacity: 0.2,
  glowColor: '#1cd6e2',
  dashLength: 4
};

const DEFAULT_TRANSFORM: CropTransform = { rotation: 0, scaleX: 1, scaleY: 1, zoom: 1 };

interface AppState {
  activeTool: ToolId;
  wand: MagicWandSettings;
  visual: SelectionVisualSettings;
  filters: FilterState;
  layers: LayerModel[];
  selection: SelectionMask | null;
  loading: boolean;
  status: string;
  fps: number;
  showOriginal: boolean;
  splitPreview: boolean;
  presets: FilterPreset[];
  activeCategory: string;
  shaderStack: ShaderNode[];
  appliedCrop: CropRect | null;
  draftCrop: CropRect | null;
  cropTransform: CropTransform;
  cropAspectLabel: string;
}

export class App extends React.Component<Record<string, never>, AppState> {
  private baseCanvasRef = React.createRef<HTMLCanvasElement>();
  private overlayCanvasRef = React.createRef<HTMLCanvasElement>();
  private sourceImageData: ImageData | null = null;
  private sourceCanvas: HTMLCanvasElement | null = null;
  private wand = new MagicWandEngine(DEFAULT_WAND);
  private filters = new FilterPipeline();
  private cropEngine = new CropEngine();
  private layerManager = new LayerManager([
    { id: uid('layer'), name: 'Base', opacity: 100, blendMode: 'source-over', visible: true, locked: false },
    { id: uid('layer'), name: 'Selection Mask', opacity: 100, blendMode: 'source-over', visible: true, locked: false }
  ]);
  private commands = new CommandSystem();
  private webGpu = new WebGpuEngine();
  private presetManager = new PresetManager();
  private stackEngine = new ShaderStackEngine();
  private renderGraph = new RenderGraph();
  private dashOffset = 0;
  private marchingTimer?: ReturnType<typeof setInterval>;
  private raf?: number;

  state: AppState = {
    activeTool: 'select',
    wand: DEFAULT_WAND,
    visual: DEFAULT_VISUAL,
    filters: DEFAULT_FILTERS,
    layers: this.layerManager.all(),
    selection: null,
    loading: true,
    status: 'Preparing workspace...',
    fps: 60,
    showOriginal: false,
    splitPreview: false,
    presets: this.presetManager.generate(100),
    activeCategory: 'Cinematic',
    shaderStack: [],
    appliedCrop: null,
    draftCrop: null,
    cropTransform: DEFAULT_TRANSFORM,
    cropAspectLabel: 'Free'
  };

  async componentDidMount(): Promise<void> {
    await this.loadDemoImage();
    this.startMarchingAnts();
    this.startFpsTicker();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.setState({ loading: false, status: `${this.webGpu.statusLabel()} · 1000+ Presets Ready` }, this.applyFiltersDebounced);
  }

  componentWillUnmount(): void {
    if (this.marchingTimer) clearInterval(this.marchingTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') this.setState({ showOriginal: true }, this.applyFiltersDebounced);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      const item = this.commands.undo();
      this.setState({ status: item ? `Undo: ${item}` : 'Nothing to undo' }, this.applyFiltersDebounced);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      const item = this.commands.redo();
      this.setState({ status: item ? `Redo: ${item}` : 'Nothing to redo' }, this.applyFiltersDebounced);
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'Space') this.setState({ showOriginal: false }, this.applyFiltersDebounced);
  };

  private startMarchingAnts(): void {
    this.marchingTimer = setInterval(() => {
      this.dashOffset = (this.dashOffset + 1) % 2000;
      this.drawOverlay();
    }, 120);
  }

  private startFpsTicker(): void {
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      this.setState({ fps: Math.min(60, Math.round(1000 / Math.max(1, delta))) });
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private async loadDemoImage(): Promise<void> {
    const canvas = this.baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = 'https://picsum.photos/1280/720?image=1025';
    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    this.sourceImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.sourceCanvas = document.createElement('canvas');
    this.sourceCanvas.width = canvas.width;
    this.sourceCanvas.height = canvas.height;
    this.sourceCanvas.getContext('2d')?.putImageData(this.sourceImageData, 0, 0);
    const crop = this.cropEngine.createDefault(canvas.width, canvas.height);
    this.setState({ appliedCrop: crop, draftCrop: crop });
  }

  private renderBaseFrame(ctx: CanvasRenderingContext2D, fullOriginal = false): void {
    if (!this.sourceCanvas) return;
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (fullOriginal || !this.state.appliedCrop) {
      ctx.drawImage(this.sourceCanvas, 0, 0, canvas.width, canvas.height);
      return;
    }

    const crop = this.state.appliedCrop;
    const t = this.state.cropTransform;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((t.rotation * Math.PI) / 180);
    ctx.scale(t.scaleX, t.scaleY);
    const dw = canvas.width * t.zoom;
    const dh = canvas.height * t.zoom;
    ctx.drawImage(this.sourceCanvas, crop.x, crop.y, crop.width, crop.height, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  private applyFiltersDebounced = debounce(() => {
    const canvas = this.baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.state.showOriginal) {
      this.renderBaseFrame(ctx, true);
      this.drawOverlay();
      return;
    }

    this.renderBaseFrame(ctx);

    const uniformMap = this.stackEngine.toUniformMap();
    const merged: FilterState = {
      ...this.state.filters,
      brightness: this.state.filters.brightness + (uniformMap['brightness.amount'] ?? 0) * 0.25,
      contrast: this.state.filters.contrast + (uniformMap['contrast.amount'] ?? 0) * 0.3,
      temperature: this.state.filters.temperature + (uniformMap['temperature.amount'] ?? 0) * 0.2,
      bloom: this.state.filters.bloom + (uniformMap['bloom.amount'] ?? 0) * 0.3,
      glitch: this.state.filters.glitch + (uniformMap['glitch.amount'] ?? 0) * 0.5,
      duotone: this.state.filters.duotone + (uniformMap['filmCurve.amount'] ?? 0) * 0.2,
      tint: this.state.filters.tint
    };

    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const output = this.filters.apply(frame, merged, this.state.selection?.pixels);
    ctx.putImageData(output, 0, 0);
    this.drawOverlay();
  }, 40);

  private onCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    if (this.state.activeTool !== 'select') return;
    const canvas = this.baseCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const oldSelection = this.state.selection;
    const previous = oldSelection?.pixels;
    const selection = this.wand.select(ctx.getImageData(0, 0, canvas.width, canvas.height), x, y, event.ctrlKey || this.state.wand.addMode ? previous : undefined, event.altKey);

    this.commands.run({
      label: 'Selection update',
      execute: () => this.setState({ selection, status: `Selection updated (${selection.borderIndices.length} edge px)` }, this.drawOverlay),
      undo: () => this.setState({ selection: oldSelection, status: 'Selection reverted' }, this.drawOverlay)
    });
  };

  private drawOverlay = (): void => {
    const overlay = this.overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (this.state.activeTool === 'crop' && this.state.draftCrop && !this.state.showOriginal) {
      const crop = this.state.draftCrop;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, overlay.width, overlay.height);
      ctx.clearRect(crop.x, crop.y, crop.width, crop.height);
      ctx.strokeStyle = '#1cd6e2';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(crop.x + crop.width / 3, crop.y);
      ctx.lineTo(crop.x + crop.width / 3, crop.y + crop.height);
      ctx.moveTo(crop.x + (crop.width * 2) / 3, crop.y);
      ctx.lineTo(crop.x + (crop.width * 2) / 3, crop.y + crop.height);
      ctx.moveTo(crop.x, crop.y + crop.height / 3);
      ctx.lineTo(crop.x + crop.width, crop.y + crop.height / 3);
      ctx.moveTo(crop.x, crop.y + (crop.height * 2) / 3);
      ctx.lineTo(crop.x + crop.width, crop.y + (crop.height * 2) / 3);
      ctx.stroke();
    }

    const { selection, visual } = this.state;
    if (!selection || this.state.showOriginal) return;

    const image = ctx.createImageData(selection.width, selection.height);
    const data = image.data;
    const [or, og, ob, oa] = hexToRgba(visual.overlayColor, visual.overlayOpacity);
    const [br, bg, bb] = hexToRgba(visual.borderColor, 1);

    for (let i = 0; i < selection.pixels.length; i += 1) {
      if (!selection.pixels[i]) continue;
      const p = i * 4;
      data[p] = or; data[p + 1] = og; data[p + 2] = ob; data[p + 3] = oa;
    }

    for (let i = 0; i < selection.borderIndices.length; i += 1) {
      const index = selection.borderIndices[i];
      const x = index % selection.width;
      const y = Math.floor(index / selection.width);
      const hatch = ((x + y + this.dashOffset) % (visual.dashLength * 2)) < visual.dashLength;
      const p = index * 4;
      data[p] = hatch ? 0 : br;
      data[p + 1] = hatch ? 0 : bg;
      data[p + 2] = hatch ? 0 : bb;
      data[p + 3] = 255;
    }

    ctx.putImageData(image, 0, 0);
  };

  private setTool(tool: ToolId): void {
    this.setState({ activeTool: tool, status: `${tool.toUpperCase()} mode` }, this.drawOverlay);
  }

  private applyPreset = (preset: FilterPreset): void => {
    const prev = this.state.filters;
    const next = { ...prev, ...preset.controls };
    this.commands.run({
      label: `Preset ${preset.name}`,
      execute: () => {
        const stack = this.stackEngine.setStack(preset.stack);
        this.setState({ filters: next, shaderStack: stack, status: `Applied ${preset.name}` }, this.applyFiltersDebounced);
      },
      undo: () => {
        this.stackEngine.setStack([]);
        this.setState({ filters: prev, shaderStack: [], status: `Reverted ${preset.name}` }, this.applyFiltersDebounced);
      }
    });
  };

  private setCropAspect(label: string): void {
    const preset = CROP_PRESETS.find((p) => p.label === label);
    const canvas = this.baseCanvasRef.current;
    const rect = this.state.draftCrop;
    if (!canvas || !rect || !preset) return;
    const next = preset.ratio ? this.cropEngine.applyAspect(rect, preset.ratio, canvas.width, canvas.height) : rect;
    this.setState({ cropAspectLabel: label, draftCrop: next }, this.drawOverlay);
  }

  private updateDraftCrop(patch: Partial<CropRect>): void {
    const canvas = this.baseCanvasRef.current;
    if (!canvas || !this.state.draftCrop) return;
    const next = this.cropEngine.clampRect({ ...this.state.draftCrop, ...patch }, canvas.width, canvas.height);
    this.setState({ draftCrop: next }, this.drawOverlay);
  }

  private updateCropTransform(patch: Partial<CropTransform>): void {
    this.setState((prev) => ({ cropTransform: { ...prev.cropTransform, ...patch } }), this.applyFiltersDebounced);
  }

  private applyCrop = (): void => {
    const current = this.state.appliedCrop;
    const next = this.state.draftCrop;
    if (!next) return;
    const oldTransform = this.state.cropTransform;
    this.commands.run({
      label: 'Apply crop',
      execute: () => {
        const baseLayer = this.state.layers[0];
        const updated = this.cropEngine.applyToLayer(baseLayer, next, this.state.cropTransform);
        this.setState({ appliedCrop: next, layers: this.layerManager.update(baseLayer.id, updated), status: 'Crop applied' }, this.applyFiltersDebounced);
      },
      undo: () => {
        const baseLayer = this.state.layers[0];
        const updated = this.cropEngine.applyToLayer(baseLayer, current ?? next, oldTransform);
        this.setState({ appliedCrop: current, draftCrop: current, layers: this.layerManager.update(baseLayer.id, updated), status: 'Crop reverted' }, this.applyFiltersDebounced);
      }
    });
  };

  private resetCrop = (): void => {
    const canvas = this.baseCanvasRef.current;
    if (!canvas) return;
    const crop = this.cropEngine.createDefault(canvas.width, canvas.height);
    this.setState({ draftCrop: crop, cropTransform: DEFAULT_TRANSFORM, cropAspectLabel: 'Free' }, this.drawOverlay);
  };

  private updateWand<K extends keyof MagicWandSettings>(key: K, value: MagicWandSettings[K]): void {
    const next = this.wand.update({ [key]: value } as Partial<MagicWandSettings>);
    this.setState({ wand: next, status: `Selection setting updated: ${key}` });
  }

  private updateVisual<K extends keyof SelectionVisualSettings>(key: K, value: SelectionVisualSettings[K]): void {
    this.setState((prev) => ({ visual: { ...prev.visual, [key]: value } }), this.drawOverlay);
  }

  private updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    this.setState((prev) => ({ filters: { ...prev.filters, [key]: value }, status: `Adjusted ${key}` }), this.applyFiltersDebounced);
  }

  private renderContextPanel(): React.ReactNode {
    const { activeTool, wand, visual, filters, presets, activeCategory, shaderStack, draftCrop, cropTransform, cropAspectLabel } = this.state;

    if (activeTool === 'crop' && draftCrop) {
      return (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Crop Settings</h2>
          <label className="block text-sm">Aspect Ratio
            <select className="mt-1 w-full rounded bg-forge-900 p-2" value={cropAspectLabel} onChange={(e) => this.setCropAspect(e.target.value)}>
              {CROP_PRESETS.map((p) => <option key={p.label}>{p.label}</option>)}
            </select>
          </label>
          <label className="block text-sm">X {Math.round(draftCrop.x)}<input type="range" min={0} max={1200} value={draftCrop.x} className="w-full accent-forge-500" onChange={(e) => this.updateDraftCrop({ x: Number(e.target.value) })} /></label>
          <label className="block text-sm">Y {Math.round(draftCrop.y)}<input type="range" min={0} max={760} value={draftCrop.y} className="w-full accent-forge-500" onChange={(e) => this.updateDraftCrop({ y: Number(e.target.value) })} /></label>
          <label className="block text-sm">Width {Math.round(draftCrop.width)}<input type="range" min={50} max={1280} value={draftCrop.width} className="w-full accent-forge-500" onChange={(e) => this.updateDraftCrop({ width: Number(e.target.value) })} /></label>
          <label className="block text-sm">Height {Math.round(draftCrop.height)}<input type="range" min={50} max={800} value={draftCrop.height} className="w-full accent-forge-500" onChange={(e) => this.updateDraftCrop({ height: Number(e.target.value) })} /></label>
          <label className="block text-sm">Rotate {cropTransform.rotation}°<input type="range" min={-180} max={180} value={cropTransform.rotation} className="w-full accent-forge-500" onChange={(e) => this.updateCropTransform({ rotation: Number(e.target.value) })} /></label>
          <label className="block text-sm">Zoom {cropTransform.zoom.toFixed(2)}<input type="range" min={0.5} max={2} step={0.01} value={cropTransform.zoom} className="w-full accent-forge-500" onChange={(e) => this.updateCropTransform({ zoom: Number(e.target.value) })} /></label>
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded border border-forge-700 px-2 py-2 text-sm" onClick={() => this.updateCropTransform({ scaleX: cropTransform.scaleX * -1 })}><FlipHorizontal className="mr-1 inline size-4" />Flip H</button>
            <button className="rounded border border-forge-700 px-2 py-2 text-sm" onClick={() => this.updateCropTransform({ scaleY: cropTransform.scaleY * -1 })}><FlipVertical className="mr-1 inline size-4" />Flip V</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="rounded border border-forge-700 px-2 py-2 text-sm" onClick={this.resetCrop}>Reset</button>
            <button className="rounded border border-forge-700 px-2 py-2 text-sm" onClick={() => this.setState({ draftCrop: this.state.appliedCrop, status: 'Crop canceled' }, this.drawOverlay)}>Cancel</button>
            <button className="rounded bg-forge-500 px-2 py-2 text-sm font-semibold text-slate-950" onClick={this.applyCrop}>Apply</button>
          </div>
        </div>
      );
    }

    if (activeTool === 'select') {
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Selection</h2>
          <label className="block text-sm">Sensitivity {wand.sensitivity.toFixed(2)}<input type="range" min={0.01} max={1} step={0.01} value={wand.sensitivity} className="w-full accent-forge-500" onChange={(e) => this.updateWand('sensitivity', Number(e.target.value))} /></label>
          <label className="block text-sm">Feather {wand.featherRadius}<input type="range" min={0} max={10} value={wand.featherRadius} className="w-full accent-forge-500" onChange={(e) => this.updateWand('featherRadius', Number(e.target.value))} /></label>
          <label className="block text-sm">Edge smoothness {wand.edgeSmoothness.toFixed(2)}<input type="range" min={0} max={1} step={0.01} value={wand.edgeSmoothness} className="w-full accent-forge-500" onChange={(e) => this.updateWand('edgeSmoothness', Number(e.target.value))} /></label>
          <label className="block text-sm">Overlay Color<input type="color" value={visual.overlayColor} className="mt-1 h-9 w-full rounded" onChange={(e) => this.updateVisual('overlayColor', e.target.value)} /></label>
        </div>
      );
    }

    if (activeTool === 'adjust') {
      return (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Essentials</h2>
          {(['brightness', 'contrast', 'temperature', 'tint'] as Array<keyof FilterState>).map((key) => (
            <label key={key} className="block text-sm"><div className="mb-1 flex justify-between"><span>{key}</span><span>{filters[key].toFixed(2)}</span></div><input type="range" min={-1} max={1} step={0.01} value={filters[key]} className="w-full accent-forge-500" onChange={(e) => this.updateFilter(key, Number(e.target.value))} /></label>
          ))}
        </div>
      );
    }

    if (activeTool === 'filter') {
      const categories = [...new Set(presets.map((p) => p.category))];
      const visiblePresets = presets.filter((p) => p.category === activeCategory).slice(0, 24);
      const passes = this.renderGraph.build(shaderStack);
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Shader Stack Presets</h2>
          <p className="text-xs text-slate-400">{presets.length} generated presets from shader primitives.</p>
          <select className="w-full rounded bg-forge-900 p-2 text-sm" value={activeCategory} onChange={(e) => this.setState({ activeCategory: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">{visiblePresets.map((preset) => <button key={preset.id} className="w-full rounded border border-forge-700 px-3 py-2 text-left text-xs hover:border-forge-500" onClick={() => this.applyPreset(preset)}><div className="font-semibold text-slate-200">{preset.name}</div><div className="text-slate-400">{preset.stack.length} shaders · {preset.stack.map((s) => s.primitive).join(' / ')}</div></button>)}</div>
          <div className="rounded-lg border border-forge-700 p-3"><div className="mb-2 text-xs uppercase text-slate-400">Active Shader Stack ({shaderStack.length})</div><div className="space-y-2">{shaderStack.slice(0, 6).map((node, index) => <div key={node.id} className="rounded border border-forge-800 p-2 text-xs"><div className="flex items-center justify-between"><span>{index + 1}. {node.primitive}</span><button onClick={() => this.setState({ shaderStack: this.stackEngine.toggleNode(node.id) }, this.applyFiltersDebounced)}>{node.enabled ? 'ON' : 'OFF'}</button></div><div className="mt-1 flex gap-1"><button className="rounded border border-forge-800 px-1" onClick={() => this.setState({ shaderStack: this.stackEngine.reorder(index, Math.max(0, index - 1)) })}><ChevronUp className="size-3" /></button><button className="rounded border border-forge-800 px-1" onClick={() => this.setState({ shaderStack: this.stackEngine.reorder(index, Math.min(shaderStack.length - 1, index + 1)) })}><ChevronDown className="size-3" /></button></div></div>)}</div></div>
          <div className="rounded-lg border border-forge-700 p-3 text-xs text-slate-400"><div className="mb-1 uppercase">Render Graph</div>{passes.length ? passes.map((pass) => <div key={pass.id}>{pass.input} → {pass.node.primitive} → {pass.output}</div>) : <div>No active passes</div>}</div>
        </div>
      );
    }

    if (activeTool === 'stitch') return <div className="space-y-2"><h2 className="text-lg font-semibold">Stitch</h2><p className="text-sm text-slate-400">Upload multiple images, reorder, and merge horizontally/vertically.</p></div>;
    return <div className="space-y-2"><h2 className="text-lg font-semibold">Layout</h2><p className="text-sm text-slate-400">Grid and template controls appear here.</p></div>;
  }

  render(): React.ReactNode {
    const { activeTool, loading, status, showOriginal, splitPreview, fps, layers } = this.state;
    return (
      <main className="h-screen bg-forge-950 text-slate-100">
        <header className="flex h-14 items-center justify-between border-b border-forge-800 bg-forge-900 px-4">
          <div className="flex items-center gap-4 text-sm"><h1 className="text-lg font-semibold text-forge-300">PixelForge Studio v2</h1><span>File</span><span>Edit</span><span>View</span></div>
          <div className="flex items-center gap-2 text-sm">
            <button className="rounded border border-forge-700 px-2 py-1" onClick={() => this.setState((p) => ({ splitPreview: !p.splitPreview }))}>Before/After</button>
            <button className="rounded border border-forge-700 px-2 py-1" onClick={() => { const item = this.commands.undo(); this.setState({ status: item ? `Undo: ${item}` : 'Nothing to undo' }, this.applyFiltersDebounced); }}><Undo2 className="size-4" /></button>
            <button className="rounded border border-forge-700 px-2 py-1" onClick={() => { const item = this.commands.redo(); this.setState({ status: item ? `Redo: ${item}` : 'Nothing to redo' }, this.applyFiltersDebounced); }}><Redo2 className="size-4" /></button>
            <span>80%</span>
          </div>
          <div className="flex items-center gap-3 text-sm"><span>{this.webGpu.statusLabel()}</span><span>{fps} FPS</span><button className="rounded bg-forge-500 px-3 py-1 font-semibold text-slate-950">Export</button></div>
        </header>

        <section className="grid h-[calc(100vh-3.5rem)] grid-cols-[72px_1fr_360px]">
          <aside className="border-r border-forge-800 bg-forge-900/60 p-2"><ul className="space-y-2">{TOOLS.map(({ id, label, icon: Icon }) => <li key={id}><button className={`flex w-full items-center justify-center rounded-lg p-2 transition-all ${activeTool === id ? 'bg-forge-700 text-forge-300' : 'text-slate-400 hover:bg-forge-800'}`} title={label} onClick={() => this.setTool(id)}><Icon className="size-5" /></button></li>)}</ul></aside>

          <div className="grid grid-rows-[1fr_150px] overflow-hidden border-r border-forge-800">
            <section className="m-3 flex items-center justify-center rounded-xl border border-forge-800 bg-forge-900 shadow-panel">
              <div className="relative aspect-[16/10] w-[94%] overflow-hidden rounded-lg border border-forge-700">
                {loading && <div className="absolute inset-0 z-20 animate-pulse bg-forge-900/80" />}
                {splitPreview && <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-white/70" />}
                <canvas ref={this.baseCanvasRef} width={1280} height={800} className="h-full w-full" onClick={this.onCanvasClick} />
                <canvas ref={this.overlayCanvasRef} width={1280} height={800} className="pointer-events-none absolute inset-0 h-full w-full" />
                <div className="absolute left-3 top-3 rounded bg-black/40 px-2 py-1 text-xs">{showOriginal ? 'Original view' : 'Edited view'} (hold Space)</div>
              </div>
            </section>

            <section className="border-t border-forge-800 bg-forge-900/50 p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"><span>Timeline / Layers</span><span>{status}</span></div>
              <div className="grid grid-cols-2 gap-3">{layers.map((layer) => <article key={layer.id} className="rounded-lg border border-forge-700 bg-forge-900 p-2"><div className="mb-1 flex items-center justify-between text-xs"><span>{layer.name}</span><button onClick={() => this.setState({ layers: this.layerManager.update(layer.id, { visible: !layer.visible }) })}>{layer.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}</button></div><input type="range" value={layer.opacity} className="w-full accent-forge-500" onChange={(e) => this.setState({ layers: this.layerManager.update(layer.id, { opacity: Number(e.target.value) }) })} /></article>)}</div>
            </section>
          </div>

          <aside className="overflow-y-auto bg-forge-900/80 p-4">
            {this.renderContextPanel()}
            <div className="mt-6 rounded-lg border border-forge-700 p-3 text-xs text-slate-400">
              <div className="mb-1 font-semibold text-slate-300">Quick hints</div>
              <p>Ctrl+Click: add selection</p><p>Alt+Click: subtract selection</p><p>Hold Space: before/after preview</p><p>Crop mode is non-destructive (Apply/Cancel + Undo).</p>
            </div>
            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-forge-700 py-2 text-sm"><Upload className="size-4" /> Upload</button>
          </aside>
        </section>
      </main>
    );
  }
}
