import React, { useState } from 'react';
import type { EventItem, EventReview } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, Star, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface ReviewModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReview: (review: Omit<EventReview, 'id' | 'created_at'>) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  event,
  isOpen,
  onClose,
  onSubmitReview,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState(user?.full_name || '');
  const userEmail = user?.email || '';
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !event) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    onSubmitReview({
      event_id: event.id,
      event_title: event.title,
      organizer_id: event.organizer_id || 'org-1',
      organizer_name: event.organizer_name,
      user_name: userName,
      user_email: userEmail || 'asistente@gmail.com',
      rating,
      comment: comment.trim() || undefined,
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setComment('');
      onClose();
    }, 1400);
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5:
        return '¡Excelente! 🔥 La mejor fiesta / clase';
      case 4:
        return 'Muy bueno ✨ Gran ambiente';
      case 3:
        return 'Bueno 👍 Estuvo bien';
      case 2:
        return 'Regular 😐 Puede mejorar';
      case 1:
        return 'Malo 👎 No me gustó';
      default:
        return 'Selecciona tu puntuación';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0e121e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#131828]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-dance-amber/20 border border-dance-amber/40 flex items-center justify-center text-dance-amber">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Calificar Evento</h3>
              <p className="text-[11px] text-slate-400">Feedback para el organizador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Resumen del Evento */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#151b2c] border border-white/5">
            <img
              src={event.flyer_url}
              alt=""
              className="w-12 h-14 rounded-xl object-cover border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-white truncate">{event.title}</h4>
              <p className="text-[11px] text-dance-coral font-medium truncate">{event.organizer_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{event.venue_name} • {event.city}</p>
            </div>
          </div>

          {isSubmitted ? (
            <div className="py-8 text-center space-y-3 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">¡Gracias por tu opinión!</h4>
              <p className="text-xs text-slate-400">Tu calificación ayuda a la comunidad de baile a elegir los mejores eventos.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Estrellas Interactivas */}
              <div className="text-center space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  ¿Cómo estuvo el evento?
                </label>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'text-dance-amber fill-dance-amber drop-shadow-[0_0_8px_rgba(255,179,0,0.6)]'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-dance-coral">
                  {getRatingLabel(hoverRating || rating)}
                </p>
              </div>

              {/* Nombre de quien califica */}
              {!user && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Tu Nombre</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Tu nombre o apodo"
                    className="w-full px-3.5 py-2 bg-[#151b2c] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson"
                  />
                </div>
              )}

              {/* Comentario */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comentario u opinión (opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Contanos sobre la música, el piso, la atención de la barra, los profes..."
                  className="w-full px-3.5 py-2.5 bg-[#151b2c] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson resize-none"
                />
              </div>

              {/* Botón Enviar */}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-glow-crimson flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publicar Calificación</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
