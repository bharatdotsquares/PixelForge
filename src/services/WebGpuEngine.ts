export class WebGpuEngine {
  private supported = typeof navigator !== 'undefined' && 'gpu' in navigator;

  isSupported(): boolean {
    return this.supported;
  }

  statusLabel(): string {
    return this.supported ? 'WebGPU ON' : 'WebGPU Fallback';
  }
}
