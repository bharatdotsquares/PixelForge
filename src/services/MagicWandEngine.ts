import { clamp, labDistance, rgbDistance, rgbToLab } from '../core/utils';
import type { MagicWandSettings, SelectionMask } from '../core/models';

export class MagicWandEngine {
  constructor(private settings: MagicWandSettings) {}

  update(settings: Partial<MagicWandSettings>): MagicWandSettings {
    this.settings = { ...this.settings, ...settings };
    return this.settings;
  }

  select(imageData: ImageData, startX: number, startY: number, previousMask?: Uint8Array, subtractMode = false): SelectionMask {
    const { width, height, data } = imageData;
    const visited = new Uint8Array(width * height);
    const nextMask = previousMask ? new Uint8Array(previousMask) : new Uint8Array(width * height);

    const index = (x: number, y: number) => y * width + x;
    const seedIdx = index(startX, startY) * 4;
    const seed = [data[seedIdx], data[seedIdx + 1], data[seedIdx + 2]] as const;
    const seedLab = rgbToLab(seed[0], seed[1], seed[2]);

    const queueX = new Int32Array(width * height * 4);
    const queueY = new Int32Array(width * height * 4);
    let head = 0;
    let tail = 0;
    queueX[tail] = startX;
    queueY[tail] = startY;
    tail += 1;

    const gradientThreshold = 18 + this.settings.edgeSmoothness * 60;

    while (head < tail) {
      const x = queueX[head];
      const y = queueY[head];
      head += 1;

      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = index(x, y);
      if (visited[i]) continue;
      visited[i] = 1;

      const p = i * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];

      const dist = this.settings.colorMetric === 'lab'
        ? labDistance(...seedLab, ...rgbToLab(r, g, b))
        : rgbDistance(seed[0], seed[1], seed[2], r, g, b);
      const threshold = this.settings.colorMetric === 'lab'
        ? this.settings.sensitivity * 45
        : this.settings.sensitivity * 255;
      if (dist > threshold) continue;

      if (this.settings.gradientAware && this.localGradient(data, width, height, x, y) > gradientThreshold) {
        continue;
      }

      nextMask[i] = subtractMode ? 0 : 255;

      queueX[tail] = x + 1;
      queueY[tail] = y;
      tail += 1;
      queueX[tail] = x - 1;
      queueY[tail] = y;
      tail += 1;
      queueX[tail] = x;
      queueY[tail] = y + 1;
      tail += 1;
      queueX[tail] = x;
      queueY[tail] = y - 1;
      tail += 1;
    }

    if (this.settings.featherRadius > 0) {
      this.feather(nextMask, width, height, Math.round(this.settings.featherRadius));
    }

    const bounds = this.computeBounds(nextMask, width, height);
    const borderIndices = this.getBorderIndices(nextMask, width, height, bounds);
    return { width, height, pixels: nextMask, borderIndices, bounds };
  }

  private localGradient(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): number {
    const sx = Math.min(width - 1, x + 1);
    const sy = Math.min(height - 1, y + 1);
    const idx = (px: number, py: number) => (py * width + px) * 4;

    const c = idx(x, y);
    const rx = idx(sx, y);
    const by = idx(x, sy);

    const dx = rgbDistance(data[c], data[c + 1], data[c + 2], data[rx], data[rx + 1], data[rx + 2]);
    const dy = rgbDistance(data[c], data[c + 1], data[c + 2], data[by], data[by + 1], data[by + 2]);
    return (dx + dy) / 2;
  }

  private computeBounds(mask: Uint8Array, width: number, height: number): { x: number; y: number; width: number; height: number } {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!mask[y * width + x]) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: clamp(minX, 0, width - 1),
      y: clamp(minY, 0, height - 1),
      width: clamp(maxX - minX + 1, 0, width),
      height: clamp(maxY - minY + 1, 0, height)
    };
  }

  private getBorderIndices(mask: Uint8Array, width: number, height: number, bounds: { x: number; y: number; width: number; height: number }): Uint32Array {
    if (!bounds.width || !bounds.height) return new Uint32Array(0);
    const indices: number[] = [];
    const startX = bounds.x;
    const endX = bounds.x + bounds.width - 1;
    const startY = bounds.y;
    const endY = bounds.y + bounds.height - 1;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * width + x;
        if (!mask[i]) continue;
        const left = x === 0 ? 0 : mask[i - 1];
        const right = x === width - 1 ? 0 : mask[i + 1];
        const up = y === 0 ? 0 : mask[i - width];
        const down = y === height - 1 ? 0 : mask[i + width];
        if (!left || !right || !up || !down) indices.push(i);
      }
    }
    return Uint32Array.from(indices);
  }

  private feather(mask: Uint8Array, width: number, height: number, radius: number): void {
    const copy = new Uint8Array(mask);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!copy[y * width + x]) continue;
        let sum = 0;
        let count = 0;
        for (let ky = -radius; ky <= radius; ky += 1) {
          for (let kx = -radius; kx <= radius; kx += 1) {
            const nx = x + kx;
            const ny = y + ky;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            sum += copy[ny * width + nx] > 0 ? 255 : 0;
            count += 1;
          }
        }
        mask[y * width + x] = sum / Math.max(1, count) > 110 ? 255 : 0;
      }
    }
  }
}
