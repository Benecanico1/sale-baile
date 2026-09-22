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
} from 'lucide-react';
import { BotResults } from './BotResults';

interface BotConfig {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  confirm?: boolean;
}

const BOTS: BotConfig[] = [
  { id: 'radar', name: 'Radar', desc: 'Scrapear Instagram y publicar eventos', icon: <Radar className="w-5 h-5" />, color: 'purple' },
  { id: 'cazador', name: 'Cazador', desc: 'Buscar organizadores nuevos por hashtags', icon: <Target className="w-5 h-5" />, color: 'amber' },
  { id: 'outreach', name: 'Outreach (Generar)', desc: 'Generar DMs sin enviar (modo seguro)', icon: <PenTool className="w-5 h-5" />, color: 'blue' },
  { id: 'outreach_send', name: 'Outreach (Enviar)', desc: 'Enviar DMs REALES por Instagram', icon: <Send className="w-5 h-5" />, color: 'red', confirm: true },
  { id: 'reportes', name: 'Reportes Semanales', desc: 'Métricas + sugerencias de mejora con IA', icon: <FileText className="w-5 h-5" />, color: 'emerald' },
  { id: 'autodeteccion', name: 'Auto-Detección', desc: 'Detectar flyers nuevos y crear borradores', icon: <Search className="w-5 h-5" />, color: 'cyan' },
  { id: 'contenido', name: 'Contenido', desc: 'Generar posts de redes sociales', icon: <PenTool className="w-5 h-5" />, color: 'pink' },
  { id: 'estratega', name: 'Estratega', desc: 'Analizar mercado y competencia', icon: <TrendingUp className="w-5 h-5" />, color: 'indigo' },
  { id: 'investigador', name: 'Investigador', desc: 'Buscar tecnologías nuevas', icon: <Microscope className="w-5 h-5" />, color: 'teal' },
  { id: 'revisor', name: 'Revisor', desc: 'Revisar código del proyecto', icon: <Bug className="w-5 h-5" />, color: 'rose' },
];

const colorClasses: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40', ring: 'ring-purple-500/30' },
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40', ring: 'ring-amber-500/30' },
  blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40', ring: 'ring-blue-500/30' },
  red: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40', ring: 'ring-rose-500/30' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', ring: 'ring-emerald-500/30' },
  cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40', ring: 'ring-cyan-500/30' },
  pink: { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/40', ring: 'ring-pink-500/30' },
  indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/40', ring: 'ring-indigo-500/30' },
  teal: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/40', ring: 'ring-teal-500/30' },
  rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40', ring: 'ring-rose-500/30' },
};

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
      if (resp.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
    setCheckingServer(false);
  };

  // Verificar al montar
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
        setOutput('⏱️ Timeout: el bot tardó demasiado. Puede seguir corriendo en el servidor.\n\nPara bots que scrapean Instagram (Radar, Cazador, Auto-Detección), puede tardar varios minutos.');
      } else {
        setOutput(`ℹ️ Ejecución manual no disponible desde el navegador\n\nLos bots ya corren automáticamente en la VPS (24/7):\n• Cazador: cada día a las 3 AM\n• Radar: cada día a las 6 AM\n• Auto-Detección: cada 6 horas\n• Reportes: cada lunes a las 9 AM\n\nPara ejecución manual, usá el acceso directo en tu PC:\n  doble clic en sale-baile-bots.bat\n\nLos resultados aparecen abajo en "Resultados de los Bots".`);
      }
      setHasError(false);
    }

    setRunningBot(null);
  };

  return (
    <div className="space-y-5">
      {/* Header del panel de bots */}
      <div className="bg-gradient-to-br from-dark-900 via-[#131722] to-dark-950 p-5 rounded-3xl border border-dark-750 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-dance-crimson/30 to-dance-amber/20 border border-dance-coral/40 flex items-center justify-center text-dance-coral">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
              Panel de Bots IA
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
              Ejecutá los bots con un clic. Los resultados se guardan en Firebase automáticamente.
              </p>
            </div>
          </div>

          {/* Estado del servidor */}
          <div className="flex items-center gap-2">
            <button
              onClick={checkServer}
              disabled={checkingServer}
              className="px-3 py-2 rounded-xl bg-dark-850 border border-dark-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingServer ? 'animate-spin' : ''}`} />
              <span>
                {checkingServer ? 'Verificando...' :
                 serverStatus === 'online' ? '🟢 Servidor online' :
                 serverStatus === 'offline' ? '🔴 Servidor offline' :
                 '⚪ Estado desconocido'}
              </span>
            </button>
          </div>
        </div>

        {/* Aviso si el servidor está offline */}
        {serverStatus === 'offline' && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-bold text-emerald-300">✅ Los bots ya corren automáticamente en la VPS (24/7)</p>
              <p className="text-emerald-200/80">
                No necesitás hacer nada manual — los bots se ejecutan solos:<br/>
                • 🎯 Cazador: cada día a las 3 AM<br/>
                • 📊 Radar: cada día a las 6 AM<br/>
                • 🔍 Auto-Detección: cada 6 horas<br/>
                • 📄 Reportes: cada lunes a las 9 AM<br/>
                Los resultados aparecen abajo en "Resultados de los Bots" (se auto-actualiza cada 30s).
              </p>
              <p className="text-emerald-200/60 mt-1.5">
                Los botones de ejecución manual están disponibles cuando el dashboard local está corriendo (opcional).<br/>
                Para ejecución manual: <strong className="text-emerald-200">doble clic en sale-baile-bots.bat</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid de bots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {BOTS.map((bot) => {
          const c = colorClasses[bot.color] || colorClasses.purple;
          const isRunning = runningBot === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => runBot(bot)}
              disabled={isRunning}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 ${c.bg} ${c.border} hover:scale-[1.02] active:scale-95 ${
                isRunning ? `ring-2 ${c.ring} animate-pulse` : ''
              } disabled:cursor-wait`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} border ${c.border} flex items-center justify-center`}>
                  {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : bot.icon}
                </div>
                {bot.confirm && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-black border border-rose-500/40">
                    ⚠️ ENVÍO REAL
                  </span>
                )}
                {isRunning && (
                  <span className="text-[10px] font-bold text-amber-400 animate-pulse">Ejecutando...</span>
                )}
              </div>
              <div>
                <div className={`text-sm font-black ${c.text}`}>{bot.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{bot.desc}</div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-auto">
                {isRunning ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                <span>{isRunning ? 'Procesando...' : 'Ejecutar'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Output / Terminal */}
      {output && (
        <div className="bg-dark-950 border border-dark-750 rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-dark-900 border-b border-dark-750">
            <div className="flex items-center gap-2">
              {hasError ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs font-black text-slate-300">
                {hasError ? 'Output con errores' : 'Output del bot'}
              </span>
            </div>
            <button
              onClick={() => { setOutput(''); setHasError(false); }}
              className="text-xs text-slate-500 hover:text-slate-300 font-bold cursor-pointer"
            >
              Limpiar
            </button>
          </div>
          <div className="p-4 max-h-[400px] overflow-y-auto">
            <pre className={`text-xs font-mono whitespace-pre-wrap ${hasError ? 'text-rose-300' : 'text-slate-300'}`}>
              {output}
            </pre>
          </div>
        </div>
      )}

      {/* Información de Firebase */}
      <div className="bg-dark-900 border border-dark-750 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-300">
          <FileText className="w-4 h-4 text-dance-coral" />
          <span>¿Dónde se guardan los resultados?</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-6">
          <div>📊 <strong className="text-slate-300">Radar:</strong> events.json</div>
          <div>🎯 <strong className="text-slate-300">Cazador:</strong> leads.json</div>
          <div>📨 <strong className="text-slate-300">Outreach:</strong> leads.json (status: contacted)</div>
          <div>📅 <strong className="text-slate-300">Reportes:</strong> weekly_reports.json</div>
          <div>🔍 <strong className="text-slate-300">Auto-Detección:</strong> auto_drafts.json</div>
          <div>💬 <strong className="text-slate-300">WhatsApp:</strong> whatsapp_logs.json</div>
        </div>
        <p className="text-[10px] text-slate-500 pt-1">
          Todos los bots escriben en Firebase RTDB: salebaile.web.app → sale_baile/
        </p>
      </div>

      {/* === RESULTADOS DE LOS BOTS === */}
      <BotResults />
    </div>
  );
};
