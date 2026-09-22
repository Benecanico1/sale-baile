import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Calendar,
  FileText,
  Search,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  MapPin,
  Music,
  Loader2,
  CheckCircle,
  Clock,
  Eye,
  MousePointerClick,
  Heart,
  Ticket,
  Send,
  MessageCircle,
} from 'lucide-react';
import {
  fetchLeads,
  fetchBotEvents,
  fetchReports,
  fetchDrafts,
  fetchVPSLogs,
  type BotLead,
  type BotEvent,
  type BotReport,
  type BotDraft,
} from '../../lib/botResults';

type SubTab = 'leads' | 'events' | 'drafts' | 'reports';

export const BotResults: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('leads');
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<string>('unknown');
  const [leads, setLeads] = useState<Record<string, BotLead>>({});
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [reports, setReports] = useState<Record<string, BotReport>>({});
  const [drafts, setDrafts] = useState<Record<string, BotDraft>>({});
  const [leadFilter, setLeadFilter] = useState<'all' | 'new' | 'contacted'>('all');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [l, e, r, d, s] = await Promise.all([
      fetchLeads(),
      fetchBotEvents(),
      fetchReports(),
      fetchDrafts(),
      fetchVPSLogs(),
    ]);
    setLeads(l);
    setEvents(e);
    setReports(r);
    setDrafts(d);
    setServerStatus(s || 'offline');
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    // Auto-refresh cada 30s
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const leadList = Object.entries(leads).map(([k, v]) => ({ key: k, ...v }));
  const filteredLeads = leadFilter === 'all' ? leadList : leadList.filter((l) => l.status === leadFilter);
  const sortedLeads = [...filteredLeads].sort((a, b) => b.score - a.score);
  const newLeadsCount = leadList.filter((l) => l.status === 'new').length;
  const contactedLeadsCount = leadList.filter((l) => l.status === 'contacted').length;
  const reportList = Object.entries(reports).map(([k, v]) => ({ key: k, ...v }));
  const draftList = Object.entries(drafts).map(([k, v]) => ({ key: k, ...v }));
  const pendingEvents = events.filter((e) => e.status === 'pendiente');

  const scoreColor = (score: number) => {
    if (score >= 60) return 'text-emerald-400';
    if (score >= 35) return 'text-amber-400';
    return 'text-slate-400';
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      contacted: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      joined: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      declined: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dismissed: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    };
    return styles[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/40';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-dance-coral" />
        <span className="ml-3 text-sm text-slate-400">Cargando resultados de los bots...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header con métricas */}
      <div className="bg-gradient-to-br from-dark-900 via-[#131722] to-dark-950 p-5 rounded-3xl border border-dark-750 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-black text-white">Resultados de los Bots IA</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Datos en tiempo real desde Firebase + VPS. Auto-actualiza cada 30s.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
              serverStatus === 'online' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              VPS {serverStatus === 'online' ? 'Online' : 'Offline'}
            </span>
            <button
              onClick={loadAll}
              className="px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-dark-900/80 border border-dark-750">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              Leads totales
            </div>
            <div className="text-2xl font-black text-white">{leadList.length}</div>
            <div className="text-[10px] text-blue-400 mt-0.5">{newLeadsCount} nuevos · {contactedLeadsCount} contactados</div>
          </div>
          <div className="p-3 rounded-2xl bg-dark-900/80 border border-dark-750">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-dance-crimson" />
              Eventos
            </div>
            <div className="text-2xl font-black text-white">{events.length}</div>
            <div className="text-[10px] text-amber-400 mt-0.5">{pendingEvents.length} pendientes</div>
          </div>
          <div className="p-3 rounded-2xl bg-dark-900/80 border border-dark-750">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              Borradores auto
            </div>
            <div className="text-2xl font-black text-white">{draftList.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Auto-detección</div>
          </div>
          <div className="p-3 rounded-2xl bg-dark-900/80 border border-dark-750">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Reportes
            </div>
            <div className="text-2xl font-black text-white">{reportList.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Semanales</div>
          </div>
        </div>
      </div>

      {/* Sub-navegación */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSubTab('leads')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'leads' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          Leads ({leadList.length})
        </button>
        <button
          onClick={() => setSubTab('events')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'events' ? 'bg-dance-crimson text-white shadow-md' : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Eventos ({events.length})
        </button>
        <button
          onClick={() => setSubTab('drafts')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'drafts' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Borradores ({draftList.length})
        </button>
        <button
          onClick={() => setSubTab('reports')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'reports' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Reportes ({reportList.length})
        </button>
      </div>

      {/* === TAB: LEADS === */}
      {subTab === 'leads' && (
        <div className="space-y-3">
          {/* Filtros de leads */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setLeadFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${leadFilter === 'all' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-dark-850 text-slate-400 border border-dark-700'}`}>Todos ({leadList.length})</button>
            <button onClick={() => setLeadFilter('new')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${leadFilter === 'new' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-dark-850 text-slate-400 border border-dark-700'}`}>🆕 Nuevos ({newLeadsCount})</button>
            <button onClick={() => setLeadFilter('contacted')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${leadFilter === 'contacted' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-dark-850 text-slate-400 border border-dark-700'}`}>📨 Contactados ({contactedLeadsCount})</button>
          </div>

          {/* Lista de leads */}
          {sortedLeads.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {sortedLeads.map((lead) => (
                <div key={lead.key} className="bg-dark-900 border border-dark-750 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Score circular */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${scoreColor(lead.score)} bg-dark-850 border border-dark-700`}>
                      {lead.score}
                    </div>
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">{lead.handle}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusBadge(lead.status)}`}>
                        {lead.status === 'new' ? '🆕 NUEVO' : lead.status === 'contacted' ? '📨 CONTACTADO' : lead.status}
                      </span>
                      {lead.dance_style && lead.dance_style !== 'general' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30 flex items-center gap-1">
                          <Music className="w-3 h-3" /> {lead.dance_style}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {lead.event_posts_count} eventos</span>
                      {lead.total_likes != null && <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {lead.total_likes} likes</span>}
                      {lead.location_mentioned && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.location_mentioned}</span>}
                      {lead.detected_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(lead.detected_at).toLocaleDateString('es-AR')}</span>}
                    </div>
                    {lead.outreach_message && (
                      <div className="mt-1.5 p-2 rounded-xl bg-dark-850 border border-dark-750 text-[11px] text-slate-300 flex items-start gap-1.5">
                        <MessageCircle className="w-3 h-3 text-dance-coral shrink-0 mt-0.5" />
                        <span>"{lead.outreach_message}"</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {lead.handle && (
                      <a
                        href={`https://instagram.com/${lead.handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 flex items-center justify-center transition-colors"
                        title="Ver Instagram"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-dark-900 border border-dark-800 rounded-2xl text-center text-xs text-slate-400">
              No hay leads para mostrar. Ejecutá el Cazador desde la pestaña 🤖 Bots IA.
            </div>
          )}
        </div>
      )}

      {/* === TAB: EVENTOS === */}
      {subTab === 'events' && (
        <div className="space-y-3">
          {events.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {events.map((evt, i) => (
                <div key={evt.id || i} className="bg-dark-900 border border-dark-750 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{evt.title || 'Sin título'}</h4>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 mt-1">
                        {evt.organizer_instagram && <span>📷 {evt.organizer_instagram}</span>}
                        {evt.venue_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {evt.venue_name}</span>}
                        {evt.city && <span>{evt.city}</span>}
                        {evt.genre_family && <span className="flex items-center gap-1"><Music className="w-3 h-3" /> {evt.genre_family}</span>}
                        {evt.source && <span className="text-dance-coral">fuente: {evt.source}</span>}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusBadge(evt.status)}`}>
                      {evt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {evt.start_time && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {evt.start_time.slice(0, 10)}</span>}
                    <span>{evt.is_free ? 'Gratis' : `$${evt.price || '?'}`}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-dark-900 border border-dark-800 rounded-2xl text-center text-xs text-slate-400">
              No hay eventos en Firebase todavía. Ejecutá el Radar desde la pestaña 🤖 Bots IA.
            </div>
          )}
        </div>
      )}

      {/* === TAB: BORRADORES === */}
      {subTab === 'drafts' && (
        <div className="space-y-3">
          {draftList.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {draftList.map((draft) => (
                <div key={draft.key} className="bg-dark-900 border border-cyan-500/30 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{draft.title || 'Sin título'}</h4>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 mt-1">
                        {draft.source_account && <span>📷 {draft.source_account}</span>}
                        {draft.venue_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {draft.venue_name}</span>}
                        {draft.genre_family && <span className="flex items-center gap-1"><Music className="w-3 h-3" /> {draft.genre_family}</span>}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusBadge(draft.status)}`}>
                      {draft.status}
                    </span>
                  </div>
                  {draft.notification_message && (
                    <div className="mt-1.5 p-2 rounded-xl bg-dark-850 border border-dark-750 text-[11px] text-slate-300 flex items-start gap-1.5">
                      <Send className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                      <span>"{draft.notification_message}"</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-dark-900 border border-dark-800 rounded-2xl text-center text-xs text-slate-400">
              No hay borradores automáticos todavía. La Auto-Detección los crea cuando encuentra flyers nuevos en Instagram de los organizadores registrados.
            </div>
          )}
        </div>
      )}

      {/* === TAB: REPORTES === */}
      {subTab === 'reports' && (
        <div className="space-y-3">
          {reportList.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {reportList.map((rep) => {
                const s = rep.stats || {};
                const genreEntries = s.genres ? Object.entries(s.genres) : [];
                return (
                  <div key={rep.key} className="bg-dark-900 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        {rep.organizer}
                      </h4>
                      <span className="text-[10px] text-slate-500">{rep.week_start} → {rep.week_end}</span>
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      <div className="p-2 rounded-xl bg-dark-850 border border-dark-750 text-center">
                        <Calendar className="w-3.5 h-3.5 text-dance-crimson mx-auto mb-1" />
                        <div className="text-base font-black text-white">{s.total_events || 0}</div>
                        <div className="text-[9px] text-slate-500">Eventos</div>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-850 border border-dark-750 text-center">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                        <div className="text-base font-black text-white">{s.published || 0}</div>
                        <div className="text-[9px] text-slate-500">Publicados</div>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-850 border border-dark-750 text-center">
                        <Clock className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                        <div className="text-base font-black text-white">{s.pending || 0}</div>
                        <div className="text-[9px] text-slate-500">Pendientes</div>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-850 border border-dark-750 text-center">
                        <Eye className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                        <div className="text-base font-black text-white">{s.total_views || 0}</div>
                        <div className="text-[9px] text-slate-500">Views</div>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-850 border border-dark-750 text-center">
                        <MousePointerClick className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                        <div className="text-base font-black text-white">{s.total_clicks || 0}</div>
                        <div className="text-[9px] text-slate-500">Clicks</div>
                      </div>
                      <div className="p-2 rounded-xl bg-dark-850 border border-dark-750 text-center">
                        <Ticket className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                        <div className="text-base font-black text-white">{s.total_tickets_sold || 0}</div>
                        <div className="text-[9px] text-slate-500">Entradas</div>
                      </div>
                    </div>

                    {/* Géneros */}
                    {genreEntries.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-bold">Géneros:</span>
                        {genreEntries.map(([g, c]) => (
                          <span key={g} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                            {g}: {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sugerencias */}
                    {rep.suggestions && rep.suggestions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-bold">Sugerencias IA:</span>
                        {rep.suggestions.map((sug, i) => (
                          <div key={i} className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-200 flex items-start gap-1.5">
                            <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 bg-dark-900 border border-dark-800 rounded-2xl text-center text-xs text-slate-400">
              No hay reportes semanales todavía. Se generan cada lunes a las 9 AM automáticamente.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
