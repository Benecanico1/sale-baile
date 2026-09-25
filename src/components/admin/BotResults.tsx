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
  Copy,
  Check,
  AlertCircle,
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

type SubTab = 'leads' | 'events' | 'drafts' | 'reports' | 'dm_created' | 'dm_sent' | 'dm_failed' | 'leads_new';

const dmStatusLabel = (status?: string) => {
  switch (status) {
    case 'enviado': return { label: 'Enviado', color: 'text-emerald-400', bg: 'bg-emerald-950/30' };
    case 'generado': return { label: 'Generado', color: 'text-amber-400', bg: 'bg-amber-950/30' };
    case 'fallo': return { label: 'Falló', color: 'text-rose-400', bg: 'bg-rose-950/30' };
    default: return { label: 'Pendiente', color: 'text-zinc-500', bg: 'bg-zinc-800/40' };
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'new': return { label: 'Nuevo', color: 'text-blue-400' };
    case 'contacted': return { label: 'Contactado', color: 'text-amber-400' };
    case 'joined': return { label: 'Sumado', color: 'text-emerald-400' };
    case 'declined': return { label: 'Rechazado', color: 'text-rose-400' };
    case 'pending': return { label: 'Pendiente', color: 'text-amber-400' };
    case 'published': return { label: 'Publicado', color: 'text-emerald-400' };
    default: return { label: status, color: 'text-zinc-500' };
  }
};

export const BotResults: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('leads');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Record<string, BotLead>>({});
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [reports, setReports] = useState<Record<string, BotReport>>({});
  const [drafts, setDrafts] = useState<Record<string, BotDraft>>({});
  const [leadFilter, setLeadFilter] = useState<'all' | 'new' | 'contacted'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testHandle, setTestHandle] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testStatus, setTestStatus] = useState('');

  const [auditTab, setAuditTab] = useState<SubTab | null>(null);

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
  const createdDMs = leadList.filter((l: any) => Boolean(l.dm_message || l.generated_dm)).length;
  const sentDMs = leadList.filter((l: any) => l.dm_status === 'sent' || l.status === 'contacted').length;
  const failedDMs = leadList.filter((l: any) => l.dm_status === 'failed').length;
  const reportList = Object.entries(reports).map(([k, v]) => ({ key: k, ...v }));
  const draftList = Object.entries(drafts).map(([k, v]) => ({ key: k, ...v }));

  const copyDM = async (key: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  const scoreColor = (score: number) => {
    if (score >= 60) return 'text-emerald-400';
    if (score >= 35) return 'text-amber-400';
    return 'text-zinc-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        <span className="ml-2 text-xs text-zinc-500">Cargando...</span>
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
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Leads', value: leadList.length, sub: `${newLeadsCount} nuevos`, icon: <Target className="w-3.5 h-3.5" />, tab: 'leads' as SubTab },
          { label: 'Eventos', value: events.length, sub: 'en Firebase', icon: <Calendar className="w-3.5 h-3.5" />, tab: 'events' as SubTab },
          { label: 'Borradores', value: draftList.length, sub: 'auto-detect', icon: <Search className="w-3.5 h-3.5" />, tab: 'drafts' as SubTab },
          { label: 'Reportes', value: reportList.length, sub: 'semanales', icon: <FileText className="w-3.5 h-3.5" />, tab: 'reports' as SubTab },
        ].map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => setAuditTab(auditTab === kpi.tab ? null : kpi.tab)}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer w-full ${
              auditTab === kpi.tab
                ? 'bg-zinc-800/60 border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
                : 'bg-zinc-850/40 border-zinc-800/50 hover:border-zinc-600/40 hover:bg-zinc-800/30'
            }`}
          >
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
              {kpi.icon}
              <span>{kpi.label}</span>
            </div>
            <div className="text-xl font-bold text-zinc-200">{kpi.value}</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{kpi.sub}</div>
          </button>
        ))}
      </div>

      {/* Estadísticas Outreach (mensajes DM) */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Mensajes creados', value: createdDMs, sub: 'DM generados', icon: <Send className="w-3.5 h-3.5" />, tab: 'dm_created' as any },
          { label: 'DM enviados', value: sentDMs, sub: 'Confirmados hoy', icon: <CheckCircle className="w-3.5 h-3.5" />, tab: 'dm_sent' as any },
          { label: 'Fallidos', value: failedDMs, sub: 'Error / límite', icon: <AlertCircle className="w-3.5 h-3.5" />, tab: 'dm_failed' as any },
          { label: 'Leads nuevos', value: newLeadsCount, sub: 'Estado new', icon: <Target className="w-3.5 h-3.5" />, tab: 'leads_new' as any },
        ].map((kpi) => (
          <button
            key={kpi.label}
            onClick={() => setAuditTab(auditTab === kpi.tab ? null : kpi.tab)}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer w-full ${
              auditTab === kpi.tab
                ? 'bg-zinc-800/60 border-amber-500/40 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
                : 'bg-zinc-850/40 border-zinc-800/50 hover:border-zinc-600/40 hover:bg-zinc-800/30'
            }`}
          >
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-1">
              {kpi.icon}
              <span>{kpi.label}</span>
            </div>
            <div className="text-xl font-bold text-zinc-200">{kpi.value}</div>
            <div className="text-[9px] text-zinc-600 mt-0.5">{kpi.sub}</div>
          </button>
        ))}
      </div>

      {/* Botón: Enviar los mensajes creados */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-zinc-600">Los bots corren automáticamente cada 6h en el servidor. Este botón solo inicia una ejecución manual extra.</span>
        <button
          onClick={async () => {
            console.log('Botón presionado - createdDMs:', createdDMs);
            if (!window.confirm('¿Ejecutar envío manual adicional? Esto borrará los leads enviados.')) return;
            try {
              const endpoint = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8585' : 'https://salebaile.duckdns.org';
              console.log('Llamando a:', endpoint + '/run?id=outreach_send');
              const resp = await fetch(`${endpoint}/run?id=outreach_send`, { method: 'POST' });
              console.log('Respuesta:', resp.status);
              if (resp.ok) { alert('Envío manual iniciado en el servidor. Continuará aunque cierres la página.'); loadAll(); }
              else { alert('Error. Código: ' + resp.status); }
            } catch (e: any) { console.error('Error:', e); alert('No se pudo conectar al servidor. El bot seguirá corriendo por cron.'); }
          }}
          className="px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium hover:bg-amber-600/40 transition-all cursor-pointer"
        >
          Enviar los {createdDMs} mensajes creados
        </button>
      </div>

      {/* === PRUEBA MANUAL DM === */}
      <div className="p-3 rounded-xl bg-zinc-850/30 border border-zinc-700/30 space-y-2">
        <h4 className="text-[11px] font-bold text-amber-300 uppercase">Enviar DM de prueba</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="@usuario_instagram"
            value={testHandle}
            onChange={e => setTestHandle(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
          <input
            type="text"
            placeholder="Mensaje (opcional)"
            value={testMessage}
            onChange={e => setTestMessage(e.target.value)}
            className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          onClick={async () => {
            if (!testHandle) { alert('Ingresá un @handle de Instagram.'); return; }
            setTestStatus('Enviando...');
            try {
              const endpoint = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8585' : 'https://salebaile.duckdns.org';
              const resp = await fetch(`${endpoint}/run?id=outreach_send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handle: testHandle, message: testMessage || `Hola ${testHandle}, te invitamos a publicar en Sale Baile.` })
              });
              const result = await resp.text();
              setTestStatus(resp.ok ? '✅ Enviado: ' + result.slice(0, 60) : '❌ Error: ' + resp.status);
              alert('Respuesta del servidor: ' + (resp.ok ? 'Enviado' : resp.status));
            } catch (e: any) {
              setTestStatus('❌ Error de conexión');
              console.error('Error:', e);
              alert('No se pudo conectar al bot de envío. El bot sigue corriendo por cron.');
            }
          }}
          className="w-full py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-600/40 transition-all cursor-pointer"
        >
          Enviar DM de prueba
        </button>
        {testStatus && <div className="text-[10px] text-zinc-400 font-medium">{testStatus}</div>}
      </div>



      {/* === MODO AUDITORÍA (click en KPI) === */}
      {auditTab && (
        <div className="rounded-lg border border-amber-500/30 bg-zinc-900/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-bold text-amber-300 uppercase tracking-wide">Auditoría: {auditTab}</h4>
            <button onClick={() => setAuditTab(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer">Cerrar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {auditTab === 'leads' && leadList.map((l: any) => (
              <div key={l.key || l.handle} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="flex justify-between"><span className="font-bold text-zinc-200">{l.handle}</span><span className="text-amber-400">Score {l.score}</span></div>
                <div className="text-zinc-500 mt-0.5">{l.dance_style || 'baile'} · {l.event_posts_count} eventos · {l.status}</div>
                {l.outreach_message && <div className="text-zinc-400 mt-1 truncate">DM: {l.outreach_message}</div>}
              </div>
            ))}
            {auditTab === 'events' && events.map((e: any, i: number) => (
              <div key={e.id || i} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="font-bold text-zinc-200 truncate">{e.title || 'Sin título'}</div>
                <div className="text-zinc-500 mt-0.5">{e.status} · {e.genre_family || 'baile'} · {e.venue_name || '-'}</div>
              </div>
            ))}
            {auditTab === 'drafts' && draftList.map((d: any) => (
              <div key={d.key} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="font-bold text-zinc-200 truncate">{d.title || 'Sin título'}</div>
                <div className="text-zinc-500 mt-0.5">{d.status || 'pendiente'} · {d.source_account || '-'}</div>
              </div>
            ))}
            {auditTab === 'reports' && reportList.map((r: any, i: number) => (
              <div key={r.key || i} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="font-bold text-zinc-200 truncate">{r.organizer || 'Reporte'}</div>
                <div className="text-zinc-500 mt-0.5">{r.week_start || ''} → {r.week_end || ''} · {Object.values(r.stats || {}).join(', ')}</div>
              </div>
            ))}
            {auditTab === 'dm_created' && leadList.filter((l: any) => Boolean(l.dm_message || l.generated_dm)).map((l: any) => (
              <div key={l.key || l.handle} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="font-bold text-zinc-200">{l.handle}</div>
                <div className="text-zinc-500 mt-0.5 truncate">DM creado · Score {l.score}</div>
              </div>
            ))}
            {auditTab === 'dm_sent' && leadList.filter((l: any) => l.dm_status === 'sent' || l.status === 'contacted').map((l: any) => (
              <div key={l.key || l.handle} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="font-bold text-zinc-200">{l.handle}</div>
                <div className="text-zinc-500 mt-0.5">DM enviado · {l.status}</div>
              </div>
            ))}
            {auditTab === 'dm_failed' && leadList.filter((l: any) => l.dm_status === 'failed').map((l: any) => (
              <div key={l.key || l.handle} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="font-bold text-zinc-200">{l.handle}</div>
                <div className="text-zinc-500 mt-0.5">DM fallido · {l.dm_status}</div>
              </div>
            ))}
            {auditTab === 'leads_new' && leadList.filter((l: any) => l.status === 'new').map((l: any) => (
              <div key={l.key || l.handle} className="p-2 rounded bg-zinc-850/40 border border-zinc-800/30 text-[10px]">
                <div className="font-bold text-zinc-200">{l.handle}</div>
                <div className="text-zinc-500 mt-0.5">Nuevo · Score {l.score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tabs */}
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
          className="ml-auto flex items-center gap-1 px-2 py-2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* === TAB: LEADS === */}
      {subTab === 'leads' && (
        <div className="space-y-2.5">
          {/* Filtros */}
          <div className="flex items-center gap-1.5">
            {(['all', 'new', 'contacted'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setLeadFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  leadFilter === f ? 'bg-zinc-700/60 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'new' ? 'Nuevos' : 'Contactados'}
                <span className="ml-1 text-zinc-600">
                  ({f === 'all' ? leadList.length : f === 'new' ? newLeadsCount : contactedLeadsCount})
                </span>
              </button>
            ))}
          </div>

          {/* Lista de leads con DM + trazabilidad */}
          {sortedLeads.length > 0 ? (
            <div className="space-y-2">
              {sortedLeads.map((lead) => {
                const st = statusLabel(lead.status);
                const dm = dmStatusLabel(lead.dm_status);
                const handle = lead.handle?.replace('@', '');
                return (
                  <div key={lead.key} className="p-3 rounded-lg bg-zinc-850/30 border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
                    {/* Fila 1: score + handle + status + link */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${scoreColor(lead.score)} bg-zinc-800/60`}>
                        {lead.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-200 text-[13px] truncate">{lead.handle}</span>
                          <span className={`text-[10px] font-medium ${st.color}`}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-600 mt-0.5">
                          <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {lead.event_posts_count} eventos</span>
                          {lead.total_likes != null && <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {lead.total_likes}</span>}
                          {lead.dance_style && lead.dance_style !== 'general' && (
                            <span className="flex items-center gap-0.5"><Music className="w-2.5 h-2.5" /> {lead.dance_style}</span>
                          )}
                          {lead.location_mentioned && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {lead.location_mentioned}</span>}
                        </div>
                      </div>
                      {handle && (
                        <a
                          href={`https://instagram.com/${handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-md bg-zinc-800/40 hover:bg-zinc-700/40 text-zinc-500 hover:text-zinc-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                          title="Abrir Instagram"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Fila 2: DM + botón copiar + trazabilidad */}
                    {lead.outreach_message ? (
                      <div className="mt-2 flex items-start gap-2">
                        <div className="flex-1 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Send className="w-3 h-3 text-zinc-600" />
                              <span className="text-[10px] text-zinc-500 font-medium">DM</span>
                            </div>
                            {/* Trazabilidad del DM */}
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${dm.color} ${dm.bg}`}>
                                {dm.label}
                              </span>
                              {lead.last_contacted_at && (
                                <span className="text-[9px] text-zinc-600 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(lead.last_contacted_at).toLocaleDateString('es-AR')}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">"{lead.outreach_message}"</p>
                        </div>
                        <button
                          onClick={() => copyDM(lead.key, lead.outreach_message!)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer shrink-0 ${
                            copiedKey === lead.key
                              ? 'bg-emerald-700/30 text-emerald-300 border border-emerald-600/30'
                              : 'bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200'
                          }`}
                          title="Copiar DM"
                        >
                          {copiedKey === lead.key ? (
                            <><Check className="w-3 h-3" /> Copiado</>
                          ) : (
                            <><Copy className="w-3 h-3" /> Copiar</>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <AlertCircle className="w-3 h-3" />
                        <span>Sin DM. Ejecutá Outreach para generarlo.</span>
                      </div>
                    )}
                  </div>
                );
              })}
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
            events.map((evt, i) => {
              const st = statusLabel(evt.status);
              return (
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
                    <span className={`text-[10px] font-medium ${st.color} shrink-0`}>{st.label}</span>
                  </div>
                  {evt.start_time && (
                    <div className="text-[10px] text-zinc-600 mt-1 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> {evt.start_time.slice(0, 10)}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-xs text-zinc-600">Sin eventos. Ejecutá el Radar.</p>
          )}
        </div>
      )}

      {/* === TAB: BORRADORES === */}
      {subTab === 'drafts' && (
        <div className="space-y-1.5">
          {draftList.length > 0 ? (
            draftList.map((draft) => {
              const st = statusLabel(draft.status);
              return (
                <div key={draft.key} className="p-2.5 rounded-lg bg-zinc-850/30 border border-zinc-800/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-medium text-zinc-200 truncate">{draft.title || 'Sin título'}</h4>
                      <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-600 mt-1">
                        {draft.source_account && <span>{draft.source_account}</span>}
                        {draft.venue_name && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {draft.venue_name}</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium ${st.color} shrink-0`}>{st.label}</span>
                  </div>
                  {draft.notification_message && (
                    <div className="mt-1.5 flex items-start gap-1 text-[10px] text-zinc-500">
                      <Send className="w-2.5 h-2.5 shrink-0 mt-0.5 text-zinc-600" />
                      <span className="truncate">"{draft.notification_message}"</span>
                    </div>
                  )}
                </div>
              );
            })
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

                  {genreEntries.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {genreEntries.map(([g, c]) => (
                        <span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-zinc-800/40 text-zinc-400 border border-zinc-800/30">
                          {g}: {c}
                        </span>
                      ))}
                    </div>
                  )}

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
