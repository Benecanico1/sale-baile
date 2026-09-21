// Cache en memoria para registrar qué imágenes ya fueron cargadas por el navegador
const PRELOADED_IMAGE_SET = new Set<string>();

/**
 * Optimiza las URLs de imágenes (Unsplash, Cloudinary, etc.) para que descarguen
 * en formato moderno (WebP/AVIF), tamaño exacto para la pantalla y peso ultra ligero (40-60 KB en vez de 400 KB).
 */
export function getOptimizedImageUrl(url?: string, width = 500, quality = 75): string {
  if (!url) return '';

  try {
    // Optimización de imágenes de Unsplash
    if (url.includes('images.unsplash.com')) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('w', width.toString());
      urlObj.searchParams.set('q', quality.toString());
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fit', 'crop');
      return urlObj.toString();
    }

    // Optimización de Cloudinary
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
    }
  } catch (e) {
    // Si la URL no es válida o es relativa, devolverla tal cual
    return url;
  }

  return url;
}

/**
 * Precarga en segundo plano una lista de flyers para que al scrollear
 * ya se encuentren en la memoria caché del dispositivo y aparezcan instantáneamente.
 */
export function preloadImages(urls: (string | undefined)[]): void {
  if (typeof window === 'undefined') return;

  const validUrls = urls
    .filter((u): u is string => Boolean(u))
    .slice(0, 6) // Solo precargar los primeros 6 en cola para no saturar la red ni la memoria
    .map((u) => getOptimizedImageUrl(u, 480, 75));

  const runPreload = () => {
    validUrls.forEach((url) => {
      if (PRELOADED_IMAGE_SET.has(url)) return;

      const img = new window.Image();
      img.decoding = 'async';
      img.src = url;
      img.onload = () => {
        PRELOADED_IMAGE_SET.add(url);
      };
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runPreload, { timeout: 2000 });
  } else {
    setTimeout(runPreload, 300);
  }
}

/**
 * Verifica si una imagen ya fue precargada o procesada
 */
export function isImagePreloaded(url?: string): boolean {
  if (!url) return false;
  const optUrl = getOptimizedImageUrl(url, 500, 75);
  return PRELOADED_IMAGE_SET.has(optUrl) || PRELOADED_IMAGE_SET.has(url);
}

/**
 * Registra una imagen como cargada
 */
export function markImageAsLoaded(url?: string): void {
  if (!url) return;
  PRELOADED_IMAGE_SET.add(url);
  PRELOADED_IMAGE_SET.add(getOptimizedImageUrl(url, 500, 75));
}
