import React, { useState, useRef } from 'react';
import {
  Bot,
  Radar,
  Target,
  Send,
  FileText,
  Search,
  PenTool,
  TrendingUp,
  Microscope,
  Bug,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  Zap,
  AlertTriangle,
  X,
  Play,
  Square,
} from 'lucide-react';
import { BotResults } from './BotResults';

interface BotConfig {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  confirm?: boolean;
}

const BOTS: BotConfig[] = [
  { id: 'cazador_legs', name: 'Cazador de Legs', desc: 'Regla: legs de BA + CABA | Solo eventos salsa y bachata', icon: <Target className="w-4 h-4" />, confirm: false },
];

const DASHBOARD_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8585'
  : 'https://salebaile.duckdns.org';

const SEQUENCE = [
  { id: 'radar', label: 'Radar' },
  { id: 'cazador', label: 'Cazador' },
  { id: 'autodeteccion', label: 'Auto-Detección' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'estratega', label: 'Estratega' },
  { id: 'investigador', label: 'Investigador' },
  { id: 'outreach', label: 'Outreach (Generar)' },
  { id: 'outreach_send', label: 'Outreach (Enviar)' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'revisor', label: 'Revisor' },
];

export const BotsPanel: React.FC = () => {
  const [runningBot, setRunningBot] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [checkingServer, setCheckingServer] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Estado de secuencia
  const [seqRunning, setSeqRunning] = useState(false);
  const [seqState, setSeqState] = useState<{running:boolean;current_step:string|null;completed:string[];failed:string[];started_at:string|null;finished_at:string|null}>({running:false,current_step:null,completed:[],failed:[],started_at:null,finished_at:null});
  const seqIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkServer = async () => {
    setCheckingServer(true);
    try {
      const resp = await fetch(`${DASHBOARD_URL}/api/bots`, { signal: AbortSignal.timeout(3000) });
      setServerStatus(resp.ok ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
    setCheckingServer(false);
  };

  React.useEffect(() => {
    checkServer();
  }, []);

  const cancelBot = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setRunningBot(null);
    setOutput((prev) => prev + '\n\n⏹️ Ejecución cancelada por el usuario.');
  };

  const runBot = async (bot: BotConfig) => {
    if (bot.confirm) {
      if (!window.confirm(`"${bot.name}" envía mensajes reales a organizadores. ¿Continuar?`)) {
        return;
      }
    }

    // Cancelar cualquier ejecución anterior
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setRunningBot(bot.id);
    setOutput(`▶ Ejecutando: ${bot.name}...\n`);
    setHasError(false);

    try {
      const resp = await fetch(`${DASHBOARD_URL}/run?id=${bot.id}`, {
        signal: controller.signal,
      });
      const data = await resp.json();
      setOutput(data.output || 'Sin output');
      setHasError(data.error || false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setOutput((prev) => prev + '\n\n⏹️ Cancelado.');
      } else {
        setOutput(`⚠️ DM de Instagram: bloqueo real — Apify instagram-scraper no acepta resultsType: "messages"; ese actor solo lee datos (posts, detalles, comentarios, reels). Para enviar DMs reales necesitaríamos: (a) usar una cuenta de Instagram conectada con cookies, o (b) cambiar a WhatsApp como canal de contacto.\n\nLos bots ya corren automáticamente en la VPS (24/7):\n• Cazador: 3 AM · Radar: 6 AM\n• Auto-Detección: cada 6h · Reportes: lunes 9 AM\n\nLos resultados (leads, eventos, borradores, reportes) aparecen abajo en "Resultados de los Bots".`);
      }
      setHasError(false);
    }

    abortRef.current = null;
    setRunningBot(null);
  };

  // Funciones de secuencia
  const fetchSeqStatus = async () => {
    try {
      const resp = await fetch(`${DASHBOARD_URL}/api/sequence/status`, { signal: AbortSignal.timeout(5000) });
      if (resp.ok) { const s = await resp.json(); setSeqState(s); setSeqRunning(s.running); }
    } catch {}
  };

  const startSequence = async () => {
    try {
      const resp = await fetch(`${DASHBOARD_URL}/api/sequence/start`, { method: 'POST', signal: AbortSignal.timeout(5000) });
      if (resp.ok) { const d = await resp.json(); if (d.ok) { setSeqRunning(true); pollSequence(); } }
    } catch {}
  };

  const stopSequence = async () => {
    try {
      const resp = await fetch(`${DASHBOARD_URL}/api/sequence/stop`, { method: 'POST', signal: AbortSignal.timeout(5000) });
      if (resp.ok) { setSeqRunning(false); if (seqIntervalRef.current) clearInterval(seqIntervalRef.current); }
    } catch {}
  };

  const pollSequence = () => {
    if (seqIntervalRef.current) clearInterval(seqIntervalRef.current);
    seqIntervalRef.current = setInterval(fetchSeqStatus, 2000) as any;
    fetchSeqStatus();
  };

  React.useEffect(() => {
    return () => { if (seqIntervalRef.current) clearInterval(seqIntervalRef.current); };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Bots IA</h2>
            <p className="text-[10px] text-zinc-500">Automatización de eventos</p>
          </div>
        </div>

        <button
          onClick={checkServer}
          disabled={checkingServer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${checkingServer ? 'animate-spin' : ''}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          {checkingServer ? 'Verificando...' : serverStatus === 'online' ? 'VPS Online' : 'VPS Offline'}
        </button>
      </div>

      {/* VPS offline aviso */}
      {serverStatus === 'offline' && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40 text-[11px] text-zinc-400">
          <Server className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
          <span>Los bots corren automáticamente en la VPS 24/7. Ejecución manual: <strong className="text-zinc-300">sale-baile-bots.bat</strong><br /><span className="text-amber-400 font-medium">Nota: DMs por Instagram bloqueados — Apify instagram-scraper no envía mensajes (solo lee datos). Alternativas: (a) Instagram con cookies conectada, (b) WhatsApp.</span></span>
        </div>
      )}

      {/* Botones de bots — fila horizontal sin scroll */}
      <div className="flex flex-wrap gap-1.5">
        {BOTS.map((bot) => {
          const isRunning = runningBot === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => runBot(bot)}
              disabled={isRunning}
              title={bot.desc}
              className={`group flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all cursor-pointer ${
                isRunning
                  ? 'bg-zinc-700/60 border-zinc-500/50 text-zinc-200'
                  : 'bg-zinc-850/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/60 hover:bg-zinc-800/50'
              } disabled:cursor-wait`}
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : bot.icon}
              <span>{bot.name}</span>
              {bot.confirm && <AlertTriangle className="w-2.5 h-2.5 text-amber-500/60" />}
            </button>
          );
        })}
      </div>

      {/* Secuencia completa */}
            <div className="bg-zinc-850/40 border border-zinc-700/40 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-[12px] font-bold text-zinc-200">Secuencia Completa</span>
                  <span className="text-[10px] text-zinc-600">10 bots en orden</span>
                </div>
                <div className="flex items-center gap-2">
                  {seqRunning ? (
                    <button onClick={stopSequence} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-900/30 border border-rose-700/30 text-rose-400 text-[11px] font-medium hover:bg-rose-900/50 transition-all cursor-pointer">
                      <Square className="w-3 h-3" /> Detener
                    </button>
                  ) : (
                    <button onClick={startSequence} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-emerald-400 text-[11px] font-medium hover:bg-emerald-900/50 transition-all cursor-pointer">
                      <Play className="w-3 h-3" /> Iniciar
                    </button>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-500" style={{ width: `${SEQUENCE.length > 0 ? Math.round(((seqState.completed.length + seqState.failed.length) / SEQUENCE.length) * 100) : 0}%` }} />
              </div>
              {/* Steps */}
              <div className="flex flex-wrap gap-1.5">
                {SEQUENCE.map((step) => {
                  const isDone = seqState.completed.includes(step.id);
                  const isFail = seqState.failed.includes(step.id);
                  const isCurrent = seqState.current_step === step.id && seqRunning;
                  return (
                    <span key={step.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                      isDone ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400' :
                      isFail ? 'bg-rose-950/30 border-rose-800/40 text-rose-400' :
                      isCurrent ? 'bg-amber-950/30 border-amber-800/40 text-amber-400' :
                      'bg-zinc-800/40 border-zinc-700/40 text-zinc-500'
                    }`}>
                      {isDone ? '✅' : isFail ? '❌' : isCurrent ? '⏳' : '⏸️'} {step.label}
                    </span>
                  );
                })}
              </div>
              {seqState.started_at && !seqRunning && !seqState.finished_at && (
                <div className="text-[10px] text-zinc-600">Detenido — completó {seqState.completed.length}/10</div>
              )}
              {seqState.finished_at && (
                <div className="text-[10px] text-emerald-500">✅ Secuencia completada: {seqState.completed.length}/10 bots</div>
              )}
            </div>

            {/* Output + Cancelar */}
      {(output || runningBot) && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-850/60 border-b border-zinc-800/40">
            <div className="flex items-center gap-2">
              {hasError ? (
                <XCircle className="w-3.5 h-3.5 text-rose-400/70" />
              ) : runningBot ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70" />
              )}
              <span className="text-[11px] font-medium text-zinc-400">
                {runningBot ? `Ejecutando ${runningBot}...` : 'Output'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {runningBot && (
                <button
                  onClick={cancelBot}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-900/30 border border-rose-700/30 text-rose-400 text-[11px] font-medium hover:bg-rose-900/50 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  Cancelar
                </button>
              )}
              {!runningBot && (
                <button
                  onClick={() => { setOutput(''); setHasError(false); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 font-medium cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
          <div className="p-3.5 max-h-[400px] overflow-y-auto">
            <pre className={`text-[11px] font-mono whitespace-pre-wrap leading-relaxed ${hasError ? 'text-rose-300/80' : 'text-zinc-400'}`}>
              {output}
            </pre>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-center gap-1.5 px-1 text-[10px] text-zinc-600">
        <Zap className="w-2.5 h-2.5" />
        <span>Resultados guardados en Firebase → sale_baile/</span>
      </div>

      {/* Resultados */}
      <BotResults />
    </div>
  );
};
