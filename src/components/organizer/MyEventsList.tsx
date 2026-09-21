import React, { useState } from 'react';
import type { EventItem } from '../../types';
import { formatEventSchedule, isEventExpired } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Edit,
  Copy,
  XCircle,
  PlusCircle,
  Clock,
  CheckCircle,
  Star,
  History,
  FileText,
} from 'lucide-react';

interface MyEventsListProps {
  events: EventItem[];
  onEdit: (event: EventItem) => void;
  onDuplicate: (event: EventItem) => void;
  onCancelEvent: (eventId: string, reason: string) => void;
  onCreateNew: () => void;
  onApproveEvent?: (eventId: string, makeFeatured?: boolean) => void;
  onToggleFeatured?: (eventId: string) => void;
}

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  borrador: { label: 'Borrador', class: 'bg-slate-700 text-slate-300 border-slate-600' },
  pendiente: { label: 'En Revisión Admin', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  publicado: { label: 'Publicado', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  rechazado: { label: 'Rechazado', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  cancelado: { label: 'Cancelado', class: 'bg-red-900/40 text-red-400 border-red-800' },
};

export const MyEventsList: React.FC<MyEventsListProps> = ({
  events,
  onEdit,
  onDuplicate,
  onCancelEvent,
  onCreateNew,
  onApproveEvent,
  onToggleFeatured,
}) => {
  const { role } = useAuth();
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Por motivos de fuerza mayor');
  const [subFilter, setSubFilter] = useState<'all' | 'pending' | 'published' | 'featured' | 'history' | 'draft'>('all');

  const pendingCount = events.filter((e) => e.status === 'pendiente').length;
  const publishedCount = events.filter((e) => e.status === 'publicado' && !isEventExpired(e.end_time)).length;
  const featuredCount = events.filter((e) => e.is_featured && e.status === 'publicado' && !isEventExpired(e.end_time)).length;
  const historyCount = events.filter((e) => e.status === 'publicado' && isEventExpired(e.end_time)).length;
  const draftCount = events.filter((e) => e.status === 'borrador').length;

  const filteredEvents = events.filter((e) => {
    const expired = isEventExpired(e.end_time);
    if (subFilter === 'pending') return e.status === 'pendiente';
    if (subFilter === 'published') return e.status === 'publicado' && !expired;
    if (subFilter === 'featured') return e.is_featured && e.status === 'publicado' && !expired;
    if (subFilter === 'history') return e.status === 'publicado' && expired;
    if (subFilter === 'draft') return e.status === 'borrador';
    return true;
  });

  const handleConfirmCancel = (id: string) => {
    onCancelEvent(id, cancelReason);
    setCancellingEventId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-black text-white">Mis Solicitudes y Eventos</h3>
          <p className="text-xs text-slate-400">Controla el estado de aprobación comercial por el Administrador y edita tus propuestas</p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-3.5 py-2 bg-gradient-to-r from-dance-crimson to-dance-orange text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-glow-crimson hover:opacity-95 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva Solicitud
        </button>
      </div>

      {/* Subfiltros de estado */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        <button
          onClick={() => setSubFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subFilter === 'all'
              ? 'bg-dance-coral text-white shadow-md'
              : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
          }`}
        >
          Todos ({events.length})
        </button>
        <button
          onClick={() => setSubFilter('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            subFilter === 'pending'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'bg-dark-850 text-amber-400 hover:text-amber-300 border border-dark-700'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>En Revisión ({pendingCount})</span>
        </button>
        <button
          onClick={() => setSubFilter('published')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            subFilter === 'published'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-dark-850 text-emerald-400 hover:text-emerald-300 border border-dark-700'
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          <span>En Cartelera ({publishedCount})</span>
        </button>
        <button
          onClick={() => setSubFilter('featured')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            subFilter === 'featured'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'bg-dark-850 text-amber-400 hover:text-amber-300 border border-dark-700'
          }`}
        >
          <Star className="w-3 h-3" />
          <span>Destacados ({featuredCount})</span>
        </button>
        <button
          onClick={() => setSubFilter('history')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            subFilter === 'history'
              ? 'bg-slate-700 text-white shadow-md'
              : 'bg-dark-850 text-slate-400 hover:text-slate-300 border border-dark-700'
          }`}
        >
          <History className="w-3 h-3" />
          <span>Historial (+24h) ({historyCount})</span>
        </button>
        {draftCount > 0 && (
          <button
            onClick={() => setSubFilter('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              subFilter === 'draft'
                ? 'bg-slate-700 text-white shadow-md'
                : 'bg-dark-850 text-slate-400 hover:text-slate-300 border border-dark-700'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Borradores ({draftCount})</span>
          </button>
        )}
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredEvents.map((evt) => {
            const sched = formatEventSchedule(evt.start_time, evt.end_time);
            const statusConfig = STATUS_BADGES[evt.is_cancelled ? 'cancelado' : evt.status] || STATUS_BADGES.publicado;

            return (
              <div
                key={evt.id}
                className={`bg-dark-900 border rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${
                  evt.is_cancelled ? 'border-red-900/50 bg-red-950/20' : 'border-dark-750'
                }`}
              >
                <div className="flex gap-4 items-center min-w-0">
                  <div className="w-16 h-20 rounded-xl overflow-hidden bg-dark-950 shrink-0 border border-dark-700">
                    <img src={evt.flyer_url} alt="" className="w-full h-full object-cover" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.class}`}>
                        {statusConfig.label}
                      </span>
                      {evt.is_featured && evt.status === 'publicado' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 border border-amber-300 shadow-sm flex items-center gap-1">
                          <span>⭐</span>
                          <span>DESTACADO (En Portada)</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-semibold uppercase">
                        {evt.category}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm sm:text-base text-white truncate max-w-md">
                      {evt.title}
                    </h4>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-dance-crimson shrink-0" />
                      <span>{sched.dateLabel}</span>
                      <span className="text-slate-600">•</span>
                      <span>{evt.venue_name}</span>
                    </div>

                    {/* Precios y Acuerdo con el Administrador */}
                    {!evt.is_free && (evt.advance_ticket_price || evt.admin_resale_price) && (
                      <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[11px]">
                        {evt.advance_ticket_price && (
                          <span className="text-slate-300 font-medium">
                            Público: <strong className="text-emerald-400">${evt.advance_ticket_price.toLocaleString('es-AR')}</strong>
                          </span>
                        )}
                        {evt.admin_resale_price && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                            Reventa Admin: ${evt.admin_resale_price.toLocaleString('es-AR')}
                          </span>
                        )}
                        {evt.admin_commission_rate && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                            Comisión Admin: {evt.admin_commission_rate}
                          </span>
                        )}
                      </div>
                    )}

                    {evt.status === 'pendiente' && (
                      <div className="space-y-2 mt-1">
                        <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                          ⏳ <strong>Solicitud enviada al Administrador.</strong> El evento permanecerá en revisión hasta que el Administrador lo apruebe. Si acordaste o abonaste la cuota de promoción, se publicará además en <strong>DESTACADOS</strong>.
                        </p>

                        {/* Si el usuario actual es Admin, permitir aprobarlo directamente con 1 click */}
                        {role === 'admin' && onApproveEvent && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <button
                              onClick={() => onApproveEvent(evt.id, false)}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              title="Aprobar y publicar en cartelera normal"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>⚡ Aprobar y Publicar (Admin)</span>
                            </button>

                            <button
                              onClick={() => onApproveEvent(evt.id, true)}
                              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 text-slate-950 font-black text-xs rounded-xl shadow-md border border-amber-300 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                              title="Aprobar y colocar en Destacados"
                            >
                              <Star className="w-3.5 h-3.5 fill-slate-950" />
                              <span>⭐ Aprobar + Destacar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {evt.status === 'rechazado' && evt.rejection_reason && (
                      <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/50 mt-1">
                        Motivo de rechazo: {evt.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap justify-end">
                  {role === 'admin' && evt.status === 'publicado' && onToggleFeatured && (
                    <button
                      onClick={() => onToggleFeatured(evt.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold border flex items-center justify-center transition-all cursor-pointer ${
                        evt.is_featured
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber'
                          : 'bg-dark-800 text-slate-400 hover:text-amber-300 border-dark-700 hover:border-amber-500/30'
                      }`}
                      title={evt.is_featured ? 'Quitar de destacados' : 'Hacer destacado'}
                    >
                      <Star className={`w-4 h-4 ${evt.is_featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  )}

                  <button
                    onClick={() => onEdit(evt)}
                    className="p-2.5 bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-semibold rounded-xl border border-dark-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Editar evento"
                  >
                    <Edit className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>

                  <button
                    onClick={() => onDuplicate(evt)}
                    className="p-2.5 bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-semibold rounded-xl border border-dark-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Duplicar para otra fecha"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Duplicar</span>
                  </button>

                  {!evt.is_cancelled && evt.status === 'publicado' && (
                    <button
                      onClick={() => setCancellingEventId(evt.id)}
                      className="p-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-semibold rounded-xl border border-red-800/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Cancelar evento"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </button>
                  )}
                </div>

                {cancellingEventId === evt.id && (
                  <div className="w-full mt-3 p-3.5 bg-red-950/80 border border-red-800 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-red-200">
                      ¿Confirmar cancelación pública de este evento?
                    </p>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Motivo de cancelación para el público..."
                      className="w-full px-3 py-1.5 bg-dark-900 border border-red-700 rounded-lg text-xs text-white"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setCancellingEventId(null)}
                        className="px-3 py-1 bg-dark-800 text-slate-300 text-xs rounded-lg"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={() => handleConfirmCancel(evt.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg"
                      >
                        Confirmar Cancelación
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-10 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-base">Aún no tienes eventos publicados</h4>
          <p className="text-xs text-slate-400">
            Publica tu primer social o clase para que miles de bachateros lo encuentren.
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-gradient-to-r from-dance-crimson to-dance-orange text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-glow-crimson"
          >
            <PlusCircle className="w-4 h-4" />
            Crear mi primer evento
          </button>
        </div>
      )}
    </div>
  );
};
