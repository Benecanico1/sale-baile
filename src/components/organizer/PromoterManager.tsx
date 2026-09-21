import React, { useState } from 'react';
import type { EventItem, PromoterSeller } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getLocalPromoters,
  saveLocalPromoter,
  deleteLocalPromoter,
  updateLocalPromoter,
} from '../../lib/supabase';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  X,
  Calendar,
  Image,
  Percent,
  Mail,
  Send,
} from 'lucide-react';

interface PromoterManagerProps {
  events: EventItem[];
  onOpenPromoterKit: (promoterEmail: string) => void;
}

export const PromoterManager: React.FC<PromoterManagerProps> = ({
  events,
  onOpenPromoterKit,
}) => {
  const { user } = useAuth();
  const [promoters, setPromoters] = useState<PromoterSeller[]>(() => getLocalPromoters());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoter, setEditingPromoter] = useState<PromoterSeller | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [commissionRate, setCommissionRate] = useState('15% por anticipada');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Filtrar promotores del organizador actual
  const myPromoters = promoters.filter(
    (p) => p.organizer_id === (user?.id || 'org-1') || p.organizer_name === user?.full_name
  );

  const handleOpenCreateModal = () => {
    setEditingPromoter(null);
    setName('');
    setEmail('');
    setWhatsapp('+54911');
    setCommissionRate('15% por anticipada');
    setSelectedEventIds(events.map((e) => e.id)); // Por defecto todos seleccionados
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promoter: PromoterSeller) => {
    setEditingPromoter(promoter);
    setName(promoter.name);
    setEmail(promoter.email);
    setWhatsapp(promoter.whatsapp);
    setCommissionRate(promoter.commission_rate || '15% por anticipada');
    setSelectedEventIds(promoter.assigned_event_ids || events.map((e) => e.id));
    setNotes(promoter.notes || '');
    setIsModalOpen(true);
  };

  const handleToggleEventSelection = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const handleSavePromoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !whatsapp.trim()) return;

    const promoterData: PromoterSeller = {
      id: editingPromoter ? editingPromoter.id : `prom-${Date.now()}`,
      organizer_id: user?.id || 'org-1',
      organizer_name: user?.full_name || 'Organizador',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      commission_rate: commissionRate.trim(),
      assigned_event_ids: selectedEventIds,
      notes: notes.trim() || undefined,
      status: editingPromoter ? editingPromoter.status : 'active',
      custom_flyers: editingPromoter ? editingPromoter.custom_flyers : [],
      created_at: editingPromoter ? editingPromoter.created_at : new Date().toISOString(),
    };

    const updated = saveLocalPromoter(promoterData);
    setPromoters(updated);
    setIsModalOpen(false);
    setSuccessNotice(
      editingPromoter
        ? '¡Vendedor actualizado con éxito!'
        : `¡Vendedor "${name}" agregado! Podés enviarle la invitación por WhatsApp.`
    );
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleDelete = (promoter: PromoterSeller) => {
    if (confirm(`¿Eliminar a ${promoter.name} de tu equipo de ventas?`)) {
      const updated = deleteLocalPromoter(promoter.id);
      setPromoters(updated);
    }
  };

  const handleToggleStatus = (promoter: PromoterSeller) => {
    const newStatus = promoter.status === 'active' ? 'inactive' : 'active';
    const updated = updateLocalPromoter(promoter.id, { status: newStatus });
    setPromoters(updated);
  };

  const generateInviteMessage = (promoter: PromoterSeller) => {
    const cleanPhone = promoter.whatsapp.replace(/\D/g, '');
    const appUrl = 'https://salebaile.web.app';
    const text = `¡Hola ${promoter.name}! 💃🎟️
Te agregué como *Vendedor Oficial / RRPP* de nuestras fiestas y eventos en *Sale Baile*.

💰 *Tu comisión acordada:* ${promoter.commission_rate || 'Comisión por entrada'}
📲 *Tus compradores te escribirán a:* ${promoter.whatsapp}

👉 *Para ingresar a tu Kit de Venta:*
1. Entrá a ${appUrl}
2. Ingresá a tu cuenta o colocá tu correo: *${promoter.email}*
3. Encontrarás los flyers oficiales, podrás subir tu propio flyer con tu foto RRPP y tendrás tu enlace directo de WhatsApp para vender anticipadas.

¡A romper la pista de baile! 🔥`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Sección */}
      <div className="bg-[#121624] border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-dance-coral/20 border border-dance-coral/40 flex items-center justify-center text-dance-coral">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-black text-lg text-white">Equipo de Vendedores & RRPP</h3>
          </div>
          <p className="text-xs text-slate-300">
            Agregá personas por su email para que vendan entradas anticipadas con su propio flyer, foto y WhatsApp a cambio de una comisión.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-dance-crimson to-dance-coral hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-glow-crimson flex items-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Agregar Vendedor
        </button>
      </div>

      {/* Notificación de Éxito */}
      {successNotice && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-700/80 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Listado de Vendedores */}
      {myPromoters.length === 0 ? (
        <div className="p-12 text-center bg-[#131828]/50 border border-white/5 rounded-3xl space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="font-bold text-base text-white">Aún no agregaste vendedores a tu equipo</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Suma a tus promotores, RRPP o alumnos para que compartan el flyer en sus redes con su foto y vendan anticipadas para tus eventos.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dance-coral text-xs font-bold rounded-xl border border-dance-coral/30 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Primer Vendedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myPromoters.map((promoter) => {
            const customFlyersCount = promoter.custom_flyers?.length || 0;
            const assignedCount = promoter.assigned_event_ids?.length || events.length;

            return (
              <div
                key={promoter.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 ${
                  promoter.status === 'active'
                    ? 'bg-[#141928] border-white/10 shadow-lg'
                    : 'bg-[#101420]/60 border-white/5 opacity-75'
                }`}
              >
                {/* Info Vendedor */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-dance-crimson/20 to-dance-coral/20 border border-dance-coral/30 flex items-center justify-center text-dance-coral font-black text-sm">
                        {promoter.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-2">
                          {promoter.name}
                          <span
                            onClick={() => handleToggleStatus(promoter)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              promoter.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {promoter.status === 'active' ? 'Activo' : 'Pausado'}
                          </span>
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{promoter.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(promoter)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        title="Editar vendedor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promoter)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Eliminar vendedor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Datos Clave */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-black/30 rounded-2xl border border-white/5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold flex items-center gap-1">
                        <Percent className="w-3 h-3 text-dance-amber" />
                        Comisión
                      </span>
                      <span className="font-bold text-dance-amber truncate block">
                        {promoter.commission_rate || '15%'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-emerald-400" />
                        WhatsApp Ventas
                      </span>
                      <span className="font-semibold text-slate-200 truncate block">
                        {promoter.whatsapp}
                      </span>
                    </div>

                    <div className="mt-1">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-dance-orange" />
                        Eventos
                      </span>
                      <span className="font-semibold text-slate-300">
                        {assignedCount} asignados
                      </span>
                    </div>

                    <div className="mt-1">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold flex items-center gap-1">
                        <Image className="w-3 h-3 text-dance-coral" />
                        Flyers Propios
                      </span>
                      <span className="font-semibold text-slate-300">
                        {customFlyersCount} con su foto
                      </span>
                    </div>
                  </div>

                  {promoter.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-white/5 p-2 rounded-xl border border-white/5">
                      "{promoter.notes}"
                    </p>
                  )}
                </div>

                {/* Acciones de Vendedor */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <a
                    href={generateInviteMessage(promoter)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invitar por WhatsApp</span>
                  </a>

                  <button
                    onClick={() => onOpenPromoterKit(promoter.email)}
                    className="py-2.5 px-3 bg-[#1e2538] hover:bg-[#28314a] text-slate-200 font-bold text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-dance-coral" />
                    <span>Ver su Kit de Venta</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Vendedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg bg-[#121624] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-dance-coral" />
                <h3 className="font-bold text-base text-white">
                  {editingPromoter ? 'Editar Vendedor / RRPP' : 'Agregar Nuevo Vendedor / RRPP'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePromoter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre o Apodo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Matias RRPP / Valeria"
                    className="w-full px-3.5 py-2 bg-[#0e121e] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Correo Electrónico (Login) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendedor@gmail.com"
                    className="w-full px-3.5 py-2 bg-[#0e121e] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp para Ventas *
                  </label>
                  <input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+54911..."
                    className="w-full px-3.5 py-2 bg-[#0e121e] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
                  />
                  <span className="text-[10px] text-slate-500">Los clientes le escribirán a este número</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Comisión Acordada
                  </label>
                  <input
                    type="text"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    placeholder="Ej: 15% o $1.000 por entrada"
                    className="w-full px-3.5 py-2 bg-[#0e121e] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
                  />
                </div>
              </div>

              {/* Selección de Eventos Asignados */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Eventos que puede Publicar y Vender ({selectedEventIds.length} seleccionados)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-[#0e121e] border border-white/10 rounded-xl">
                  {events.map((evt) => {
                    const isChecked = selectedEventIds.includes(evt.id);
                    return (
                      <label
                        key={evt.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          isChecked ? 'bg-dance-coral/15 text-white' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEventSelection(evt.id)}
                          className="rounded text-dance-coral focus:ring-0"
                        />
                        <span className="truncate font-semibold">{evt.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Notas Internas (Opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: RRPP Zona Norte / Alumnos de intermedio"
                  className="w-full px-3.5 py-2 bg-[#0e121e] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-dance-crimson"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-dance-crimson to-dance-coral hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-glow-crimson transition-all"
                >
                  {editingPromoter ? 'Guardar Cambios' : 'Registrar Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
