export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const uid = (prefix: string): string => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const debounce = <T extends (...args: never[]) => void>(fn: T, delay = 40): T => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: never[]) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
};

export const rgbDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};
