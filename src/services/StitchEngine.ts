import type { StitchOptions } from '../core/models';

export class StitchEngine {
  async merge(images: HTMLImageElement[], options: StitchOptions): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context unavailable');
    }

    const safeImages = images.filter((img) => img.width > 0 && img.height > 0);
    if (!safeImages.length) {
      throw new Error('No valid images to stitch');
    }

    const normalized = safeImages.map((img) => {
      const ratio = options.targetWidth / img.width;
      return {
        img,
        width: options.targetWidth,
        height: Math.round(img.height * ratio)
      };
    });

    const orientation = options.orientation === 'smart'
      ? (normalized.reduce((s, i) => s + i.width, 0) > normalized.reduce((s, i) => s + i.height, 0) ? 'vertical' : 'horizontal')
      : options.orientation;

    if (orientation === 'horizontal') {
      canvas.width = normalized.reduce((sum, i) => sum + i.width, 0) + (normalized.length - 1) * options.spacing;
      canvas.height = Math.max(...normalized.map((i) => i.height));
    } else {
      canvas.width = Math.max(...normalized.map((i) => i.width));
      canvas.height = normalized.reduce((sum, i) => sum + i.height, 0) + (normalized.length - 1) * options.spacing;
    }

    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let cursor = 0;
    normalized.forEach(({ img, width, height }) => {
      if (orientation === 'horizontal') {
        ctx.drawImage(img, cursor, (canvas.height - height) / 2, width, height);
        cursor += width + options.spacing;
      } else {
        ctx.drawImage(img, (canvas.width - width) / 2, cursor, width, height);
        cursor += height + options.spacing;
      }
    });

    return canvas;
  }
}
