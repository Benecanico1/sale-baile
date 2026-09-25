import { useEffect, useState } from 'react';

interface AdvanceTicketCTAProps {
  advancePrice: number;
  doorPrice?: number;
  hasAdvanceTicket: boolean;
  isAdvanceExpired: boolean;
  advanceEnd: number | null;
  viaWhatsapp: boolean;
  whatsappNumber?: string;
  onBuy?: () => void;
}

// Sanea el número de WhatsApp: deja solo dígitos y antepone 549 si cargó sin código de país.
function sanitizeWhatsapp(raw?: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 0 && digits.length <= 10 && !digits.startsWith('54')) {
    digits = '549' + digits;
  }
  return digits;
}

function useCountdown(end: number | null): number | null {
  const [left, setLeft] = useState<number | null>(end ? Math.max(0, end - Date.now()) : null);
  useEffect(() => {
    if (!end) return;
    setLeft(Math.max(0, end - Date.now()));
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);
  return left;
}

const fmt = (ms: number): string => {
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return `${d}d ${h}h ${String(m).padStart(2, '0')}m`;
};

export const AdvanceTicketCTA: React.FC<AdvanceTicketCTAProps> = ({
  advancePrice,
  doorPrice,
  hasAdvanceTicket,
  isAdvanceExpired,
  advanceEnd,
  viaWhatsapp,
  whatsappNumber,
  onBuy,
}) => {
  const left = useCountdown(isAdvanceExpired ? null : advanceEnd);
  const isActive = hasAdvanceTicket && !isAdvanceExpired;

  // Sin anticipada o vencida: el bloque inferior del modal ya cubre esos estados (CASO 4/5).
  if (!isActive) return null;

  // Ancla de pérdida: solo si el precio de puerta supera al de anticipada.
  const savings = doorPrice && doorPrice > advancePrice ? doorPrice - advancePrice : null;

  const countdownPill =
    left != null && left > 0 ? (
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-xs font-semibold text-amber-300">
        ⏱ La anticipada se termina en {fmt(left)}
      </div>
    ) : null;

  // Rama WhatsApp: el canal cambia (chat, no QR), la urgencia se mantiene.
  if (viaWhatsapp) {
    const wa = sanitizeWhatsapp(whatsappNumber);
    return (
      <div className="mt-3">
        {countdownPill}
        <button
          type="button"
          onClick={() => wa && window.open(`https://wa.me/${wa}`, '_blank', 'noopener,noreferrer')}
          disabled={!wa}
          className="w-full rounded-2xl bg-[#25D366] hover:bg-[#1fbc5a] px-4 py-3 text-sm font-bold text-[#0B2E1F] transition-all active:scale-[0.99] shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Reservar anticipada por WhatsApp
          <span className="mt-0.5 block text-xs font-normal opacity-80">
            te pasan el precio anticipado al toque
          </span>
        </button>
      </div>
    );
  }

  if (!onBuy) return null;

  // Estado activo: CTA + ancla de pérdida + countdown.
  return (
    <div className="mt-3">
      {countdownPill}
      <button
        type="button"
        onClick={onBuy}
        className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 px-4 py-3 text-sm font-bold text-gray-900 transition-all active:scale-[0.99] shadow-md"
      >
        Comprar Anticipada · ${advancePrice.toLocaleString('es-AR')}
        <span className="mt-0.5 block text-xs font-medium">
          {doorPrice ? (
            <>
              En puerta ${doorPrice.toLocaleString('es-AR')}
              {savings != null && (
                <>
                  {' · '}
                  <span className="font-semibold text-red-700">
                    ahorrás ${savings.toLocaleString('es-AR')}
                  </span>
                </>
              )}
            </>
          ) : null}
        </span>
      </button>
    </div>
  );
};
