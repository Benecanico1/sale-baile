import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Copy, Download, Loader2, Send, Trash2, Users } from 'lucide-react';
import { fetchLeads, type BotLead } from '../../lib/botResults';

type CampaignLead = { handle: string; name?: string; bio?: string; message: string; approved: boolean };
const STORAGE_KEY = 'sale-baile-outreach-campaign-v1';
const DASHBOARD_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8585' : 'https://salebaile.duckdns.org';

const cleanHandle = (value: string) => value.trim().replace(/^@/, '').replace(/\s/g, '');
const makeDraft = (lead: CampaignLead, goal: string) => {
  const name = lead.name?.trim() || '';
  const normalizedGoal = goal.toLowerCase();
  const greeting = name ? `¡Hola ${name}!` : '¡Hola!';
  let invitation = 'Nos encantaría invitarte a conocer la plataforma y descubrir los próximos eventos de baile cerca tuyo.';
  if (normalizedGoal.includes('descarg') || normalizedGoal.includes('seguir')) invitation = 'Nos encantaría que nos sigas y pruebes la app para descubrir eventos de baile cerca tuyo.';
  else if (normalizedGoal.includes('public') || normalizedGoal.includes('evento')) invitation = 'Con Sale Baile podés publicar tus eventos y llegar a más personas que aman bailar.';
  else if (normalizedGoal.includes('oferta') || normalizedGoal.includes('descuento')) invitation = 'Tenemos una propuesta especial para que conozcas Sale Baile y aproveches sus beneficios.';
  return `${greeting} ✨ Somos Sale Baile, una comunidad para descubrir y publicar eventos de baile. ${invitation} ¿Te gustaría conocerla? 💃`;
};

export const OutreachCampaignPanel: React.FC = () => {
  const [leads, setLeads] = useState<CampaignLead[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [source, setSource] = useState('');
  const [goal, setGoal] = useState('Invitar a seguir Sale Baile y conocer la plataforma.');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState('');
  const [sent, setSent] = useState(0);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(leads)), [leads]);
  const current = leads[0];
  const pending = useMemo(() => leads.filter((lead) => !lead.approved).length, [leads]);

  const addHandles = (values: string[]) => {
    const currentHandles = new Set(leads.map((lead) => lead.handle.toLowerCase()));
    const additions = values.map(cleanHandle).filter(Boolean).filter((handle) => !currentHandles.has(handle.toLowerCase()))
      .map((handle) => ({ handle, message: '', approved: false }));
    if (!additions.length) return setNotice('No hay cuentas nuevas para agregar.');
    setLeads((previous) => [...previous, ...additions]);
    setNotice(`${additions.length} lead${additions.length === 1 ? '' : 's'} agregado${additions.length === 1 ? '' : 's'} a la campaña.`);
  };

  const importFirebaseLeads = async () => {
    setLoading(true); setNotice('');
    try {
      const data = await fetchLeads();
      const fresh = Object.values(data).filter((lead: BotLead) => lead.status === 'new').map((lead) => lead.handle);
      addHandles(fresh);
    } catch { setNotice('No se pudieron cargar los leads nuevos.'); }
    finally { setLoading(false); }
  };

  const createDraft = async () => {
    if (!current) return;
    setGenerating(true); setNotice('Generando borrador con DeepSeek...');
    try {
      const token = sessionStorage.getItem('sale_baile_google_token');
      if (!token) throw new Error('Iniciá sesión con Google usando una cuenta administradora para usar DeepSeek.');
      const response = await fetch(`${DASHBOARD_URL}/api/outreach/draft`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ handle: current.handle, goal }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo generar el borrador.');
      setLeads((previous) => previous.map((lead, index) => index === 0 ? { ...lead, message: data.message, approved: false } : lead));
      setNotice('Borrador creado con DeepSeek. Revísalo antes de abrir Instagram.');
    } catch (error) {
      setLeads((previous) => previous.map((lead, index) => index === 0 ? { ...lead, message: makeDraft(lead, goal), approved: false } : lead));
      setNotice(error instanceof Error ? `${error.message} Se creó un borrador local revisable.` : 'Se creó un borrador local revisable.');
    } finally { setGenerating(false); }
  };

  const copyAndOpen = async () => {
    if (!current?.approved || !current.message) return;
    await navigator.clipboard.writeText(current.message);
    window.open(`https://www.instagram.com/${current.handle}/`, '_blank', 'noopener,noreferrer');
    setNotice('Borrador copiado. En Instagram, abre Mensaje, pégalo y presiona Enviar tú mismo.');
  };

  const confirmManualSend = () => {
    if (!current?.approved) return;
    setLeads((previous) => previous.slice(1));
    setSent((value) => value + 1);
    setNotice(leads.length > 1 ? `Registro guardado. Sigue @${leads[1].handle}.` : 'Campaña terminada.');
  };

  const exportCampaign = () => {
    const content = JSON.stringify({ exported_at: new Date().toISOString(), sent, pending: leads }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sale-baile-campana.json'; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div><h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><Send className="w-4 h-4 text-violet-400" /> Campañas de contacto</h2><p className="text-[11px] text-zinc-500 mt-1">Borradores con revisión y envío manual desde tu Instagram.</p></div>
      <div className="flex gap-2 text-[10px]"><span className="px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">En cola: {leads.length}</span><span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Registrados: {sent}</span></div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-900/45 p-4 space-y-3">
        <div className="flex items-center gap-2"><Users className="w-4 h-4 text-amber-400" /><h3 className="text-xs font-bold text-zinc-200">1. Cargar destinatarios</h3></div>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} placeholder="@cuenta_uno, @cuenta_dos o una por línea" className="w-full min-h-22 rounded-lg bg-zinc-950/60 border border-zinc-700/60 p-3 text-xs text-zinc-200 outline-none focus:border-violet-500/70" />
        <div className="flex flex-wrap gap-2"><button onClick={() => { addHandles(source.split(/[\n,;]+/)); setSource(''); }} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer">Agregar lista</button><button onClick={importFirebaseLeads} disabled={loading} className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer disabled:opacity-50">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Importar leads nuevos'}</button></div>
        <div className="max-h-50 overflow-y-auto space-y-1 pt-1">{leads.length ? leads.map((lead, index) => <div key={lead.handle} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${index === 0 ? 'bg-violet-500/10 border border-violet-500/25 text-violet-200' : 'bg-zinc-950/40 text-zinc-500'}`}><span>{index + 1}. @{lead.handle}</span><button onClick={() => setLeads((previous) => previous.filter((item) => item.handle !== lead.handle))} className="text-zinc-500 hover:text-rose-400 cursor-pointer" aria-label="Quitar lead"><Trash2 className="w-3.5 h-3.5" /></button></div>) : <p className="text-xs text-zinc-600 py-4 text-center">Todavía no hay destinatarios.</p>}</div>
      </section>

      <section className="rounded-xl border border-zinc-700/50 bg-zinc-900/45 p-4 space-y-3">
        <div className="flex items-center gap-2"><ChevronRight className="w-4 h-4 text-emerald-400" /><h3 className="text-xs font-bold text-zinc-200">2. Revisar y enviar manualmente</h3></div>
        {current ? <>
          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3 flex items-center justify-between"><div><p className="text-[10px] text-zinc-500 uppercase">Destinatario actual</p><p className="text-sm font-bold text-zinc-100">@{current.handle}</p></div><span className="text-[10px] text-zinc-500">{pending} sin aprobar</span></div>
          <label className="block text-[11px] font-medium text-zinc-400">Qué quieres comunicar<textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-1.5 w-full min-h-16 rounded-lg bg-zinc-950/60 border border-zinc-700/60 p-2.5 text-xs text-zinc-200 outline-none focus:border-violet-500/70" /></label>
          <button onClick={createDraft} disabled={generating} className="px-3 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-xs font-bold cursor-pointer disabled:opacity-50">{generating ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}Crear borrador con DeepSeek</button>
          <textarea value={current.message} onChange={(event) => setLeads((previous) => previous.map((lead, index) => index === 0 ? { ...lead, message: event.target.value, approved: false } : lead))} placeholder="El borrador aparecerá aquí para tu revisión." className="w-full min-h-28 rounded-lg bg-zinc-950/60 border border-zinc-700/60 p-3 text-xs text-zinc-200 outline-none focus:border-violet-500/70" />
          <div className="flex flex-wrap gap-2"><button disabled={!current.message} onClick={() => setLeads((previous) => previous.map((lead, index) => index === 0 ? { ...lead, approved: true } : lead))} className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-bold cursor-pointer disabled:opacity-40"><Check className="w-3.5 h-3.5 inline mr-1" />Aprobar</button><button disabled={!current.approved} onClick={copyAndOpen} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40"><Copy className="w-3.5 h-3.5 inline mr-1" />Copiar y abrir Instagram</button><button disabled={!current.approved} onClick={confirmManualSend} className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-xs font-bold cursor-pointer disabled:opacity-40">Confirmar envío y siguiente</button></div>
        </> : <div className="py-14 text-center text-xs text-zinc-600">Carga o importa leads para iniciar la campaña.</div>}
      </section>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"><p className="text-[11px] text-zinc-400">{notice || 'El mensaje solo se envía cuando tú lo confirmas en Instagram.'}</p><button onClick={exportCampaign} className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"><Download className="w-3.5 h-3.5 inline mr-1" />Exportar registro</button></div>
  </div>;
};
