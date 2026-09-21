import type { EventMediaItem } from '../types';

/**
 * Comprime y redimensiona una imagen para uso ligero en web
 */
export async function processImageFile(file: File, maxWidth = 1080, quality = 0.82): Promise<EventMediaItem> {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      reject(new Error('Formato de imagen inválido. Usa JPG, PNG o WebP.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'image',
            url: compressed,
            thumbnail_url: compressed,
          });
        } else {
          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'image',
            url: rawDataUrl,
            thumbnail_url: rawDataUrl,
          });
        }
      };
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime y recorta una foto de perfil a formato cuadrado optimizado (máx 400x400)
 */
export async function compressAvatarFile(file: File, maxDim = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!file.type.startsWith('image/') && !validTypes.includes(file.type.toLowerCase())) {
      reject(new Error('Formato de imagen inválido. Por favor selecciona una foto JPG, PNG o WebP.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Recorte cuadrado centrado (cover)
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        const targetSize = Math.min(minDim, maxDim);
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } else {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Extrae la miniatura (poster frame) y metadatos de un archivo de video
 */
export async function extractVideoThumbnail(
  videoSource: string | File,
  seekTime = 0.5
): Promise<{ thumbnail: string; duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let objectUrl = '';
    if (typeof videoSource === 'string') {
      video.src = videoSource;
    } else {
      objectUrl = URL.createObjectURL(videoSource);
      video.src = objectUrl;
    }

    const cleanUp = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const targetTime = Math.min(seekTime, video.duration > 1 ? 1.0 : video.duration / 2);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        const maxDim = 720;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.85);
          const duration = Math.round(video.duration || 0);
          cleanUp();
          resolve({ thumbnail, duration, width, height });
        } else {
          cleanUp();
          reject(new Error('No se pudo inicializar el renderizado del video.'));
        }
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanUp();
      reject(new Error('Formato de video no compatible o archivo dañado. Usa MP4, WebM o MOV.'));
    };
  });
}

/**
 * Procesa un archivo de video (MP4 / WebM / QuickTime), extrae la miniatura y lo prepara en formato ligero
 */
export async function processVideoFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<EventMediaItem> {
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('El video supera el tamaño máximo permitido (25 MB). Sube un video más corto o comprimido.');
  }

  onProgress?.('Extrayendo miniatura y analizando video...');

  const { thumbnail, duration } = await extractVideoThumbnail(file);

  onProgress?.('Codificando video ligero para reproducción rápida...');

  const videoDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Error al codificar el video.'));
    reader.readAsDataURL(file);
  });

  return {
    id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'video',
    url: videoDataUrl,
    thumbnail_url: thumbnail,
    duration,
  };
}
