/* eslint-disable @typescript-eslint/no-explicit-any */
export class LibraryAdapters {
  private static cache = new Map<string, unknown>();

  static async load<T = unknown>(name: string): Promise<T | null> {
    if (this.cache.has(name)) {
      return this.cache.get(name) as T;
    }

    try {
      const module = await import(/* @vite-ignore */ name);
      this.cache.set(name, module);
      return module as T;
    } catch {
      const globalModule = this.getGlobal(name);
      this.cache.set(name, globalModule);
      return (globalModule ?? null) as T | null;
    }
  }

  private static getGlobal(name: string): unknown {
    const scope = globalThis as Record<string, unknown>;
    const map: Record<string, string[]> = {
      fabric: ['fabric'],
      konva: ['Konva'],
      'magic-wand-tool': ['MagicWand'],
      'image-js': ['IJS', 'imagejs'],
      glfx: ['fx'],
      regl: ['createREGL', 'regl'],
      pica: ['pica'],
      interactjs: ['interact'],
      'face-api.js': ['faceapi'],
      '@imgly/background-removal': ['imglyRemoveBackground'],
      tracking: ['tracking'],
      jsfeat: ['jsfeat'],
      gammacv: ['GammaCV', 'gammacv']
    };

    const aliases = map[name] ?? [];
    for (const alias of aliases) {
      if (scope[alias]) return scope[alias];
    }
    return null;
  }

  static async warmupAll(): Promise<Record<string, boolean>> {
    const libs = [
      'fabric',
      'konva',
      'magic-wand-tool',
      'image-js',
      'glfx',
      'regl',
      'pica',
      'interactjs',
      'face-api.js',
      '@imgly/background-removal',
      'tracking',
      'jsfeat',
      'gammacv'
    ];

    const status = await Promise.all(libs.map(async (lib) => ({ lib, ok: !!(await this.load(lib)) })));
    return status.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.lib] = item.ok;
      return acc;
    }, {});
  }
}
