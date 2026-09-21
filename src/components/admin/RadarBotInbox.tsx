import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { EventItem } from '../../types';
import type { RadarDraftItem, MonitoredAccount } from '../../lib/radarBot';
import {
  getRadarDrafts,
  saveRadarDrafts,
  getMonitoredAccounts,
  saveMonitoredAccounts,
  DEFAULT_MONITORED_ACCOUNTS,
  analyzeFlyerWithAI,
  fetchRealInstagramPost,
  scanInstagramAccount,
  createFallbackFlyerSvg,
  getGeminiApiKey,
  saveGeminiApiKey,
} from '../../lib/radarBot';
import { processImageFile } from '../../lib/mediaProcessor';
import {
  Bot,
  Sparkles,
  Link,
  Upload,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Edit3,
  Calendar,
  MapPin,
  DollarSign,
  Music,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Settings,
} from 'lucide-react';

interface RadarBotInboxProps {
  onPublishEvent: (eventData: Partial<EventItem>) => void;
}

export const RadarBotInbox: React.FC<RadarBotInboxProps> = ({ onPublishEvent }) => {
  const [drafts, setDrafts] = useState<RadarDraftItem[]>(() => getRadarDrafts());
  const [monitoredAccounts, setMonitoredAccounts] = useState<MonitoredAccount[]>(() =>
    getMonitoredAccounts()
  );

  // Estados de carga e importación
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [instagramInputUrl, setInstagramInputUrl] = useState('');
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [validityFilter, setValidityFilter] = useState<'upcoming' | 'all' | 'expired'>('upcoming');

  // Modal de edición antes de publicar
  const [editingDraft, setEditingDraft] = useState<RadarDraftItem | null>(null);

  // Modal de configuración de cuentas
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newAccountHandle, setNewAccountHandle] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountCategory, setNewAccountCategory] = useState<
    'bachata' | 'salsa' | 'rock' | 'cena_show' | 'teatro' | 'concierto' | 'salon' | 'general'
  >('bachata');
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => getGeminiApiKey());
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');

  useEffect(() => {
    saveRadarDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    saveMonitoredAccounts(monitoredAccounts);
  }, [monitoredAccounts]);

  const pendingDrafts = drafts.filter((d) => d.status === 'pending');
  const upcomingDrafts = pendingDrafts.filter((d) => d.validity_status !== 'expired');
  const expiredDrafts = pendingDrafts.filter((d) => d.validity_status === 'expired');

  const displayedDrafts = validityFilter === 'upcoming'
    ? upcomingDrafts
    : validityFilter === 'expired'
    ? expiredDrafts
    : pendingDrafts;

  const showNotification = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // 1. Analizar URL de Instagram
  const handleAnalyzeInstagramUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramInputUrl.trim()) return;

    setIsParsingUrl(true);
    setScanMessage('Extrayendo flyer y pie de foto real desde Instagram...');

    try {
      const { imageUrl, caption, author, url } = await fetchRealInstagramPost(instagramInputUrl.trim());

      setScanMessage('Analizando flyer, fecha y vigencia con IA...');
      const newDraft = await analyzeFlyerWithAI({
        instagramUrl: url || instagramInputUrl.trim(),
        sourceAccount: author,
        rawText: caption,
        imageUrl: imageUrl,
      });

      setDrafts((prev) => [newDraft, ...prev.filter(d => d.source_url !== newDraft.source_url)]);
      setInstagramInputUrl('');
      
      if (newDraft.validity_status === 'expired') {
        showNotification(`⚠️ Se detectó flyer pero la fecha ya expiró: ${newDraft.validity_reason}`);
      } else {
        showNotification('✅ ¡Flyer vigente y datos de Instagram extraídos con éxito!');
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || '❌ Error al analizar el enlace de Instagram.');
    } finally {
      setIsParsingUrl(false);
      setScanMessage(null);
    }
  };

  // 2. Subir flyer directo para análisis con IA
  const handleFlyerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFlyer(true);
    try {
      const processed = await processImageFile(file);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const newDraft = await analyzeFlyerWithAI({
        imageUrl: processed.url,
        rawText: `Flyer: ${cleanFileName}`,
      });

      setDrafts((prev) => [newDraft, ...prev]);
      showNotification('✅ Flyer analizado con éxito por la IA.');
    } catch (err: any) {
      showNotification('❌ Error al procesar imagen de flyer.');
    } finally {
      setIsUploadingFlyer(false);
      e.target.value = '';
    }
  };

  // 3. Escaneo inteligente del radar sobre cuentas de Bachata y organizadores
  const handleRunRadarScan = async () => {
    const accountsToScan = monitoredAccounts.filter((a) => a.is_active);

    if (accountsToScan.length === 0) {
      showNotification('⚠️ No tienes cuentas activas en tu lista de monitoreo. Agrega una cuenta en Configuración (⚙️).');
      return;
    }

    setIsScanning(true);

    try {
      const newDrafts: RadarDraftItem[] = [];
      const errorMessages: string[] = [];

      for (let i = 0; i < accountsToScan.length; i++) {
        const acc = accountsToScan[i];
        setScanMessage(`📡 Inspeccionando perfil de Instagram ${acc.handle} (${i + 1}/${accountsToScan.length})...`);
        try {
          const draft = await scanInstagramAccount(acc);
          newDrafts.push(draft);
        } catch (accErr: any) {
          console.warn(`[RadarBot] Error escaneando ${acc.handle}:`, accErr);
          errorMessages.push(`${acc.handle}: ${accErr?.message || 'Error al conectar'}`);
        }
      }

      if (newDrafts.length > 0) {
        setDrafts((prev) => {
          const scannedHandles = new Set(newDrafts.map((d) => d.source_account));
          const cleanedPrev = prev.filter((d) => !scannedHandles.has(d.source_account));
          return [...newDrafts, ...cleanedPrev];
        });

        showNotification(
          `📡 ¡Radar completado! Se extrajeron ${newDrafts.length} flyer(s) reales desde Instagram.`
        );
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }

      if (errorMessages.length > 0) {
        setTimeout(() => {
          showNotification(`⚠️ Advertencia: ${errorMessages.join(', ')}`);
        }, 3000);
      }
    } catch (e: any) {
      console.error(e);
      showNotification('❌ Ocurrió un inconveniente al escanear los perfiles de Instagram.');
    } finally {
      setIsScanning(false);
      setScanMessage(null);
    }
  };

  // Limpiar eventos vencidos con un solo clic
  const handleClearExpired = () => {
    setDrafts((prev) => prev.filter((d) => d.validity_status !== 'expired'));
    showNotification('🧹 Se eliminaron todos los flyers con fechas vencidas.');
  };

  // 4. Publicar evento directamente en la cartelera
  const handleApproveAndPublish = (draft: RadarDraftItem) => {
    onPublishEvent({
      ...draft.extracted_data,
      flyer_url: draft.flyer_url,
      gallery: [
        {
          id: `med-${Date.now()}`,
          type: 'image',
          url: draft.flyer_url,
          thumbnail_url: draft.flyer_url,
        },
      ],
      status: 'publicado',
    });

    setDrafts((prev) =>
      prev.map((d) => (d.id === draft.id ? { ...d, status: 'published' } : d))
    );

    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    showNotification(
      `🚀 ¡"${draft.extracted_data.title}" fue publicado con éxito en la cartelera de Sale Baile!`
    );
  };

  // 5. Descartar borrador
  const handleDismissDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    showNotification('🗑️ Flyer descartado del radar.');
  };

  // 6. Agregar cuenta monitoreada
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountHandle.trim()) return;

    const cleanHandle = newAccountHandle.startsWith('@')
      ? newAccountHandle.trim()
      : `@${newAccountHandle.trim()}`;
    const account: MonitoredAccount = {
      id: `acc-${Date.now()}`,
      handle: cleanHandle,
      name: newAccountName.trim() || cleanHandle,
      category_tag: newAccountCategory,
      is_active: true,
    };

    setMonitoredAccounts((prev) => [...prev, account]);
    setNewAccountHandle('');
    setNewAccountName('');
    showNotification(`✅ Cuenta ${cleanHandle} añadida al radar de monitoreo.`);
  };

  const handleRemoveAccount = (id: string) => {
    setMonitoredAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  // Restaurar cuentas iniciales de Bachata
  const handleResetToDefaultAccounts = () => {
    setMonitoredAccounts(DEFAULT_MONITORED_ACCOUNTS);
    showNotification('✨ Se restauró la lista completa de cuentas de Bachata y organizadores.');
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal del Radar Bot */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/70 via-[#141226] to-[#121624] border-2 border-purple-500/40 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-purple-500/30 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Radar Bot de Instagram & Extracción IA
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Visión Artificial Activa
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                Rastrea publicaciones de Instagram, sube flyers o pega enlaces. La IA extrae automáticamente
                el <strong>título, fecha, hora, dirección y precios</strong> para republicar en 1 solo clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleRunRadarScan}
              disabled={isScanning}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Escanear Radar'}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 bg-[#171a29] hover:bg-[#202538] text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
              title="Configurar Cuentas Monitoreadas"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Herramientas Rápidas: Pegar Enlace y Subir Flyer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/10">
          {/* Pegar Link de Instagram */}
          <form
            onSubmit={handleAnalyzeInstagramUrl}
            className="md:col-span-2 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Link className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={instagramInputUrl}
                onChange={(e) => setInstagramInputUrl(e.target.value)}
                placeholder="Pegar @usuario de Instagram o enlace (ej: @bachataroom.ba o instagram.com/p/...)"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#0e111a] border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>
            <button
              type="submit"
              disabled={isParsingUrl || !instagramInputUrl.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-40 cursor-pointer shadow-md"
            >
              {isParsingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Analizar</span>
            </button>
          </form>

          {/* Subir Flyer Directo */}
          <label className="px-4 py-2.5 bg-[#171a29] hover:bg-[#22283d] text-slate-200 border border-white/15 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
            <Upload className="w-4 h-4 text-dance-coral" />
            <span>{isUploadingFlyer ? 'Analizando Flyer...' : 'Subir Flyer para Extraer IA'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFlyerFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {scanMessage && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-xs text-purple-300 font-bold flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}

        {feedbackNotice && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        )}
      </div>

      {/* Bandeja de Flyers Capturados por el Radar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-black text-white">Bandeja de Flyers para Republicar</h4>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-extrabold border border-purple-500/30">
              {displayedDrafts.length} {displayedDrafts.length === 1 ? 'flyer' : 'flyers'}
            </span>
          </div>

          {/* Filtros de Vigencia y Limpieza */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-[#141824] p-1 rounded-2xl border border-white/10 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setValidityFilter('upcoming')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  validityFilter === 'upcoming'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟢 Solo Próximos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-black">
                  {upcomingDrafts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setValidityFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  validityFilter === 'all'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Todos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-black">
                  {pendingDrafts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setValidityFilter('expired')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  validityFilter === 'expired'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔴 Vencidos</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-black">
                  {expiredDrafts.length}
                </span>
              </button>
            </div>

            {expiredDrafts.length > 0 && (
              <button
                type="button"
                onClick={handleClearExpired}
                className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Eliminar todos los flyers con fechas ya pasadas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar Vencidos ({expiredDrafts.length})</span>
                <span className="sm:hidden">Limpiar ({expiredDrafts.length})</span>
              </button>
            )}

            {pendingDrafts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDrafts([]);
                  showNotification('🧹 Buzón del Radar vaciado.');
                }}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Vaciar todo el buzón del radar"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Todo</span>
              </button>
            )}
          </div>
        </div>

        {displayedDrafts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0e111a] border border-white/10 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
              <Bot className="w-7 h-7" />
            </div>
            <h5 className="text-base font-bold text-white">
              {validityFilter === 'upcoming'
                ? 'No hay flyers con fechas próximas en este momento'
                : validityFilter === 'expired'
                ? '¡Excelente! No hay flyers vencidos en la bandeja'
                : 'No hay flyers pendientes en la bandeja'}
            </h5>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Pega un enlace de Instagram, sube una foto de flyer o presiona <strong>"Escanear Radar"</strong> para que el bot detecte nuevos eventos de Bachata.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedDrafts.map((draft) => {
              const data = draft.extracted_data;
              const isExpired = draft.validity_status === 'expired';
              const isUpcoming = draft.validity_status === 'upcoming';
              return (
                <div
                  key={draft.id}
                  className={`rounded-3xl bg-[#0e111a] border overflow-hidden shadow-xl transition-all flex flex-col justify-between ${
                    isExpired
                      ? 'border-rose-500/40 bg-rose-950/10 opacity-90'
                      : 'border-white/10 hover:border-purple-500/40'
                  }`}
                >
                  <div className="p-4 sm:p-5 space-y-3.5">
                    {/* Header de la Tarjeta */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-purple-500/15 text-purple-300 text-[10px] font-black border border-purple-500/30 flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          <span>{draft.source_account || 'Instagram Bot'}</span>
                        </span>

                        {/* Badge de Vigencia Calculada */}
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center gap-1 ${
                            isUpcoming
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                              : isExpired
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          <span>{isUpcoming ? '🟢' : isExpired ? '🔴' : '🟡'}</span>
                          <span>{draft.validity_reason || (isUpcoming ? 'Evento Próximo' : 'Fecha por revisar')}</span>
                        </span>
                      </div>

                      {draft.source_url && (
                        <a
                          href={draft.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-white text-xs flex items-center gap-1 shrink-0"
                          title="Ver publicación original"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Flyer + Datos detectados */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Imagen del Flyer */}
                      <div className="w-full sm:w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-black shrink-0 border border-white/10 relative group">
                        <img
                          src={draft.flyer_url || createFallbackFlyerSvg(data.title || 'Bachata Social', data.venue_name, data.genre_family)}
                          alt={data.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = createFallbackFlyerSvg(
                              data.title || 'Bachata Social',
                              data.venue_name || 'Buenos Aires',
                              data.genre_family || 'Bachata'
                            );
                          }}
                        />
                      </div>

                      {/* Datos estructurados por la IA */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        <h5 className="text-base font-black text-white leading-snug line-clamp-2">
                          {data.title}
                        </h5>

                        <div className="space-y-1.5 text-xs text-slate-300">
                          <div className={`flex items-center gap-1.5 font-bold ${
                            isUpcoming ? 'text-emerald-300' : isExpired ? 'text-rose-400 line-through' : 'text-purple-300'
                          }`}>
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {data.start_time
                                ? new Date(data.start_time).toLocaleDateString('es-AR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })
                                : 'Fecha a convenir'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-dance-coral shrink-0" />
                            <span className="truncate">
                              {data.venue_name} • {data.address}, {data.city}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 font-bold">
                            <DollarSign className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            <span className={data.is_free ? 'text-emerald-400' : data.price ? 'text-amber-300' : 'text-slate-400 font-semibold'}>
                              {data.is_free
                                ? 'Entrada Libre & Gratuita'
                                : data.price
                                ? `Precio: $${data.price.toLocaleString('es-AR')}`
                                : 'Precio: A consultar'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="capitalize">
                              {data.genre_family} • {data.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resumen del texto original de Instagram */}
                    {draft.raw_caption && (
                      <div className="p-2.5 bg-[#121622] rounded-xl text-[11px] text-slate-400 italic line-clamp-2 border border-white/5">
                        "{draft.raw_caption}"
                      </div>
                    )}
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="p-3 sm:px-5 sm:py-3.5 bg-[#121622] border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleDismissDraft(draft.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                      title="Descartar flyer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingDraft(draft)}
                        className="px-3 py-2 bg-[#171a29] hover:bg-[#202538] text-slate-200 font-bold text-xs rounded-xl border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleApproveAndPublish(draft)}
                        className={`px-4 py-2 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                          isExpired
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-slate-950 shadow-emerald-500/20'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isExpired ? 'Republicar (Fecha Pasada)' : 'Aprobar y Republicar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Configuración de Cuentas Monitoreadas */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]">
            <div className="px-6 py-5 border-b border-white/10 bg-[#121622] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Cuentas de Instagram en Radar
                  </h3>
                  <p className="text-xs text-slate-400">
                    Perfiles que el bot monitorea para encontrar nuevos flyers.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Configuración de IA de Visión Artificial */}
              <div className="p-4 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-purple-900/20 border border-purple-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-black text-white">Visión Artificial Inteligente (Google Gemini)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                    100% Gratis
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Permite a la IA <strong>"mirar" el flyer gráfico con ojos humanos</strong> para extraer con perfección el título real, organizador, lugar, calle y precio exacto sin inventar nada.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder={geminiApiKey ? '••••••••••••••••••••••••••••••••' : 'Pega tu clave gratuita de Gemini (AIzaSy...)'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#0e111a] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!geminiKeyInput.trim()) return;
                      saveGeminiApiKey(geminiKeyInput.trim());
                      setGeminiApiKey(geminiKeyInput.trim());
                      setGeminiKeyInput('');
                      showNotification('✅ Clave de Gemini Vision activada correctamente.');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Estado: {geminiApiKey ? '🟢 Conectado con Visión AI de Google' : '⚪ Usando OCR local'}</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline font-bold flex items-center gap-1"
                  >
                    <span>Obtener clave gratis en Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Formulario Agregar Nueva Cuenta */}
              <form onSubmit={handleAddAccount} className="space-y-3 p-4 bg-[#121622] rounded-2xl border border-white/10">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  + Agregar Nueva Cuenta al Radar
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Usuario de Instagram (@)</label>
                    <input
                      type="text"
                      required
                      value={newAccountHandle}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.trim() && !val.trim().startsWith('@') && !val.includes('instagram.com/')) {
                          val = `@${val.trim()}`;
                        }
                        setNewAccountHandle(val);
                      }}
                      placeholder="@bachata_palermo"
                      className="w-full px-3.5 py-2 bg-[#0e111a] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nombre / Productora</label>
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Ej: Bachata Room BA"
                      className="w-full px-3.5 py-2 bg-[#0e111a] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoría Principal</label>
                  <select
                    value={newAccountCategory}
                    onChange={(e) => setNewAccountCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0e111a] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="bachata">💃 Bachata</option>
                    <option value="salsa">🎺 Salsa</option>
                    <option value="rock">🎸 Rock & Roll</option>
                    <option value="cena_show">🍽️ Cena Show</option>
                    <option value="teatro">🎭 Teatro & Varieté</option>
                    <option value="concierto">🎙️ Conciertos</option>
                    <option value="salon">🏢 Salones de Fiesta</option>
                    <option value="general">🌟 General</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir al Radar</span>
                </button>
              </form>

              {/* Lista de Cuentas Activas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Cuentas Activas ({monitoredAccounts.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetToDefaultAccounts}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restaurar Lista de Bachata</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {monitoredAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 bg-[#121622] rounded-xl border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs">
                          📷
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{acc.name}</div>
                          <div className="text-[11px] text-purple-400 font-mono">{acc.handle}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-300 text-[10px] uppercase font-bold border border-white/10">
                          {acc.category_tag}
                        </span>
                        <button
                          onClick={() => handleRemoveAccount(acc.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Eliminar cuenta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido de Edición de Borrador */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#0e111a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]">
            <div className="px-6 py-5 border-b border-white/10 bg-[#121622] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white">Editar Datos del Flyer Extraído</h3>
              </div>
              <button
                onClick={() => setEditingDraft(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Título del Evento</label>
                <input
                  type="text"
                  value={editingDraft.extracted_data.title || ''}
                  onChange={(e) =>
                    setEditingDraft({
                      ...editingDraft,
                      extracted_data: { ...editingDraft.extracted_data, title: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lugar / Boliche</label>
                  <input
                    type="text"
                    value={editingDraft.extracted_data.venue_name || ''}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        extracted_data: { ...editingDraft.extracted_data, venue_name: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={editingDraft.extracted_data.address || ''}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        extracted_data: { ...editingDraft.extracted_data, address: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Precio Puerta (ARS) - dejar vacío para "Consultar"</label>
                  <input
                    type="number"
                    placeholder="A consultar"
                    value={editingDraft.extracted_data.price ?? ''}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        extracted_data: {
                          ...editingDraft.extracted_data,
                          price: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Precio Anticipada (ARS)</label>
                  <input
                    type="number"
                    placeholder="Opcional"
                    value={editingDraft.extracted_data.advance_ticket_price ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : undefined;
                      setEditingDraft({
                        ...editingDraft,
                        extracted_data: {
                          ...editingDraft.extracted_data,
                          advance_ticket_price: val,
                          admin_resale_price: val ? Math.round(val * 0.80) : undefined,
                          admin_commission_rate: val ? `${Math.round(val * 0.20).toLocaleString('es-AR')} ARS (20%)` : undefined,
                        },
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-[#121622] border border-white/15 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="flex-1 py-2.5 bg-[#121622] text-slate-300 text-xs font-bold rounded-xl border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApproveAndPublish(editingDraft);
                    setEditingDraft(null);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black rounded-xl shadow-md"
                >
                  Guardar y Republicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
