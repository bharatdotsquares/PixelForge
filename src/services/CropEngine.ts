import type { CropRect, CropTransform, LayerModel } from '../core/models';

export class CropEngine {
  createDefault(imageWidth: number, imageHeight: number): CropRect {
    return {
      x: imageWidth * 0.1,
      y: imageHeight * 0.1,
      width: imageWidth * 0.8,
      height: imageHeight * 0.8
    };
  }

  applyAspect(rect: CropRect, aspect: number, maxWidth: number, maxHeight: number): CropRect {
    if (!Number.isFinite(aspect) || aspect <= 0) return rect;
    let width = rect.width;
    let height = width / aspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }
    return {
      x: Math.max(0, Math.min(maxWidth - width, rect.x)),
      y: Math.max(0, Math.min(maxHeight - height, rect.y)),
      width,
      height
    };
  }

  clampRect(rect: CropRect, maxWidth: number, maxHeight: number): CropRect {
    const width = Math.max(1, Math.min(rect.width, maxWidth));
    const height = Math.max(1, Math.min(rect.height, maxHeight));
    return {
      x: Math.max(0, Math.min(rect.x, maxWidth - width)),
      y: Math.max(0, Math.min(rect.y, maxHeight - height)),
      width,
      height
    };
  }

  applyToLayer(layer: LayerModel, rect: CropRect, transform: CropTransform): LayerModel {
    return { ...layer, cropRect: rect, cropTransform: transform };
  }
}
