import { clamp, rgbDistance } from '../core/utils';
import type { MagicWandSettings, SelectionMask } from '../core/models';

export class MagicWandEngine {
  constructor(private settings: MagicWandSettings) {}

  update(settings: Partial<MagicWandSettings>): MagicWandSettings {
    this.settings = { ...this.settings, ...settings };
    return this.settings;
  }

  select(imageData: ImageData, startX: number, startY: number): SelectionMask {
    const { width, height, data } = imageData;
    const visited = new Uint8Array(width * height);
    const pixels = new Uint8Array(width * height);

    const index = (x: number, y: number) => y * width + x;
    const startIdx = index(startX, startY) * 4;
    const seed = [data[startIdx], data[startIdx + 1], data[startIdx + 2]];

    const queue: Array<[number, number]> = [[startX, startY]];
    let minX = startX;
    let minY = startY;
    let maxX = startX;
    let maxY = startY;

    while (queue.length) {
      const [x, y] = queue.pop()!;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;

      const i = index(x, y);
      if (visited[i]) continue;
      visited[i] = 1;

      const p = i * 4;
      const distance = rgbDistance(seed[0], seed[1], seed[2], data[p], data[p + 1], data[p + 2]);
      if (distance > this.settings.threshold) continue;

      pixels[i] = 255;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    if (this.settings.featherRadius > 0) {
      this.feather(pixels, width, height, Math.round(this.settings.featherRadius));
    }

    return {
      width,
      height,
      pixels,
      bounds: {
        x: clamp(minX, 0, width - 1),
        y: clamp(minY, 0, height - 1),
        width: clamp(maxX - minX + 1, 0, width),
        height: clamp(maxY - minY + 1, 0, height)
      }
    };
  }

  private feather(mask: Uint8Array, width: number, height: number, radius: number): void {
    const copy = new Uint8Array(mask);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let count = 0;
        for (let ky = -radius; ky <= radius; ky += 1) {
          for (let kx = -radius; kx <= radius; kx += 1) {
            const nx = x + kx;
            const ny = y + ky;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            sum += copy[ny * width + nx];
            count += 1;
          }
        }
        mask[y * width + x] = sum / Math.max(1, count);
      }
    }
  }
}
