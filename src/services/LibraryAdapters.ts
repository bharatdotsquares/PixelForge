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
      this.cache.set(name, null);
      return null;
    }
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
