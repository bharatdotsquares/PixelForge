export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const uid = (prefix: string): string => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const debounce = <T extends (...args: never[]) => void>(fn: T, delay = 40): T => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
};

export const rgbDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const pivot = (v: number): number => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92);

export const rgbToLab = (r: number, g: number, b: number): [number, number, number] => {
  const rr = pivot(r / 255);
  const gg = pivot(g / 255);
  const bb = pivot(b / 255);

  let x = rr * 0.4124 + gg * 0.3576 + bb * 0.1805;
  let y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
  let z = rr * 0.0193 + gg * 0.1192 + bb * 0.9505;

  x /= 0.95047;
  y /= 1;
  z /= 1.08883;

  const f = (t: number) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

export const labDistance = (l1: number, a1: number, b1: number, l2: number, a2: number, b2: number): number => {
  const dl = l1 - l2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dl * dl + da * da + db * db);
};

export const hexToRgba = (hex: string, alpha: number): [number, number, number, number] => {
  const value = hex.replace('#', '');
  const int = Number.parseInt(value.length === 3 ? value.split('').map((c) => `${c}${c}`).join('') : value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return [r, g, b, Math.round(clamp(alpha, 0, 1) * 255)];
};
