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
  { id: 'radar', name: 'Radar', desc: 'Scrapear Instagram y publicar eventos', icon: <Radar className="w-4 h-4" /> },
  { id: 'cazador', name: 'Cazador', desc: 'Buscar organizadores nuevos por hashtags', icon: <Target className="w-4 h-4" /> },
  { id: 'outreach', name: 'Outreach', desc: 'Generar DMs sin enviar (modo seguro)', icon: <PenTool className="w-4 h-4" /> },
  { id: 'outreach_send', name: 'Envío DM', desc: 'Enviar DMs reales por Instagram', icon: <Send className="w-4 h-4" />, confirm: true },
  { id: 'reportes', name: 'Reportes', desc: 'Métricas + sugerencias de mejora con IA', icon: <FileText className="w-4 h-4" /> },
  { id: 'autodeteccion', name: 'Auto-Detect', desc: 'Detectar flyers nuevos y crear borradores', icon: <Search className="w-4 h-4" /> },
  { id: 'contenido', name: 'Contenido', desc: 'Generar posts de redes sociales', icon: <PenTool className="w-4 h-4" /> },
  { id: 'estratega', name: 'Estratega', desc: 'Analizar mercado y competencia', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'investigador', name: 'Investigador', desc: 'Buscar tecnologías nuevas', icon: <Microscope className="w-4 h-4" /> },
  { id: 'revisor', name: 'Revisor', desc: 'Revisar código del proyecto', icon: <Bug className="w-4 h-4" /> },
];

const DASHBOARD_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8585'
  : 'https://salebaile.duckdns.org';

export const BotsPanel: React.FC = () => {
  const [runningBot, setRunningBot] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [checkingServer, setCheckingServer] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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
        setOutput(`ℹ️ No se pudo conectar con la VPS.\n\nLos bots ya corren automáticamente en la VPS (24/7):\n• Cazador: 3 AM · Radar: 6 AM\n• Auto-Detección: cada 6h · Reportes: lunes 9 AM\n\nPara ejecución manual: doble clic en sale-baile-bots.bat\n\nLos resultados aparecen abajo en "Resultados de los Bots".`);
      }
      setHasError(false);
    }

    abortRef.current = null;
    setRunningBot(null);
  };

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
          <span>Los bots corren automáticamente en la VPS 24/7. Ejecución manual: <strong className="text-zinc-300">sale-baile-bots.bat</strong></span>
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
