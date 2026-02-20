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

const tools = [
  { label: 'Magic Wand', icon: WandSparkles },
  { label: 'Crop', icon: Crop },
  { label: 'Collages', icon: Grid2X2 },
  { label: 'Templates', icon: Frames },
  { label: 'Photos', icon: ImagePlus },
  { label: 'Text', icon: SquareDashedMousePointer },
  { label: 'Uploads', icon: Download },
  { label: 'Stickers', icon: Sparkles },
  { label: 'Elements', icon: Layers },
  { label: 'Background', icon: Eraser },
  { label: 'Draw', icon: Paintbrush },
  { label: 'Stitch', icon: Gauge }
];

const filters = ['Brightness', 'Contrast', 'Hue Rotate', 'Blur', 'Sharpen', 'Duotone', 'Glitch', 'Bloom', 'Vignette'];
const layers = ['Magic Selection', 'Background Landscape', 'Overlay Effects'];

export function App() {
  return (
    <main className="h-screen bg-forge-950 text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-forge-800 bg-forge-900 px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-forge-300">PixelForge Studio</h1>
          <nav className="hidden gap-3 text-sm text-slate-300 md:flex">
            {['File', 'Edit', 'View'].map((item) => <button key={item}>{item}</button>)}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="rounded-md border border-forge-700 px-3 py-1">80%</button>
          <button className="rounded-md border border-forge-700 px-3 py-1">1920 × 1080</button>
          <button className="rounded-md bg-forge-500 px-3 py-1 font-semibold text-slate-950">Export</button>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <span>GPU: ON</span>
          <span>60 FPS</span>
          <Moon className="size-4" />
        </div>
      </header>

      <section className="grid h-[calc(100vh-3.5rem)] grid-cols-[64px_1fr_320px]">
        <aside className="border-r border-forge-800 bg-forge-900/60 p-2">
          <ul className="space-y-2">
            {tools.map(({ icon: Icon, label }, i) => (
              <li key={label}>
                <button className={`flex w-full items-center justify-center rounded-lg p-2 ${i === 0 ? 'bg-forge-700 text-forge-300' : 'text-slate-400 hover:bg-forge-800'}`} title={label}>
                  <Icon className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="grid grid-rows-[1fr_170px] overflow-hidden border-r border-forge-800">
          <section className="m-4 flex items-center justify-center rounded-xl border border-forge-800 bg-[radial-gradient(circle_at_center,rgba(28,214,226,0.15),transparent_60%)] shadow-panel">
            <div className="relative w-[78%] max-w-4xl rounded-xl border border-forge-700 bg-slate-900 p-2">
              <img
                className="h-full w-full rounded-lg object-cover opacity-90"
                src="https://picsum.photos/1200/760?grayscale"
                alt="Working canvas"
              />
              <div className="absolute inset-16 border-2 border-dashed border-forge-500/70 bg-forge-300/10" />
              <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-full bg-forge-500 px-4 py-1 text-xs font-semibold text-slate-950">Active Selection (Magic Wand)</div>
            </div>
          </section>

          <section className="border-t border-forge-800 bg-forge-900/50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>Layers</span>
              <span>Opacity 100%</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {layers.map((layer, idx) => (
                <article key={layer} className={`rounded-lg border p-2 ${idx === 0 ? 'border-forge-500 bg-forge-800' : 'border-forge-700 bg-forge-900'}`}>
                  <div className="h-12 rounded-md bg-gradient-to-r from-slate-200 to-slate-600" />
                  <p className="mt-2 text-xs text-slate-300">{layer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="overflow-y-auto bg-forge-900/80 p-5">
          <h2 className="text-xl font-semibold">Magic Wand Settings</h2>
          <p className="mt-1 text-sm text-slate-400">WebGL-powered smart selection with mask conversion.</p>

          <div className="mt-5 space-y-4">
            {[
              ['Tolerance Threshold', '32'],
              ['Blur Radius', '4.2px'],
              ['Feather Radius', '12%'],
              ['Contour Simplify', '0.35']
            ].map(([name, value]) => (
              <div key={name}>
                <div className="mb-2 flex justify-between text-sm"><span>{name}</span><span className="text-forge-300">{value}</span></div>
                <input type="range" className="w-full accent-forge-500" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {['Edge Detection', 'Add/Subtract', 'Expand', 'Contract', 'Invert', 'Save as mask'].map((action) => (
                <button key={action} className="rounded-md border border-forge-700 bg-forge-800 px-3 py-2 text-left hover:border-forge-500">{action}</button>
              ))}
            </div>
          </div>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">GPU Filter Stack</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {filters.map((filter) => <span key={filter} className="rounded-full border border-forge-700 px-3 py-1 text-xs">{filter}</span>)}
          </div>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">Stitch Module</h3>
          <div className="mt-2 space-y-2 text-sm">
            <p>• Upload + reorder images (IndexedDB local cache)</p>
            <p>• Horizontal / Vertical / Smart alignment</p>
            <p>• Spacing + background color controls</p>
            <p>• One-click merge + export</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
