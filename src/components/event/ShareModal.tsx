import React, { useState } from 'react';
import type { EventItem } from '../../types';
import { X, Copy, Check, Share2, MessageCircle, Send } from 'lucide-react';

interface ShareModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ event, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !event) return null;

  const shareUrl = `${window.location.origin}/?event=${event.id}`;
  const shareText = `¡Mira este evento de bachata! 💃🕺\n"${event.title}"\n📍 ${event.venue_name} (${event.city})\n👉 ${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard copy error', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (e) {}
    } else {
      handleCopy();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(event.title)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-dark-900 border border-dark-700 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-dance-crimson/15 text-dance-crimson flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Compartir Evento</h3>
              <p className="text-xs text-slate-400">Pasa la data a tus amigos bachateros</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-2xl text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 rounded-2xl text-sky-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            Telegram
          </a>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Enlace Directo
          </label>
          <div className="flex items-center gap-1.5 bg-dark-850 p-1.5 rounded-2xl border border-dark-700">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent px-2 text-xs text-slate-200 w-full focus:outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-dark-750 hover:bg-dark-700 text-slate-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full py-2.5 px-4 bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-medium rounded-xl border border-dark-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Más opciones del sistema
          </button>
        )}
      </div>
    </div>
  );
};
