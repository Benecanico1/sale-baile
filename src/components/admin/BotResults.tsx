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
  type BotLead,
  type BotEvent,
  type BotReport,
  type BotDraft,
} from '../../lib/botResults';

type SubTab = 'leads' | 'events' | 'drafts' | 'reports';

export const BotResults: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('leads');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Record<string, BotLead>>({});
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [reports, setReports] = useState<Record<string, BotReport>>({});
  const [drafts, setDrafts] = useState<Record<string, BotDraft>>({});
  const [leadFilter, setLeadFilter] = useState<'all' | 'new' | 'contacted'>('all');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [l, e, r, d] = await Promise.all([
      fetchLeads(),
      fetchBotEvents(),
      fetchReports(),
      fetchDrafts(),
    ]);
    setLeads(l);
    setEvents(e);
    setReports(r);
    setDrafts(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
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

  const scoreColor = (score: number) => {
    if (score >= 60) return 'text-emerald-400';
    if (score >= 35) return 'text-amber-400';
    return 'text-zinc-500';
  };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-400',
      contacted: 'bg-amber-400',
      joined: 'bg-emerald-400',
      declined: 'bg-rose-400',
      pending: 'bg-amber-400',
      published: 'bg-emerald-400',
      dismissed: 'bg-zinc-600',
    };
    return colors[status] || 'bg-zinc-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        <span className="ml-2.5 text-xs text-zinc-500">Cargando resultados...</span>
      </div>
    );
  }

  const tabs: { id: SubTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'leads', label: 'Leads', icon: <Target className="w-3.5 h-3.5" />, count: leadList.length },
    { id: 'events', label: 'Eventos', icon: <Calendar className="w-3.5 h-3.5" />, count: events.length },
    { id: 'drafts', label: 'Borradores', icon: <Search className="w-3.5 h-3.5" />, count: draftList.length },
    { id: 'reports', label: 'Reportes', icon: <FileText className="w-3.5 h-3.5" />, count: reportList.length },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs minimalistas */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Leads', value: leadList.length, sub: `${newLeadsCount} nuevos`, icon: <Target className="w-3.5 h-3.5" /> },
          { label: 'Eventos', value: events.length, sub: 'en Firebase', icon: <Calendar className="w-3.5 h-3.5" /> },
          { label: 'Borradores', value: draftList.length, sub: 'auto-detect', icon: <Search className="w-3.5 h-3.5" /> },
          { label: 'Reportes', value: reportList.length, sub: 'semanales', icon: <FileText className="w-3.5 h-3.5" /> },
        ].map((kpi) => (
          <div key={kpi.label} className="p-2.5 rounded-lg bg-zinc-850/40 border border-zinc-800/50">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
              {kpi.icon}
              <span>{kpi.label}</span>
            </div>
            <div className="text-xl font-bold text-zinc-200">{kpi.value}</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Sub-navegación */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/50 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-all cursor-pointer border-b-2 ${
              subTab === tab.id
                ? 'border-zinc-300 text-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
              subTab === tab.id ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800/60 text-zinc-500'
            }`}>{tab.count}</span>
          </button>
        ))}
        <button
          onClick={loadAll}
          className="ml-auto flex items-center gap-1.5 px-2 py-2 text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* === TAB: LEADS === */}
      {subTab === 'leads' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            {(['all', 'new', 'contacted'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setLeadFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  leadFilter === f
                    ? 'bg-zinc-700/60 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'new' ? 'Nuevos' : 'Contactados'}
                <span className="ml-1 text-zinc-600">
                  ({f === 'all' ? leadList.length : f === 'new' ? newLeadsCount : contactedLeadsCount})
                </span>
              </button>
            ))}
          </div>

          {sortedLeads.length > 0 ? (
            <div className="space-y-1.5">
              {sortedLeads.map((lead) => (
                <div key={lead.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-850/30 border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
                  {/* Score */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${scoreColor(lead.score)} bg-zinc-800/60`}>
                    {lead.score}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200 text-[13px] truncate">{lead.handle}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(lead.status)}`} />
                      {lead.dance_style && lead.dance_style !== 'general' && (
                        <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                          <Music className="w-2.5 h-2.5" /> {lead.dance_style}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 mt-0.5">
                      <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {lead.event_posts_count} eventos</span>
                      {lead.total_likes != null && <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {lead.total_likes}</span>}
                      {lead.location_mentioned && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {lead.location_mentioned}</span>}
                    </div>
                    {lead.outreach_message && (
                      <div className="mt-1 flex items-start gap-1 text-[10px] text-zinc-500">
                        <MessageCircle className="w-2.5 h-2.5 shrink-0 mt-0.5 text-zinc-600" />
                        <span className="truncate">"{lead.outreach_message}"</span>
                      </div>
                    )}
                  </div>

                  {/* Link externo */}
                  {lead.handle && (
                    <a
                      href={`https://instagram.com/${lead.handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-md bg-zinc-800/40 hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 flex items-center justify-center shrink-0 transition-colors"
                      title="Ver Instagram"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-zinc-600">Sin leads. Ejecutá el Cazador.</p>
          )}
        </div>
      )}

      {/* === TAB: EVENTOS === */}
      {subTab === 'events' && (
        <div className="space-y-1.5">
          {events.length > 0 ? (
            events.map((evt, i) => (
              <div key={evt.id || i} className="p-2.5 rounded-lg bg-zinc-850/30 border border-zinc-800/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-medium text-zinc-200 truncate">{evt.title || 'Sin título'}</h4>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-600 mt-1">
                      {evt.organizer_instagram && <span>{evt.organizer_instagram}</span>}
                      {evt.venue_name && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {evt.venue_name}</span>}
                      {evt.genre_family && <span className="flex items-center gap-0.5"><Music className="w-2.5 h-2.5" /> {evt.genre_family}</span>}
                    </div>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${statusDot(evt.status)}`} />
                </div>
                {evt.start_time && (
                  <div className="text-[10px] text-zinc-600 mt-1 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {evt.start_time.slice(0, 10)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-xs text-zinc-600">Sin eventos. Ejecutá el Radar.</p>
          )}
        </div>
      )}

      {/* === TAB: BORRADORES === */}
      {subTab === 'drafts' && (
        <div className="space-y-1.5">
          {draftList.length > 0 ? (
            draftList.map((draft) => (
              <div key={draft.key} className="p-2.5 rounded-lg bg-zinc-850/30 border border-zinc-800/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-medium text-zinc-200 truncate">{draft.title || 'Sin título'}</h4>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-600 mt-1">
                      {draft.source_account && <span>{draft.source_account}</span>}
                      {draft.venue_name && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {draft.venue_name}</span>}
                    </div>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${statusDot(draft.status)}`} />
                </div>
                {draft.notification_message && (
                  <div className="mt-1.5 flex items-start gap-1 text-[10px] text-zinc-500">
                    <Send className="w-2.5 h-2.5 shrink-0 mt-0.5 text-zinc-600" />
                    <span className="truncate">"{draft.notification_message}"</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-xs text-zinc-600">Sin borradores. La Auto-Detección los crea cuando encuentra flyers nuevos.</p>
          )}
        </div>
      )}

      {/* === TAB: REPORTES === */}
      {subTab === 'reports' && (
        <div className="space-y-2.5">
          {reportList.length > 0 ? (
            reportList.map((rep) => {
              const s = rep.stats || {};
              const genreEntries = s.genres ? Object.entries(s.genres) : [];
              return (
                <div key={rep.key} className="p-3.5 rounded-lg bg-zinc-850/30 border border-zinc-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-medium text-zinc-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" />
                      {rep.organizer}
                    </h4>
                    <span className="text-[10px] text-zinc-600">{rep.week_start} → {rep.week_end}</span>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { icon: <Calendar className="w-3 h-3" />, v: s.total_events || 0, l: 'Eventos' },
                      { icon: <CheckCircle className="w-3 h-3" />, v: s.published || 0, l: 'Publicados' },
                      { icon: <Clock className="w-3 h-3" />, v: s.pending || 0, l: 'Pendientes' },
                      { icon: <Eye className="w-3 h-3" />, v: s.total_views || 0, l: 'Views' },
                      { icon: <MousePointerClick className="w-3 h-3" />, v: s.total_clicks || 0, l: 'Clicks' },
                      { icon: <Ticket className="w-3 h-3" />, v: s.total_tickets_sold || 0, l: 'Entradas' },
                    ].map((m, idx) => (
                      <div key={idx} className="p-1.5 rounded-md bg-zinc-800/40 border border-zinc-800/30 text-center">
                        <div className="text-zinc-600 flex justify-center mb-0.5">{m.icon}</div>
                        <div className="text-sm font-bold text-zinc-200">{m.v}</div>
                        <div className="text-[8px] text-zinc-600">{m.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Géneros */}
                  {genreEntries.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {genreEntries.map(([g, c]) => (
                        <span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-800/40 text-zinc-400 border border-zinc-800/30">
                          {g}: {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Sugerencias */}
                  {rep.suggestions && rep.suggestions.length > 0 && (
                    <div className="space-y-1">
                      {rep.suggestions.map((sug: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px] text-zinc-500">
                          <TrendingUp className="w-2.5 h-2.5 shrink-0 mt-0.5 text-zinc-600" />
                          <span>{sug}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-xs text-zinc-600">Sin reportes. Se generan cada lunes a las 9 AM.</p>
          )}
        </div>
      )}
    </div>
  );
};
