import React, { useState, useRef, useEffect } from 'react';
import type { EventMediaItem } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Film,
} from 'lucide-react';

interface EventMediaCarouselProps {
  items: EventMediaItem[];
  fallbackUrl?: string;
  title?: string;
  className?: string;
  onExpand?: () => void;
  autoPlayVideo?: boolean;
}

export const EventMediaCarousel: React.FC<EventMediaCarouselProps> = ({
  items = [],
  fallbackUrl = '',
  title = 'Flyer del Evento',
  className = '',
  onExpand,
  autoPlayVideo = false,
}) => {
  // Asegurar al menos 1 elemento
  const mediaList: EventMediaItem[] =
    items.length > 0
      ? items
      : fallbackUrl
      ? [{ id: 'fallback-1', type: 'image', url: fallbackUrl, thumbnail_url: fallbackUrl }]
      : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  // Touch gesture handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const currentItem = mediaList[currentIndex];

  useEffect(() => {
    // Pausar todos los videos que no sean el actual
    Object.entries(videoRefs.current).forEach(([idx, vidEl]) => {
      if (vidEl && Number(idx) !== currentIndex) {
        vidEl.pause();
      }
    });

    if (currentItem?.type === 'video' && autoPlayVideo) {
      const vid = videoRefs.current[currentIndex];
      if (vid) {
        vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, currentItem, autoPlayVideo]);

  if (mediaList.length === 0) {
    return (
      <div className="w-full aspect-[4/5] bg-dark-950 rounded-2xl flex items-center justify-center border border-white/10">
        <span className="text-slate-500 text-xs font-semibold">Sin imagen o video disponible</span>
      </div>
    );
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isSwipe = Math.abs(distance) > 45;

    if (isSwipe) {
      if (distance > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const togglePlayVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const vid = videoRefs.current[currentIndex];
    if (!vid) return;

    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const toggleMuteVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const vid = videoRefs.current[currentIndex];
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-black select-none group ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Contenedor de Medios */}
      <div className="relative w-full aspect-[4/5] max-h-[500px] flex items-center justify-center overflow-hidden">
        {mediaList.map((item, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={item.id || index}
              className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center bg-black ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {item.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={item.url}
                    poster={item.thumbnail_url}
                    playsInline
                    loop
                    muted={isMuted}
                    onClick={togglePlayVideo}
                    className="w-full h-full object-contain cursor-pointer"
                  />

                  {/* Overlay Controls para Video */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3.5 bg-gradient-to-t from-black/60 via-transparent to-black/30">
                    <div className="flex items-center justify-between pointer-events-auto">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-dance-coral" />
                        <span>Video {item.duration ? `(${item.duration}s)` : ''}</span>
                      </span>

                      <button
                        type="button"
                        onClick={toggleMuteVideo}
                        className="p-2 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-transform active:scale-95 cursor-pointer"
                        title={isMuted ? 'Activar Sonido' : 'Silenciar'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-slate-300" /> : <Volume2 className="w-4 h-4 text-dance-coral" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-center pointer-events-auto">
                      {!isPlaying && (
                        <button
                          type="button"
                          onClick={togglePlayVideo}
                          className="w-14 h-14 rounded-full bg-dance-crimson/90 hover:bg-dance-crimson text-white flex items-center justify-center shadow-xl shadow-dance-crimson/40 transition-transform active:scale-95 cursor-pointer"
                        >
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pointer-events-auto">
                      <button
                        type="button"
                        onClick={togglePlayVideo}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white flex items-center gap-1 cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                        <span className="text-[11px] font-semibold">{isPlaying ? 'Pausar' : 'Reproducir'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={item.url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-30 pointer-events-none"
                  />
                  <img
                    src={item.url}
                    alt={`${title} - foto ${index + 1}`}
                    className="relative z-10 w-full h-full object-contain"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flechas de Navegación (si hay más de 1 medio) */}
      {mediaList.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-lg sm:opacity-0 sm:group-hover:opacity-100"
            title="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-lg sm:opacity-0 sm:group-hover:opacity-100"
            title="Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Badge Contador y Botón Expandir Lightbox */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {mediaList.length > 1 && (
          <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-black tracking-wider border border-white/20 backdrop-blur-md shadow-md">
            {currentIndex + 1} / {mediaList.length}
          </span>
        )}

        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="p-2 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-bold border border-white/20 backdrop-blur-md flex items-center gap-1 shadow-md transition-transform active:scale-95 cursor-pointer"
            title="Ver en Pantalla Completa"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Indicador de Puntos Inferior */}
      {mediaList.length > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 z-20 flex items-center justify-center gap-1.5 pointer-events-auto">
          {mediaList.map((m, idx) => (
            <button
              key={m.id || idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`transition-all rounded-full cursor-pointer ${
                idx === currentIndex
                  ? 'w-6 h-2 bg-gradient-to-r from-dance-crimson to-dance-coral'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/70'
              }`}
              title={`Ir al elemento ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Tira de Miniaturas (si hay más de 2 elementos) */}
      {mediaList.length > 2 && (
        <div className="p-2 bg-[#0a0d14] border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none z-20">
          {mediaList.map((m, idx) => (
            <button
              key={m.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                idx === currentIndex ? 'border-dance-coral scale-105 shadow-md' : 'border-white/10 opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={m.thumbnail_url || m.url}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {m.type === 'video' && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
