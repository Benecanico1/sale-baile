import React from 'react';
import type { EventMediaItem } from '../../types';
import { EventMediaCarousel } from './EventMediaCarousel';
import { X, ExternalLink } from 'lucide-react';

interface LightboxModalProps {
  imageUrl?: string;
  items?: EventMediaItem[];
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  imageUrl,
  items = [],
  title,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const mediaList: EventMediaItem[] =
    items.length > 0
      ? items
      : imageUrl
      ? [{ id: 'img-lb-1', type: 'image', url: imageUrl, thumbnail_url: imageUrl }]
      : [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-md animate-fadeIn"
    >
      <div
        className="relative w-full max-w-3xl max-h-[96vh] flex flex-col items-center bg-[#0a0d14] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between px-4 py-3 bg-[#121622] border-b border-white/10 text-white">
          <span className="font-bold text-sm truncate max-w-xs sm:max-w-md">{title}</span>
          <div className="flex items-center gap-2">
            {mediaList[0]?.url && (
              <a
                href={mediaList[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-dark-800/80 hover:bg-dark-700 text-slate-200 transition-colors"
                title="Abrir archivo original"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-dark-800/80 hover:bg-dark-700 text-slate-200 transition-colors cursor-pointer"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carrusel en Pantalla Completa */}
        <div className="w-full p-2 sm:p-4 bg-black flex items-center justify-center">
          <EventMediaCarousel
            items={mediaList}
            title={title}
            autoPlayVideo={true}
            className="max-h-[80vh] border border-white/5"
          />
        </div>
      </div>
    </div>
  );
};

