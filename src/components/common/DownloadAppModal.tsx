import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownToLine,
  Smartphone,
  Apple,
  Share2,
  PlusSquare,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Download,
} from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>('android');
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Detectar automáticamente si el usuario navega desde un iPhone / iPad
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
      if (isIOS) {
        setActiveTab('ios');
      } else {
        setActiveTab('android');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#141316] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 my-auto max-h-[95vh]"
      >
        {/* Encabezado */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-dance-crimson/20 via-[#1c1b22] to-[#141316]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-oled-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg p-1 shrink-0">
              <img src="/branding/favicon_dark_512.png" alt="Sale Baile" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Descargar App Oficial</span>
              </h2>
              <p className="text-xs text-slate-400">
                Acceso directo a todos los eventos y pistas en tu teléfono
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Plataforma (Android vs iPhone) */}
        <div className="p-4 sm:p-6 pb-2 sm:pb-3 border-b border-white/5 bg-[#141316]">
          <div className="grid grid-cols-2 gap-2 p-1 bg-dark-950/80 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50 scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android (APK)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/50 scale-[1.01]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>iPhone / iOS</span>
            </button>
          </div>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          {/* ================= PESTAÑA ANDROID ================= */}
          {activeTab === 'android' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Botón Principal de Descarga */}
              <div className="p-4.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-dark-900 to-teal-950/30 border border-emerald-500/30 text-center space-y-3 shadow-lg">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <ArrowDownToLine className="w-7 h-7 animate-bounce" />
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Sale Baile para Android
                  </h3>
                  <p className="text-xs text-slate-300">
                    Archivo APK oficial • Versión 1.2.0 • Seguro y verificado (6.1 MB)
                  </p>
                </div>

                <a
                  href="/sale-baile.bin"
                  download="SaleBaile.apk"
                  onClick={() => setDownloadTriggered(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-slate-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Descargar Archivo APK Directo</span>
                </a>

                {downloadTriggered && (
                  <p className="text-[11px] text-emerald-300 font-medium animate-fadeIn">
                    ✓ La descarga ha comenzado. Si no inicia automáticamente, vuelve a presionar el botón verde arriba.
                  </p>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instalador oficial verificado y libre de virus</span>
                </div>
              </div>

              {/* Guía Paso a Paso para Instalar APK en Android */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  ¿Cómo instalar el APK en tu Android?
                </span>

                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-dark-950/70 border border-white/5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Descarga el archivo</h4>
                      <p className="text-[11px] text-slate-400">
                        Presiona el botón de descarga. Si tu navegador (Chrome o Samsung Internet) te avisa{' '}
                        <span className="text-slate-200 font-medium">"Este tipo de archivo puede ser dañino"</span>,{' '}
                        selecciona <strong className="text-emerald-400 font-bold">"Descargar de todos modos"</strong>{' '}
                        (es el aviso estándar de seguridad de Android para aplicaciones descargadas fuera de la Play Store).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-dark-950/70 border border-white/5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Abre el archivo descargado</h4>
                      <p className="text-[11px] text-slate-400">
                        Toca la notificación de descarga o busca <span className="font-mono text-slate-300">SaleBaile.apk</span> en tu carpeta de Descargas y presiona <strong className="text-white">Instalar</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-dark-950/70 border border-white/5 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Permite la instalación</h4>
                      <p className="text-[11px] text-slate-400">
                        Si tu teléfono te pide permiso para fuentes desconocidas, presiona <strong className="text-white">Configuración</strong> y activa la casilla <strong className="text-emerald-400 font-bold">"Permitir desde esta fuente"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>¡Listo! Ya tienes Sale Baile instalada como aplicación oficial en tu teléfono.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PESTAÑA IPHONE / IOS ================= */}
          {activeTab === 'ios' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Noticia Explicativa para iPhone */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-dark-900 to-indigo-950/30 border border-blue-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Apple className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Instalación en iPhone & iPad
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  En los dispositivos de Apple (iOS) no se utilizan archivos APK (son exclusivos de Android). Sin embargo, puedes instalar Sale Baile en <strong>5 segundos</strong> directamente desde <strong>Safari</strong> sin pasar por el App Store y sin ocupar espacio:
                </p>
              </div>

              {/* Pasos Ilustrados para Safari */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Pasos sencillos para agregar a tu iPhone:
                </span>

                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Abre esta web en Safari</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Asegúrate de estar en el navegador <strong>Safari</strong> de tu iPhone (si estás dentro de otra app como Instagram o WhatsApp, toca los tres puntos y elige "Abrir en Safari").
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-blue-500/20 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                        <span>2. Toca el botón Compartir</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        En la barra inferior de Safari, presiona el ícono del <strong className="text-blue-300 font-bold">cuadradito con una flecha hacia arriba (⎋ / Compartir)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-blue-500/20 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">
                        3. Selecciona "Agregar a pantalla de inicio"
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        En el menú desplegable, desliza hacia abajo y pulsa sobre <strong className="text-blue-300 font-bold">"Agregar a pantalla de inicio"</strong> (o "Añadir a pantalla de inicio" 📲).
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-dark-950/80 border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Toca "Agregar"</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        En la esquina superior derecha, toca <strong className="text-white">"Agregar"</strong> (o "Añadir").
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-center gap-3 text-blue-200 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>¡Listo! La app quedará en tu pantalla de inicio con su icono oficial y abrirá a pantalla completa sin barras.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enlace para compartir con otro dispositivo o amigos */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">¿Estás en tu PC o quieres pasarle el link a alguien?</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar enlace de la web'}</span>
            </button>
          </div>
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#141316] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Sale Baile • Siempre actualizado
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
