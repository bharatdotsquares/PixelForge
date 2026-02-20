import type { LayerModel } from '../core/models';
import { uid } from '../core/utils';

export class LayerManager {
  private layers: LayerModel[] = [];

  constructor(initial: LayerModel[] = []) {
    this.layers = initial;
  }

  all(): LayerModel[] {
    return this.layers;
  }

  create(name: string): LayerModel {
    const layer: LayerModel = {
      id: uid('layer'),
      name,
      opacity: 100,
      blendMode: 'source-over',
      visible: true,
      locked: false
    };
    this.layers = [layer, ...this.layers];
    return layer;
  }

  update(id: string, patch: Partial<LayerModel>): LayerModel[] {
    this.layers = this.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer));
    return this.layers;
  }

  delete(id: string): LayerModel[] {
    this.layers = this.layers.filter((layer) => layer.id !== id);
    return this.layers;
  }
}
