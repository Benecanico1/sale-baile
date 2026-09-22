import React, { useState } from 'react';
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
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  Zap,
  AlertTriangle,
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
  { id: 'radar', name: 'Radar', desc: 'Scrapear Instagram y publicar eventos', icon: <Radar className="w-5 h-5" /> },
  { id: 'cazador', name: 'Cazador', desc: 'Buscar organizadores nuevos por hashtags', icon: <Target className="w-5 h-5" /> },
  { id: 'outreach', name: 'Outreach', desc: 'Generar DMs sin enviar (modo seguro)', icon: <PenTool className="w-5 h-5" /> },
  { id: 'outreach_send', name: 'Envío DM', desc: 'Enviar DMs reales por Instagram', icon: <Send className="w-5 h-5" />, confirm: true },
  { id: 'reportes', name: 'Reportes', desc: 'Métricas + sugerencias de mejora con IA', icon: <FileText className="w-5 h-5" /> },
  { id: 'autodeteccion', name: 'Auto-Detect', desc: 'Detectar flyers nuevos y crear borradores', icon: <Search className="w-5 h-5" /> },
  { id: 'contenido', name: 'Contenido', desc: 'Generar posts de redes sociales', icon: <PenTool className="w-5 h-5" /> },
  { id: 'estratega', name: 'Estratega', desc: 'Analizar mercado y competencia', icon: <TrendingUp className="w-5 h-5" /> },
  { id: 'investigador', name: 'Investigador', desc: 'Buscar tecnologías nuevas', icon: <Microscope className="w-5 h-5" /> },
  { id: 'revisor', name: 'Revisor', desc: 'Revisar código del proyecto', icon: <Bug className="w-5 h-5" /> },
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

  const runBot = async (bot: BotConfig) => {
    if (bot.confirm) {
      if (!window.confirm(`⚠️ "${bot.name}" envía mensajes reales a organizadores. ¿Continuar?`)) {
        return;
      }
    }

    setRunningBot(bot.id);
    setOutput(`▶ Ejecutando: ${bot.name}...\n`);
    setHasError(false);

    try {
      const resp = await fetch(`${DASHBOARD_URL}/run?id=${bot.id}`, { signal: AbortSignal.timeout(600000) });
      const data = await resp.json();
      setOutput(data.output || 'Sin output');
      setHasError(data.error || false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setOutput('⏱️ Timeout: el bot tardó demasiado. Puede seguir corriendo en el servidor.');
      } else {
        setOutput(`ℹ️ Ejecución manual no disponible desde el navegador\n\nLos bots ya corren automáticamente en la VPS (24/7):\n• Cazador: cada día a las 3 AM\n• Radar: cada día a las 6 AM\n• Auto-Detección: cada 6 horas\n• Reportes: cada lunes a las 9 AM\n\nPara ejecución manual, usá el acceso directo en tu PC:\n  doble clic en sale-baile-bots.bat\n\nLos resultados aparecen abajo en "Resultados de los Bots".`);
      }
      setHasError(false);
    }

    setRunningBot(null);
  };

  return (
    <div className="space-y-5">
      {/* Header minimalista */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">Bots IA</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Automatización de eventos de baile</p>
          </div>
        </div>

        {/* Indicador de servidor */}
        <button
          onClick={checkServer}
          disabled={checkingServer}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${checkingServer ? 'animate-spin' : ''}`} />
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              serverStatus === 'online' ? 'bg-emerald-400' : serverStatus === 'offline' ? 'bg-zinc-600' : 'bg-zinc-600'
            }`} />
            {checkingServer ? 'Verificando...' :
             serverStatus === 'online' ? 'VPS Online' :
             serverStatus === 'offline' ? 'VPS Offline' : 'Verificando...'}
          </span>
        </button>
      </div>

      {/* Aviso VPS offline — discreto */}
      {serverStatus === 'offline' && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/40 text-[11px] text-zinc-400">
          <Server className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-zinc-300">Los bots ya corren automáticamente en la VPS (24/7)</p>
            <p className="text-zinc-500">
              Cazador 3 AM · Radar 6 AM · Auto-Detección cada 6h · Reportes lunes 9 AM.
              Los resultados aparecen abajo. Para ejecución manual: <strong className="text-zinc-400">sale-baile-bots.bat</strong>
            </p>
          </div>
        </div>
      )}

      {/* Grid de bots — minimalista */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {BOTS.map((bot) => {
          const isRunning = runningBot === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => runBot(bot)}
              disabled={isRunning}
              className={`group p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 ${
                isRunning
                  ? 'bg-zinc-800/80 border-zinc-600 ring-1 ring-zinc-500/30'
                  : 'bg-zinc-850/50 border-zinc-800/60 hover:border-zinc-600/60 hover:bg-zinc-800/50'
              } disabled:cursor-wait`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  isRunning
                    ? 'bg-zinc-700/60 text-zinc-200'
                    : 'bg-zinc-800/60 text-zinc-400 group-hover:text-zinc-200'
                }`}>
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : bot.icon}
                </div>
                {bot.confirm && (
                  <AlertTriangle className="w-3 h-3 text-amber-500/60" />
                )}
              </div>
              <div>
                <div className={`text-[13px] font-semibold ${isRunning ? 'text-zinc-200' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
                  {bot.name}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{bot.desc}</div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-auto">
                {isRunning ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Play className="w-2.5 h-2.5 group-hover:text-zinc-400" />
                )}
                <span className="group-hover:text-zinc-400">{isRunning ? 'Procesando' : 'Ejecutar'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Output / Terminal — discreto */}
      {output && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-850/60 border-b border-zinc-800/40">
            <div className="flex items-center gap-2">
              {hasError ? (
                <XCircle className="w-3.5 h-3.5 text-rose-400/70" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70" />
              )}
              <span className="text-[11px] font-medium text-zinc-400">Output</span>
            </div>
            <button
              onClick={() => { setOutput(''); setHasError(false); }}
              className="text-[11px] text-zinc-600 hover:text-zinc-300 font-medium cursor-pointer"
            >
              Limpiar
            </button>
          </div>
          <div className="p-3.5 max-h-[400px] overflow-y-auto">
            <pre className={`text-[11px] font-mono whitespace-pre-wrap leading-relaxed ${hasError ? 'text-rose-300/80' : 'text-zinc-400'}`}>
              {output}
            </pre>
          </div>
        </div>
      )}

      {/* Info de almacenamiento — minimalista */}
      <div className="flex items-center gap-2 px-1 text-[10px] text-zinc-600">
        <Zap className="w-3 h-3" />
        <span>Resultados guardados en Firebase RTDB → sale_baile/</span>
      </div>

      {/* === RESULTADOS DE LOS BOTS === */}
      <BotResults />
    </div>
  );
};
