export type ToolId =
  | 'magicWand'
  | 'crop'
  | 'collage'
  | 'templates'
  | 'photos'
  | 'text'
  | 'uploads'
  | 'stickers'
  | 'elements'
  | 'background'
  | 'draw'
  | 'stitch';

export type StitchOrientation = 'horizontal' | 'vertical' | 'smart';
export type ObjectFitMode = 'cover' | 'contain' | 'stretch';

export interface LayerModel {
  id: string;
  name: string;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  visible: boolean;
  locked: boolean;
  groupId?: string;
}

export interface MagicWandSettings {
  threshold: number;
  blurRadius: number;
  featherRadius: number;
  contourTolerance: number;
  edgeDetection: boolean;
  addMode: boolean;
  antiAlias: boolean;
  borderThickness: number;
}

export interface SelectionMask {
  width: number;
  height: number;
  pixels: Uint8Array;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface FilterState {
  brightness: number;
  contrast: number;
  hueRotate: number;
  blur: number;
  sharpen: number;
  duotone: number;
  glitch: number;
  bloom: number;
  vignette: number;
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
