import React, { useState } from 'react';
import type { EventItem, TicketCheckInResult } from '../../types';
import { validateTicketCheckIn, getOrganizerTicketStats } from '../../lib/tickets';
import { useAuth } from '../../context/AuthContext';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
} from 'lucide-react';

interface TicketScannerModalProps {
  events?: EventItem[];
  isOpen: boolean;
  onClose: () => void;
  staffName?: string;
}

export const TicketScannerModal: React.FC<TicketScannerModalProps> = ({
  events = [],
  isOpen,
  onClose,
  staffName,
}) => {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [searchInput, setSearchInput] = useState('');
  const [scanResult, setScanResult] = useState<TicketCheckInResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<TicketCheckInResult[]>([]);

  if (!isOpen) return null;

  const stats = getOrganizerTicketStats(user?.full_name || 'Organizador');

  const handleValidate = (queryToValidate?: string) => {
    const query = queryToValidate || searchInput;
    if (!query.trim()) return;

    const result = validateTicketCheckIn(
      query,
      selectedEventId || undefined,
      user?.email || 'staff@salebaile.com',
      staffName || user?.full_name || 'Staff de Puerta'
    );

    setScanResult(result);
    setRecentCheckIns((prev) => [result, ...prev.slice(0, 15)]);
    setSearchInput('');

    // Audio feedback simple
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(result.success ? 880 : 300, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0b0e17] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-dance-coral to-dance-crimson flex items-center justify-center text-white shadow-glow-coral">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Control de Entradas en Puerta</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  EN VIVO
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Validador oficial de accesos QR y DNI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Evento para Puerta */}
        {events.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Evento en Puerta:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white focus:border-dance-coral focus:outline-none"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.city})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tarjetas KPI de Ingresos */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 bg-[#141926] border border-white/5 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Vendidas</span>
            <strong className="text-lg font-black text-white">{stats.totalTicketsSold}</strong>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Ingresaron</span>
            <strong className="text-lg font-black text-emerald-400">{stats.totalCheckedIn}</strong>
          </div>
          <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-center">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">Por Ingresar</span>
            <strong className="text-lg font-black text-amber-300">{stats.pendingCheckIn}</strong>
          </div>
        </div>

        {/* Buscador y Lector Manual por DNI / Código QR */}
        <div className="p-4 bg-[#141926] border border-white/10 rounded-2xl space-y-3">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Search className="w-4 h-4 text-dance-coral" />
            <span>Escanear Código QR o Buscar por DNI</span>
          </span>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleValidate();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ingresá DNI del titular o código TKT-..."
              className="flex-1 px-4 py-3 bg-[#0a0d16] border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:border-dance-coral focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-3 bg-gradient-to-r from-dance-coral to-dance-crimson hover:opacity-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-glow-coral cursor-pointer"
            >
              Validar Acceso
            </button>
          </form>

          {/* Botones de Prueba Rápida con Entradas de Ejemplo */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[10px] text-slate-500">Probar con:</span>
            <button
              type="button"
              onClick={() => handleValidate('38.452.190')}
              className="px-2 py-0.5 rounded-md bg-dark-800 hover:bg-dark-750 text-slate-300 text-[10px] font-bold border border-white/10 cursor-pointer"
            >
              DNI: 38.452.190
            </button>
            <button
              type="button"
              onClick={() => handleValidate('TKT-7821-AZUQUITA')}
              className="px-2 py-0.5 rounded-md bg-dark-800 hover:bg-dark-750 text-slate-300 text-[10px] font-bold border border-white/10 cursor-pointer"
            >
              TKT-7821-AZUQUITA
            </button>
            <button
              type="button"
              onClick={() => handleValidate('TKT-9941-PATOS')}
              className="px-2 py-0.5 rounded-md bg-dark-800 hover:bg-dark-750 text-slate-300 text-[10px] font-bold border border-white/10 cursor-pointer"
            >
              TKT-9941-PATOS
            </button>
          </div>
        </div>

        {/* Resultado del Escaneo */}
        {scanResult && (
          <div
            className={`p-5 rounded-2xl border text-center space-y-2 animate-fadeIn ${
              scanResult.success
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : scanResult.status === 'already_used'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                : scanResult.status === 'pending_payment'
                ? 'bg-orange-950/80 border-orange-500 text-orange-200'
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-base sm:text-lg font-black">
              {scanResult.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : scanResult.status === 'already_used' ? (
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              ) : scanResult.status === 'pending_payment' ? (
                <AlertTriangle className="w-6 h-6 text-orange-400 animate-pulse" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400" />
              )}
              <span>{scanResult.message}</span>
            </div>

            {scanResult.ticket && (
              <div className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/10 text-left space-y-1 mt-2">
                <div>Titular: <strong className="text-white">{scanResult.ticket.buyer_name}</strong></div>
                <div>DNI: <strong className="text-white">{scanResult.ticket.buyer_dni}</strong></div>
                <div>Evento: <strong className="text-white">{scanResult.ticket.event_title}</strong></div>
                <div>Estado de Pago: <strong className={scanResult.ticket.status === 'pending_payment' ? 'text-amber-400' : 'text-emerald-400'}>
                  {scanResult.ticket.status === 'pending_payment' ? '⏳ PENDIENTE DE APROBACIÓN' : scanResult.ticket.status}
                </strong></div>
                <div>Hora de intento: <strong>{scanResult.timestamp} hs</strong></div>
              </div>
            )}
          </div>
        )}

        {/* Historial Reciente de Puerta */}
        {recentCheckIns.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Últimos Ingresos Verificados
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recentCheckIns.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#141926] border border-white/5 rounded-xl flex items-center justify-between text-xs text-slate-300"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className={`w-2 h-2 rounded-full ${item.success ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="font-bold text-white truncate">{item.ticket?.buyer_name || 'Desconocido'}</span>
                    <span className="text-slate-500 font-mono">({item.ticket?.buyer_dni || 'Sin DNI'})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">{item.timestamp} hs</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
