const processedCache = new Map<string, string>();

const WHITE_THRESHOLD = 238;
const FEATHER = 20;
const DARK_THRESHOLD = 72;

export type LogoProcessMode = 'strip-white' | 'on-dark';

function cacheKey(src: string, mode: LogoProcessMode) {
  return `${mode}:${src}`;
}

/**
 * Rend transparents les pixels quasi blancs (fond JPEG/PNG des logos institutionnels).
 * En mode `on-dark`, convertit aussi le texte/traits quasi noirs en blanc pour un pied de page sombre.
 */
export function stripLogoWhiteBackground(
  img: HTMLImageElement,
  threshold = WHITE_THRESHOLD,
  feather = FEATHER,
  mode: LogoProcessMode = 'strip-white'
): string | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minChannel = Math.min(r, g, b);
    const maxChannel = Math.max(r, g, b);
    const saturation = maxChannel - minChannel;

    if (minChannel >= threshold && saturation < 36) {
      data[i + 3] = 0;
      continue;
    }

    if (minChannel >= threshold - feather && saturation < 48) {
      const t = (threshold - minChannel) / feather;
      data[i + 3] = Math.round(Math.max(0, Math.min(255, t * data[i + 3])));
      continue;
    }

    if (mode === 'on-dark' && maxChannel <= DARK_THRESHOLD && saturation < 28) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function getCachedLogoSrc(
  src: string,
  mode: LogoProcessMode = 'strip-white'
): string | undefined {
  return processedCache.get(cacheKey(src, mode));
}

export function cacheProcessedLogoSrc(
  src: string,
  processed: string,
  mode: LogoProcessMode = 'strip-white'
): void {
  processedCache.set(cacheKey(src, mode), processed);
}

export async function loadLogoWithoutWhiteBackground(
  src: string,
  mode: LogoProcessMode = 'strip-white'
): Promise<string> {
  const key = cacheKey(src, mode);
  const cached = processedCache.get(key);
  if (cached) return cached;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const processed = stripLogoWhiteBackground(img, WHITE_THRESHOLD, FEATHER, mode);
      const result = processed ?? src;
      if (processed) processedCache.set(key, processed);
      resolve(result);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
