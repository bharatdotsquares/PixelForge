export type ToolId = 'select' | 'crop' | 'adjust' | 'filter' | 'stitch' | 'layout';

export type StitchOrientation = 'horizontal' | 'vertical' | 'smart';
export type ObjectFitMode = 'cover' | 'contain' | 'stretch';
export type SelectionMode = 'classic' | 'edgeAware' | 'lab' | 'object' | 'hybrid';
export type ColorMetric = 'rgb' | 'lab';
export type ShaderPrimitiveId =
  | 'brightness'
  | 'contrast'
  | 'gamma'
  | 'exposure'
  | 'saturation'
  | 'hueRotate'
  | 'temperature'
  | 'filmCurve'
  | 'bloom'
  | 'vignette'
  | 'scanlines'
  | 'chromaticAberration'
  | 'glitch'
  | 'grain'
  | 'tealOrange';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropTransform {
  rotation: number;
  scaleX: number;
  scaleY: number;
  zoom: number;
}

export interface LayerModel {
  id: string;
  name: string;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  visible: boolean;
  locked: boolean;
  cropRect?: CropRect;
  cropTransform?: CropTransform;
  groupId?: string;
}

export interface SelectionVisualSettings {
  borderColor: string;
  borderThickness: number;
  overlayColor: string;
  overlayOpacity: number;
  glowColor: string;
  dashLength: number;
}

export interface MagicWandSettings {
  sensitivity: number;
  featherRadius: number;
  edgeSmoothness: number;
  mode: SelectionMode;
  colorMetric: ColorMetric;
  gradientAware: boolean;
  addMode: boolean;
}

export interface SelectionMask {
  width: number;
  height: number;
  pixels: Uint8Array;
  borderIndices: Uint32Array;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface FilterState {
  brightness: number;
  contrast: number;
  temperature: number;
  tint: number;
  duotone: number;
  bloom: number;
  glitch: number;
}

export interface ShaderNode {
  id: string;
  primitive: ShaderPrimitiveId;
  enabled: boolean;
  blendMode: 'normal' | 'screen' | 'multiply' | 'overlay';
  uniforms: Record<string, number>;
  animate?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  category: string;
  stack: ShaderNode[];
  controls: Partial<FilterState>;
}

export interface StitchOptions {
  orientation: StitchOrientation;
  spacing: number;
  background: string;
  targetWidth: number;
}

export interface CollageCell {
  id: string;
  imageSrc?: string;
  fitMode: ObjectFitMode;
}

export interface CollageLayout {
  columns: number;
  spacing: number;
  cornerRadius: number;
  cells: CollageCell[];
}
