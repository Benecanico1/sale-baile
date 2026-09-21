import React, { useState, useRef } from 'react';
import type { EventMediaItem } from '../../types';
import { processImageFile, processVideoFile } from '../../lib/mediaProcessor';
import { EventMediaCarousel } from '../event/EventMediaCarousel';
import {
  X,
  AlertCircle,
  Film,
  Image as ImageIcon,
  Star,
  ArrowLeft,
  ArrowRight,
  Plus,
  Loader2,
  CheckCircle2,
  Eye,
} from 'lucide-react';

interface MediaGalleryUploaderProps {
  items: EventMediaItem[];
  onChange: (items: EventMediaItem[]) => void;
  maxItems?: number;
}

export const MediaGalleryUploader: React.FC<MediaGalleryUploaderProps> = ({
  items = [],
  onChange,
  maxItems = 8,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = async (files: FileList | File[]) => {
    setError(null);
    if (!files || files.length === 0) return;

    if (items.length + files.length > maxItems) {
      setError(`Puedes subir un máximo de ${maxItems} elementos (fotos o videos).`);
      return;
    }

    setIsProcessing(true);
    const newItems: EventMediaItem[] = [...items];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|m4v)$/i);

        if (isVideo) {
          setProcessingStatus(`Procesando video ${i + 1}/${files.length}...`);
          const processedVid = await processVideoFile(file, (msg) => setProcessingStatus(msg));
          newItems.push(processedVid);
        } else if (file.type.startsWith('image/')) {
          setProcessingStatus(`Optimizando foto ${i + 1}/${files.length}...`);
          const processedImg = await processImageFile(file);
          newItems.push(processedImg);
        } else {
          setError(`Formato no compatible para "${file.name}". Sube imágenes (JPG, PNG, WebP) o videos (MP4, WebM, MOV).`);
        }
      }

      onChange(newItems);
    } catch (err: any) {
      console.error('Error procesando archivos multimedia:', err);
      setError(err?.message || 'Ocurrió un error al procesar los archivos. Intenta con un archivo más ligero.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleProcessFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const handleSetAsCover = (index: number) => {
    if (index === 0) return;
    const target = items[index];
    const rest = items.filter((_, idx) => idx !== index);
    onChange([target, ...rest]);
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    onChange(newItems);
  };

  const handleMoveRight = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Flyer, Fotos & Videos del Evento <span className="text-dance-crimson">*</span>
          </label>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Sube el flyer principal, fotos adicionales o un video corto (MP4 / WebM) para armar un carrusel dinámico.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="px-3 py-1.5 rounded-xl bg-[#151a27] hover:bg-[#1f2638] text-xs font-bold text-dance-coral border border-dance-coral/30 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLivePreview ? 'Ocultar Carrusel' : 'Ver Carrusel'}</span>
          </button>
        )}
      </div>

      {/* Vista previa en Carrusel interactivo */}
      {showLivePreview && items.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#0c0f17] border border-dance-coral/30 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-dance-coral flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Vista Previa del Carrusel de tu Evento:
            </span>
            <span className="text-[10px] text-slate-400">
              Desliza o usa las flechas para probar
            </span>
          </div>
          <div className="max-w-xs mx-auto">
            <EventMediaCarousel items={items} />
          </div>
        </div>
      )}

      {/* Zona de Dropzone para subir fotos / video */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-dance-crimson bg-dance-crimson/10 scale-[0.99]'
            : 'border-dark-700 hover:border-dance-orange/60 bg-dark-850/50 hover:bg-dark-850'
        } ${isProcessing ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-2 py-3">
            <Loader2 className="w-8 h-8 text-dance-coral animate-spin" />
            <p className="text-xs font-bold text-white">{processingStatus || 'Procesando archivo multimedia...'}</p>
            <p className="text-[11px] text-slate-400">Optimizando y generando miniatura ligera para la web...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dance-crimson shadow-md">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="w-11 h-11 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center text-dance-coral shadow-md">
                <Film className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {items.length === 0
                  ? 'Haz clic para subir o arrastra tus fotos y videos aquí'
                  : 'Haz clic para agregar más fotos o videos al carrusel'}
              </p>
              <p className="text-xs text-slate-400">
                Soporta <strong>JPG, PNG, WebP</strong> y videos <strong>MP4 / WebM</strong> (hasta {maxItems} elementos en total).
              </p>
            </div>

            <span className="px-3.5 py-1.5 bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-semibold rounded-xl border border-dark-700 flex items-center gap-1.5 shadow-sm">
              <Plus className="w-4 h-4 text-dance-coral" />
              Elegir fotos / video
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Medios Subidos */}
      {items.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>
              Elementos en el Carrusel ({items.length}/{maxItems}):
            </span>
            <span className="text-[11px] text-slate-400">
              ⭐ La 1ª imagen/video es la <strong>Portada Principal</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((item, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={item.id || index}
                  className={`relative rounded-2xl overflow-hidden bg-[#121622] border transition-all flex flex-col justify-between ${
                    isCover
                      ? 'border-dance-coral shadow-lg shadow-dance-coral/10 ring-1 ring-dance-coral/40'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Vista de imagen o video miniatura */}
                  <div className="relative aspect-[3/4] w-full bg-black overflow-hidden group">
                    <img
                      src={item.thumbnail_url || item.url}
                      alt={`Elemento ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {item.type === 'video' && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-dance-coral text-[10px] font-black flex items-center gap-1 border border-dance-coral/30">
                        <Film className="w-3 h-3" />
                        <span>VIDEO {item.duration ? `(${item.duration}s)` : ''}</span>
                      </div>
                    )}

                    {isCover && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-md">
                        <Star className="w-3 h-3 fill-slate-950" />
                        <span>PORTADA</span>
                      </div>
                    )}

                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white shadow-md transition-colors cursor-pointer"
                      title="Eliminar del carrusel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Controles de ordenamiento */}
                  <div className="p-2 bg-[#151a27] border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveLeft(index)}
                        className={`p-1 rounded-lg border border-white/10 transition-colors ${
                          index === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer'
                        }`}
                        title="Mover a la izquierda"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => handleMoveRight(index)}
                        className={`p-1 rounded-lg border border-white/10 transition-colors ${
                          index === items.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer'
                        }`}
                        title="Mover a la derecha"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetAsCover(index)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer"
                        title="Elegir como Portada Principal"
                      >
                        <Star className="w-2.5 h-2.5" />
                        <span>Portada</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
