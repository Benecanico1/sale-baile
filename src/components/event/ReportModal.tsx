import React, { useState } from 'react';
import type { EventItem } from '../../types';
import { saveLocalReport } from '../../lib/supabase';
import { Flag, X, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ event, isOpen, onClose }) => {
  const [reason, setReason] = useState('Horario o fecha incorrectos');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !event) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveLocalReport({
      event_id: event.id,
      event_title: event.title,
      reporter_email: email || undefined,
      reason,
      details,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Reportar Evento</h3>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{event.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-white text-base">¡Gracias por tu reporte!</h4>
            <p className="text-xs text-slate-400">
              Nuestro equipo de moderación revisará la información para mantener los datos de la comunidad actualizados.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Motivo del reporte
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
              >
                <option value="Horario o fecha incorrectos">Horario o fecha incorrectos</option>
                <option value="Ubicación o dirección errónea">Ubicación o dirección errónea</option>
                <option value="Evento cancelado sin aviso">Evento cancelado sin aviso</option>
                <option value="Precios falsos o engañosos">Precios falsos o engañosos</option>
                <option value="Contenido ofensivo o flyer inapropiado">Contenido ofensivo o flyer inapropiado</option>
                <option value="Evento duplicado">Evento duplicado</option>
                <option value="Otro motivo">Otro motivo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Detalles adicionales (opcional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explica brevemente qué información debe ser corregida..."
                className="w-full px-3.5 py-2.5 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tu email (opcional, para avisarte cuando se corrija)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuemail@ejemplo.com"
                className="w-full px-3.5 py-2 bg-dark-850 border border-dark-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg"
              >
                Enviar Denuncia
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
