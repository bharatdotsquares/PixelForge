export const MASTER_FRAGMENT_WGSL = `
struct Uniforms {
  brightness: f32,
  contrast: f32,
  saturation: f32,
  hueRotate: f32,
  temperature: f32,
  vignette: f32,
  bloom: f32,
  glitch: f32,
  time: f32,
  maskMix: f32,
}

@group(0) @binding(0) var sourceTex: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
@group(0) @binding(2) var maskTex: texture_2d<f32>;
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn applyColorCore(c: vec3<f32>) -> vec3<f32> {
  var color = c;
  color = color * (1.0 + uniforms.brightness);
  color = (color - vec3<f32>(0.5)) * uniforms.contrast + vec3<f32>(0.5);
  color.r += uniforms.temperature * 0.08;
  color.b -= uniforms.temperature * 0.08;
  return color;
}
`;

export const CRT_STACK_FRAGMENT_WGSL = `
fn applyCRT(c: vec3<f32>, uv: vec2<f32>, strength: f32) -> vec3<f32> {
  let scan = sin(uv.y * 1200.0) * 0.04 * strength;
  return c - vec3<f32>(scan);
}
`;
