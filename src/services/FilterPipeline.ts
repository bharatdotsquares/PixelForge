import type { FilterState } from '../core/models';

export class FilterPipeline {
  apply(imageData: ImageData, filter: FilterState, mask?: Uint8Array): ImageData {
    const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      const pixel = i / 4;
      if (mask && !mask[pixel]) continue;

      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      const brightness = filter.brightness * 255;
      r += brightness;
      g += brightness;
      b += brightness;

      const contrast = 1 + filter.contrast;
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;

      if (filter.duotone > 0) {
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        r = luma * 80 + (1 - luma) * 20;
        g = luma * 220 + (1 - luma) * 40;
        b = luma * 255 + (1 - luma) * 70;
      }

      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
    return out;
  }
}
