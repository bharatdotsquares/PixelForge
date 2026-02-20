import React from 'react';
import {
  Crop,
  Download,
  Eraser,
  Frames,
  Gauge,
  Grid2X2,
  ImagePlus,
  Layers,
  Moon,
  Paintbrush,
  Sparkles,
  SquareDashedMousePointer,
  WandSparkles
} from 'lucide-react';
import type { CollageLayout, FilterState, LayerModel, MagicWandSettings, SelectionMask, StitchOrientation, ToolId } from './core/models';
import { debounce, uid } from './core/utils';
import { MagicWandEngine } from './services/MagicWandEngine';
import { FilterPipeline } from './services/FilterPipeline';
import { LayerManager } from './services/LayerManager';
import { StitchEngine } from './services/StitchEngine';
import { CollageEngine } from './services/CollageEngine';
import { AssetStore } from './services/AssetStore';
import { LibraryAdapters } from './services/LibraryAdapters';

const TOOL_CONFIG: Array<{ id: ToolId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'magicWand', label: 'Magic Wand', icon: WandSparkles },
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'collage', label: 'Collages', icon: Grid2X2 },
  { id: 'templates', label: 'Templates', icon: Frames },
  { id: 'photos', label: 'Photos', icon: ImagePlus },
  { id: 'text', label: 'Text', icon: SquareDashedMousePointer },
  { id: 'uploads', label: 'Uploads', icon: Download },
  { id: 'stickers', label: 'Stickers', icon: Sparkles },
  { id: 'elements', label: 'Elements', icon: Layers },
  { id: 'background', label: 'Background', icon: Eraser },
  { id: 'draw', label: 'Draw', icon: Paintbrush },
  { id: 'stitch', label: 'Stitch', icon: Gauge }
];

const DEFAULT_WAND: MagicWandSettings = {
  threshold: 32,
  blurRadius: 2,
  featherRadius: 3,
  contourTolerance: 0.35,
  edgeDetection: true,
  addMode: false,
  antiAlias: true,
  borderThickness: 2
};

const DEFAULT_FILTERS: FilterState = {
  brightness: 0,
  contrast: 0,
  hueRotate: 0,
  blur: 0,
  sharpen: 0,
  duotone: 0,
  glitch: 0,
  bloom: 0,
  vignette: 0
};

interface AppState {
  activeTool: ToolId;
  wand: MagicWandSettings;
  filters: FilterState;
  layers: LayerModel[];
  selection: SelectionMask | null;
  collage: CollageLayout;
  stitchOrientation: StitchOrientation;
  stitchSpacing: number;
  stitchBackground: string;
  loading: boolean;
  status: string;
  libsStatus: Record<string, boolean>;
}

export class App extends React.Component<Record<string, never>, AppState> {
  private baseCanvasRef = React.createRef<HTMLCanvasElement>();
  private overlayCanvasRef = React.createRef<HTMLCanvasElement>();
  private wand = new MagicWandEngine(DEFAULT_WAND);
  private filters = new FilterPipeline();
  private layerManager = new LayerManager([
    { id: uid('layer'), name: 'Magic Selection', opacity: 100, blendMode: 'source-over', visible: true, locked: false },
    { id: uid('layer'), name: 'Background Landscape', opacity: 100, blendMode: 'source-over', visible: true, locked: false },
    { id: uid('layer'), name: 'Overlay Effects', opacity: 70, blendMode: 'overlay', visible: true, locked: false }
  ]);
  private stitchEngine = new StitchEngine();
  private collageEngine = new CollageEngine();
  private assetStore = new AssetStore();
  private marchingTimer?: ReturnType<typeof setInterval>;
  private dashOffset = 0;

  state: AppState = {
    activeTool: 'magicWand',
    wand: DEFAULT_WAND,
    filters: DEFAULT_FILTERS,
    layers: this.layerManager.all(),
    selection: null,
    collage: this.collageEngine.createLayout(4),
    stitchOrientation: 'horizontal',
    stitchSpacing: 8,
    stitchBackground: '#02141c',
    loading: true,
    status: 'Booting engines...',
    libsStatus: {}
  };

  async componentDidMount(): Promise<void> {
    await this.loadDemoImage();
    const libsStatus = await LibraryAdapters.warmupAll();
    this.setState({ libsStatus, loading: false, status: 'Ready - performance mode enabled' });
    this.startMarchingAnts();
  }

  componentWillUnmount(): void {
    if (this.marchingTimer) clearInterval(this.marchingTimer);
  }

  private startMarchingAnts(): void {
    this.marchingTimer = setInterval(() => {
      this.dashOffset -= 1;
      this.drawSelection();
    }, 70);
  }

  private async loadDemoImage(): Promise<void> {
    const canvas = this.baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = 'https://picsum.photos/960/620?image=1043';
    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    this.applyFiltersDebounced();
  }

  private applyFiltersDebounced = debounce(() => {
    const canvas = this.baseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const out = this.filters.apply(imageData, this.state.filters, this.state.selection?.pixels);
    ctx.putImageData(out, 0, 0);
    this.drawSelection();
  }, 80);

  private onCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    if (this.state.activeTool !== 'magicWand') return;
    const canvas = this.baseCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const selection = this.wand.select(ctx.getImageData(0, 0, canvas.width, canvas.height), x, y);
    this.setState({ selection, status: `Selected region at ${x},${y}` }, this.drawSelection);
  };

  private drawSelection = (): void => {
    const overlay = this.overlayCanvasRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const { selection, wand } = this.state;
    if (!selection) return;

    const { bounds } = selection;
    ctx.save();
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = this.dashOffset;
    ctx.strokeStyle = '#1cd6e2';
    ctx.lineWidth = wand.borderThickness;
    ctx.fillStyle = 'rgba(28,214,226,0.18)';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  };

  private updateWand = (key: keyof MagicWandSettings, value: number | boolean): void => {
    const next = this.wand.update({ [key]: value } as Partial<MagicWandSettings>);
    this.setState({ wand: next, status: `Updated ${key}` });
  };

  private updateFilter = (key: keyof FilterState, value: number): void => {
    this.setState((prev) => ({ filters: { ...prev.filters, [key]: value }, status: `Filter changed: ${key}` }), this.applyFiltersDebounced);
  };

  private async saveSelectionMask(): Promise<void> {
    const { selection } = this.state;
    if (!selection) return;
    const blob = new Blob([selection.pixels], { type: 'application/octet-stream' });
    await this.assetStore.save(`selection_${Date.now()}`, blob);
    this.setState({ status: 'Selection mask saved to IndexedDB' });
  }

  render(): React.ReactNode {
    const { activeTool, layers, loading, status, libsStatus, filters, wand } = this.state;

    return (
      <main className="h-screen bg-forge-950 text-slate-100">
        <header className="flex h-14 items-center justify-between border-b border-forge-800 bg-forge-900 px-4">
          <div className="flex items-center gap-4"><h1 className="text-lg font-semibold text-forge-300">PixelForge Studio</h1><span className="text-xs text-slate-400">File · Edit · View</span></div>
          <div className="text-sm text-forge-300 transition-opacity duration-500">{status}</div>
          <div className="flex items-center gap-3 text-sm"><span>GPU: ON</span><span>60 FPS</span><Moon className="size-4" /></div>
        </header>

        <section className="grid h-[calc(100vh-3.5rem)] grid-cols-[64px_1fr_340px]">
          <aside className="border-r border-forge-800 bg-forge-900/60 p-2">
            <ul className="space-y-2">
              {TOOL_CONFIG.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    className={`flex w-full items-center justify-center rounded-lg p-2 transition-all ${activeTool === id ? 'bg-forge-700 text-forge-300' : 'text-slate-400 hover:bg-forge-800'}`}
                    onClick={() => this.setState({ activeTool: id, status: `${label} activated` })}
                    title={label}
                  >
                    <Icon className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="grid grid-rows-[1fr_170px] overflow-hidden border-r border-forge-800">
            <section className="m-4 flex items-center justify-center rounded-xl border border-forge-800 bg-forge-900 shadow-panel">
              <div className="relative aspect-[16/10] w-[90%] max-w-5xl overflow-hidden rounded-lg border border-forge-700">
                {loading && <div className="absolute inset-0 z-10 animate-pulse bg-forge-900/80" />}
                <canvas ref={this.baseCanvasRef} width={960} height={620} className="h-full w-full object-contain" onClick={this.onCanvasClick} />
                <canvas ref={this.overlayCanvasRef} width={960} height={620} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
              </div>
            </section>

            <section className="border-t border-forge-800 bg-forge-900/50 p-3">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"><span>Layers</span><span>{layers.length} total</span></div>
              <div className="grid grid-cols-3 gap-3">
                {layers.map((layer) => (
                  <article key={layer.id} className="rounded-lg border border-forge-700 bg-forge-900 p-2">
                    <div className="h-12 rounded-md bg-gradient-to-r from-slate-300 to-slate-600" />
                    <p className="mt-2 text-xs text-slate-300">{layer.name}</p>
                    <input type="range" className="mt-1 w-full accent-forge-500" value={layer.opacity} onChange={(e) => this.setState({ layers: this.layerManager.update(layer.id, { opacity: Number(e.target.value) }) })} />
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="overflow-y-auto bg-forge-900/80 p-5">
            <h2 className="text-xl font-semibold">Magic Wand Settings</h2>
            <div className="mt-3 space-y-3">
              {([
                ['threshold', 0, 255],
                ['blurRadius', 0, 32],
                ['featherRadius', 0, 32],
                ['contourTolerance', 0, 1],
                ['borderThickness', 1, 8]
              ] as Array<[keyof MagicWandSettings, number, number]>).map(([key, min, max]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-sm capitalize text-slate-300">{key}: {String(wand[key])}</span>
                  <input type="range" min={min} max={max} step={key === 'contourTolerance' ? 0.01 : 1} value={Number(wand[key])} className="w-full accent-forge-500" onChange={(e) => this.updateWand(key, Number(e.target.value))} />
                </label>
              ))}
              <div className="grid grid-cols-2 gap-2">
                {(['edgeDetection', 'antiAlias', 'addMode'] as Array<keyof MagicWandSettings>).map((key) => (
                  <button key={key} className="rounded-md border border-forge-700 px-3 py-2 text-sm" onClick={() => this.updateWand(key, !Boolean(wand[key]))}>{key}: {wand[key] ? 'ON' : 'OFF'}</button>
                ))}
                <button className="rounded-md border border-forge-500 px-3 py-2 text-sm text-forge-300" onClick={() => this.saveSelectionMask()}>Save mask</button>
              </div>
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">Filter Stack</h3>
            <div className="mt-2 space-y-2">
              {(Object.keys(filters) as Array<keyof FilterState>).map((key) => (
                <label key={key} className="block">
                  <div className="mb-1 flex justify-between text-xs"><span>{key}</span><span>{filters[key].toFixed(2)}</span></div>
                  <input type="range" min={-1} max={1} step={0.01} value={filters[key]} className="w-full accent-forge-500" onChange={(e) => this.updateFilter(key, Number(e.target.value))} />
                </label>
              ))}
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">Library Availability</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {Object.entries(libsStatus).map(([name, ok]) => <span key={name} className="rounded border border-forge-700 px-2 py-1">{name}: {ok ? 'ready' : 'fallback'}</span>)}
            </div>

            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-slate-400">Stitch Controls</h3>
            <div className="mt-2 space-y-2 text-sm">
              <p>Orientation: {this.state.stitchOrientation}</p>
              <p>Spacing: {this.state.stitchSpacing}px</p>
              <p>Background: {this.state.stitchBackground}</p>
              <button className="rounded-md border border-forge-700 px-3 py-2" onClick={async () => { this.setState({ status: 'Stitch engine ready for multi-upload merge' }); await this.stitchEngine.merge([], { orientation: this.state.stitchOrientation, spacing: this.state.stitchSpacing, background: this.state.stitchBackground, targetWidth: 480 }).catch(() => null); }}>Validate stitch engine</button>
            </div>
          </aside>
        </section>
      </main>
    );
  }
}
