import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Bot,
  Send,
  Sparkles,
  Mic,
  ArrowLeft,
  Search,
} from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  actions?: { label: string; tab?: string; query?: string }[];
  time: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab: _onNavigateTab,
}) => {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Determinar el perfil efectivo para el entrenamiento
  const effectiveRole =
    role === 'admin' || user?.email === 'jesushidalgo25@gmail.com'
      ? 'admin'
      : role === 'organizer'
      ? 'organizer'
      : user?.profile_type === 'profesor'
      ? 'profesor'
      : user?.profile_type === 'dueno_local'
      ? 'dueno_local'
      : 'bailarin';

  const getWelcomeMessage = (currentRole: string): string => {
    switch (currentRole) {
      case 'admin':
        return `🛡️ **¡Hola Administrador!** Soy la IA de soporte técnico de **Sale Baile**.\n\nEstoy entrenada para ayudarte a gestionar la plataforma: moderación y auto-publicación de eventos, habilitación de organizadores verificados, auditoría de entradas anticipadas en Mercado Pago y configuración de destacados en portada. ¿Qué deseas consultar hoy?`;
      case 'organizer':
        return `🎪 **¡Hola Organizador!** Soy la IA oficial de **Sale Baile**.\n\nComo organizador verificado, cuentas con **auto-publicación directa** sin esperas, configuración de cupos y **cierre programado de venta de anticipadas** (fecha y horario límite), y acceso al espacio de **Destacados** para maximizar la convocatoria de tu evento. ¿En qué te puedo asesorar?`;
      case 'profesor':
        return `🎓 **¡Hola Profesor / Academia!** Bienvenido al espacio de formación de **Sale Baile**.\n\nAhora puedes registrar tus **clases recurrentes semanales** con publicación inmediata sin necesidad de subir flyers cada semana. Además, puedes publicar talleres especiales y promocionarte ante la comunidad de baile. ¿Tienes dudas sobre cómo cargarlas?`;
      default:
        return `💃 **¡Hola Bailarín!** Soy tu asistente virtual de **Sale Baile**.\n\nTe ayudo a descubrir qué se baila hoy (Bachata, Salsa, Rock, Cachengue, Tango y más), cómo utilizar el **Radar de Baile** con mapa en vivo, cómo adquirir tus **entradas anticipadas con descuento y QR inmediato**, y guardar tus lugares favoritos. ¿Qué te gustaría saber?`;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: getWelcomeMessage(effectiveRole),
        time: now,
      },
    ]);
  }, [isOpen, effectiveRole]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAIResponse = (query: string, currentRole: string): ChatMessage => {
    const q = query.toLowerCase();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Respuestas sobre Anticipadas y Cierre de Horario
    if (q.includes('anticipada') || q.includes('cierre') || q.includes('horario') || q.includes('limite')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        time: now,
        text: `🎟️ **Venta y Cierre de Entradas Anticipadas**:\n\n1. **Para Organizadores**: Al crear o editar tu flyer, puedes fijar el **precio de preventa** y definir la **Fecha y Hora exacta de Cierre** (por ejemplo, hasta las 20:00 hs del mismo día).\n2. **Cierre Automático**: Al cumplirse la fecha y hora fijada, el sistema bloquea inmediatamente la venta de anticipadas e indica a los usuarios: *"Venta de anticipadas finalizada. Adquiere tu entrada directamente en puerta"*, protegiendo el valor en boletería.\n3. **Para Bailarines**: Compras tu anticipada más barata mediante transferencia a **salebaile.mp**, recibes tu comprobante y se emite tu credencial digital con código QR para ingresar sin demoras.`,
      };
    }

    // 2. Respuestas sobre Clases Recurrentes y Profesores
    if (q.includes('clase') || q.includes('profesor') || q.includes('semanal') || q.includes('recurrent')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        time: now,
        text: `🎓 **Clases Recurrentes Semanales para Profesores**:\n\n• **Publicación Única**: No tienes que subir un flyer cada semana. Al marcar la opción **"Clase fija semanal"**, tu clase se replica automáticamente en la agenda y cartelera todos los días que enseñes (ej: Lunes y Miércoles).\n• **Sin Aprobación Previa**: Las clases de profesores registrados se publican de forma inmediata en la plataforma.\n• **Filtros Clave**: Puedes especificar el ritmo (Bachata Sensual, Salsa Cubana, etc.), el nivel (Inicial, Intermedio, etc.) y la academia o salón donde se dicta.`,
      };
    }

    // 3. Respuestas sobre Auto-Publicación de Organizadores
    if (q.includes('autopublic') || q.includes('auto public') || q.includes('publicar') || q.includes('verificado') || q.includes('moderacion')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        time: now,
        text: `⚡ **Auto-Publicación Inmediata de Flyers**:\n\n• Si tu cuenta ya fue **aprobada y verificada por el Administrador**, no tienes que esperar revisiones. Cada evento que subas se publica automáticamente al instante en la cartelera general.\n• Si aún eres organizador nuevo, tu primera solicitud se revisa en cuestión de minutos para comprobar que los datos del local y horarios sean correctos.\n• Recuerda que siempre puedes guardar borradores antes de lanzarlos al público.`,
      };
    }

    // 4. Respuestas sobre Destacados y Monetización
    if (q.includes('destacad') || q.includes('portada') || q.includes('pagar') || q.includes('precio') || q.includes('3500') || q.includes('costo')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        time: now,
        text: `⭐ **Espacio Promocionado en "Destacados"**:\n\n• **¿Qué beneficios ofrece?**: Tu evento o taller aparecerá primero en el **Carrusel Superior de la Portada** frente a miles de bailarines activos durante toda la semana del evento.\n• **Tarifa Oficial**: Solo **$3.500 ARS** (una inversión mínima comparada con la venta de una sola entrada).\n• **¿Cómo activarlo?**: Al subir tu flyer, activa la opción *"¿Quieres que este evento aparezca en Destacados?"* y abona cómodamente con Mercado Pago al alias **salebaile.mp**. Al confirmarse, se le adjudica la insignia ⭐ Destacado Oficial.`,
      };
    }

    // 5. Respuestas sobre Mercado Pago y Comprobante
    if (q.includes('mercado pago') || q.includes('pago') || q.includes('comprobante') || q.includes('captura') || q.includes('transferencia')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        time: now,
        text: `💳 **Pago con Mercado Pago y Registro de Comprobante**:\n\n1. Al seleccionar tu entrada, tocas **"Continuar al Pago"**.\n2. La app te proporciona el alias oficial **salebaile.mp** y el botón para abrir la aplicación de Mercado Pago con el importe exacto.\n3. Una vez transferido, subes la captura o número de operación.\n4. **Seguridad Total**: El comprobante queda guardado para siempre en tu pestaña **"Mis Entradas"** en tu perfil, permitiéndote descargarlo o reenviarlo por WhatsApp a la administración si fuera necesario.`,
      };
    }

    // 6. Respuestas sobre Mapa y Radar de Baile
    if (q.includes('mapa') || q.includes('radar') || q.includes('cercan') || q.includes('ubicacion')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        time: now,
        text: `📍 **Radar de Baile y Mapa Interactivo**:\n\n• El botón con icono de **Radar** en la cabecera abre el mapa satelital.\n• Puedes ubicar todos los locales bailables (Melani José C. Paz, Palermo, Ramos Mejía, Quilmes, etc.) identificando el nombre del local y el género musical.\n• Toca cualquier marcador en el mapa para ver la distancia en kilómetros y el botón GPS para abrir Google Maps y llegar directamente.`,
      };
    }

    // 7. Respuesta para el Administrador
    if (currentRole === 'admin' && (q.includes('admin') || q.includes('panel') || q.includes('borrar') || q.includes('eliminar'))) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        time: now,
        text: `🛡️ **Herramientas de Administración**:\n\n• **Panel Admin (Icono del Escudo)**: Puedes aprobar o rechazar eventos pendientes, ver las órdenes de compra con comprobantes y activar o pausar eventos destacados.\n• **Eliminar Flyers**: Cada tarjeta en el panel de administración dispone del botón rojo de papelera para suprimir flyers erróneos en 1 clic.\n• **Control de Organizadores**: Puedes promover cualquier perfil a organizador aprobado para otorgarle auto-publicación directa.`,
      };
    }

    // Respuesta general instructiva
    return {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      time: now,
      text: `💡 **Guía Rápida de Sale Baile**:\n\n• **Explorar**: Encuentra cartelera completa de Bachata, Salsa, Rock, Cachengue y Tango.\n• **Entradas**: Adquiere anticipadas con QR para ingresar rápido en puerta.\n• **Comunidad**: Si eres organizador o profesor, sube tus eventos y clases para difundirlos en toda Argentina.\n\n¿Tienes alguna duda puntual sobre algún botón o función? Escríbela y te la explico con gusto.`,
    };
  };

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const reply = generateAIResponse(text, effectiveRole);
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 600);
  };

  const [isListening, setIsListening] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-oled-950 sm:border sm:border-white/15 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 h-[100dvh] sm:h-[88vh] sm:max-h-[750px]">
        {/* Header con botón atrás (Pantalla 4) */}
        <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-oled-900/90 backdrop-blur-xl sticky top-0 z-20 pt-[max(14px,env(safe-area-inset-top))] sm:pt-3.5">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-black text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Asistente Inteligente</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Si no hay conversación activa, mostrar la pantalla idéntica a Pantalla 4 de la maqueta */}
        {messages.length <= 1 ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col items-center justify-between text-center space-y-6">
            {/* Cabecera Robot */}
            <div className="space-y-2 pt-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-dance-crimson to-dance-coral p-0.5 shadow-glow-crimson flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-oled-900 flex items-center justify-center text-dance-coral">
                  <Bot className="w-8 h-8" />
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Buscar con IA
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Decime qué querés bailar
              </p>
            </div>

            {/* Ejemplos para probar */}
            <div className="w-full space-y-2 text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Ejemplos para probar:
              </span>
              <div className="space-y-2">
                {[
                  'Quiero bailar bachata esta noche cerca mío',
                  '¿Dónde hay rock el sábado?',
                  'Algo gratis para hoy',
                  'Buscame salsa a menos de 10 km',
                ].map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(example)}
                    className="w-full py-2.5 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-dance-coral/40 text-xs text-slate-300 hover:text-white flex items-center gap-2.5 transition-all text-left cursor-pointer active:scale-98"
                  >
                    <Search className="w-3.5 h-3.5 text-dance-coral shrink-0" />
                    <span className="truncate">{example}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sección de Grabación y Ondas de Audio (Escuchando...) */}
            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <span className="text-xs font-black uppercase tracking-wider text-dance-coral animate-pulse">
                {isListening ? 'Escuchando tu voz...' : 'Escuchando...'}
              </span>

              <div className="flex items-center gap-3 sm:gap-4">
                {/* Barras de onda izquierda */}
                <div className="flex items-center gap-1 h-10">
                  <span className="w-1 h-3 bg-dance-coral/60 rounded-full animate-pulse" />
                  <span className="w-1 h-6 bg-dance-crimson rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-9 bg-dance-coral rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="w-1 h-5 bg-dance-amber rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                </div>

                {/* Botón Central Micrófono con Pulso Neón */}
                <button
                  type="button"
                  onClick={() => setIsListening(!isListening)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all cursor-pointer shadow-glow-crimson ${
                    isListening
                      ? 'bg-gradient-to-tr from-dance-crimson to-dance-coral scale-110 ring-4 ring-dance-crimson/40 animate-pulse'
                      : 'bg-gradient-to-tr from-dance-crimson to-dance-coral hover:scale-105 active:scale-95'
                  }`}
                  title="Activar micrófono"
                >
                  <Mic className="w-7 h-7" />
                </button>

                {/* Barras de onda derecha */}
                <div className="flex items-center gap-1 h-10">
                  <span className="w-1 h-5 bg-dance-amber rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 h-9 bg-dance-coral rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="w-1 h-6 bg-dance-crimson rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-3 bg-dance-coral/60 rounded-full animate-pulse" />
                </div>
              </div>
            </div>

            {/* Prompt de entrada inferior: También podés escribir... */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 block text-left">
                También podés escribir...
              </span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Escribí tu consulta..."
                  className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-dance-coral focus:bg-white/10 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-2.5 w-8 h-8 rounded-xl bg-gradient-to-r from-dance-crimson to-dance-coral text-white flex items-center justify-center transition-all cursor-pointer shadow-glow-crimson disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Vista de Hilo de Conversación cuando ya hay mensajes */
          <div className="flex-1 flex flex-col overflow-hidden bg-oled-950">
            {/* Mensajes */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-dance-crimson to-dance-coral text-white font-medium rounded-br-none shadow-md'
                        : 'bg-oled-900 border border-white/10 text-slate-200 rounded-bl-none shadow-lg'
                    }`}
                  >
                    <div className="whitespace-pre-line space-y-2">
                      {msg.text.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 text-right mt-1.5 opacity-70">
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-slate-400 text-xs pl-2 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-dance-coral" />
                  <span>Buscando los mejores eventos con IA...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input de respuesta en conversación */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-oled-900/90 border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribí tu consulta..."
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dance-coral transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-dance-crimson to-dance-coral text-white flex items-center justify-center transition-all cursor-pointer shadow-glow-crimson disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
