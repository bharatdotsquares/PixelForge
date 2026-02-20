import type { FilterPreset, FilterState, ShaderNode, ShaderPrimitiveId } from '../core/models';
import { uid } from '../core/utils';

const CATEGORY_BLUEPRINTS: Array<{ category: string; primitives: ShaderPrimitiveId[] }> = [
  { category: 'Cinematic', primitives: ['contrast', 'temperature', 'tealOrange', 'vignette', 'grain'] },
  { category: 'Portrait', primitives: ['brightness', 'contrast', 'saturation', 'bloom'] },
  { category: 'Landscape', primitives: ['exposure', 'saturation', 'vignette', 'filmCurve'] },
  { category: 'Vintage', primitives: ['filmCurve', 'grain', 'vignette', 'temperature'] },
  { category: 'Retro CRT', primitives: ['scanlines', 'chromaticAberration', 'glitch', 'vignette'] },
  { category: 'Dramatic', primitives: ['contrast', 'gamma', 'bloom', 'tealOrange'] },
  { category: 'Experimental', primitives: ['glitch', 'hueRotate', 'chromaticAberration', 'grain'] },
  { category: 'Black & White', primitives: ['contrast', 'filmCurve', 'grain'] },
  { category: 'HDR', primitives: ['exposure', 'contrast', 'bloom'] },
  { category: 'Artistic', primitives: ['hueRotate', 'saturation', 'vignette'] }
];

export class PresetManager {
  generate(totalPerCategory = 100): FilterPreset[] {
    const presets: FilterPreset[] = [];

    for (const blueprint of CATEGORY_BLUEPRINTS) {
      for (let i = 1; i <= totalPerCategory; i += 1) {
        const intensity = i / totalPerCategory;
        presets.push({
          id: uid('preset'),
          name: `${blueprint.category} ${i}`,
          category: blueprint.category,
          stack: this.buildStack(blueprint.primitives, intensity),
          controls: this.buildControls(intensity)
        });
      }
    }

    return presets;
  }

  private buildStack(primitives: ShaderPrimitiveId[], intensity: number): ShaderNode[] {
    return primitives.map((primitive, index) => ({
      id: uid(`node_${primitive}`),
      primitive,
      enabled: true,
      blendMode: index % 2 === 0 ? 'normal' : 'screen',
      uniforms: { amount: Number((0.15 + intensity * (0.8 - index * 0.03)).toFixed(3)) },
      animate: primitive === 'glitch' || primitive === 'scanlines'
    }));
  }

  private buildControls(intensity: number): Partial<FilterState> {
    return {
      brightness: Number((intensity * 0.2 - 0.05).toFixed(3)),
      contrast: Number((intensity * 0.45).toFixed(3)),
      temperature: Number((intensity * 0.3 - 0.15).toFixed(3)),
      duotone: Number((intensity * 0.35).toFixed(3)),
      bloom: Number((intensity * 0.4).toFixed(3)),
      glitch: Number((intensity > 0.7 ? (intensity - 0.7) * 0.6 : 0).toFixed(3))
    };
  }
}
