import React, { useState } from 'react';
import type { StaffMember, EventItem } from '../../types';
import { getLocalStaffMembers, saveLocalStaffMember, deleteLocalStaffMember } from '../../lib/tickets';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  X,
} from 'lucide-react';

interface StaffManagerProps {
  events: EventItem[];
}

export const StaffManager: React.FC<StaffManagerProps> = ({ events }) => {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getLocalStaffMembers());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtrar staff asignado por este organizador
  const myStaff = staffList.filter(s => 
    s.organizer_id === (user?.id || 'org-1') || 
    s.organizer_name.toLowerCase().includes((user?.full_name || '').toLowerCase()) ||
    user?.role === 'admin'
  );

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      organizer_id: user?.id || 'org-1',
      organizer_name: user?.full_name || 'Organizador',
      name: name.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim() || '+5491155551234',
      role: 'door_control',
      assigned_event_ids: selectedEventId === 'all' ? [] : [selectedEventId],
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const updated = saveLocalStaffMember(newStaff);
    setStaffList(updated);
    setIsAddModalOpen(false);
    setName('');
    setEmail('');
    setWhatsapp('');
    setSuccessMessage(`¡${newStaff.name} ha sido habilitado/a como Staff de Puerta!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDeleteStaff = (id: string) => {
    const updated = deleteLocalStaffMember(id);
    setStaffList(updated);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-dance-coral" />
            <span>Mi Equipo de Staff para Control en Puerta</span>
          </h3>
          <p className="text-xs text-slate-400">
            Designa personas de confianza para que escaneen los códigos QR y verifiquen DNI en la entrada de tus eventos.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-dance-coral to-dance-crimson text-white text-xs font-extrabold rounded-xl shadow-glow-crimson flex items-center gap-2 cursor-pointer hover:opacity-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Designar Nuevo Staff por Email</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Lista de Staff Asignado */}
      {myStaff.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {myStaff.map((staff) => (
            <div
              key={staff.id}
              className="p-4 bg-[#0e111a] border border-white/10 rounded-2xl space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-dance-coral/15 border border-dance-coral/30 flex items-center justify-center text-dance-coral font-black text-sm">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{staff.name}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                      CONTROL EN PUERTA ACTIVO
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteStaff(staff.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title="Revocar acceso de Staff"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-xs text-slate-400 border-t border-white/5 pt-2">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-200">{staff.email}</span>
                </div>
                {staff.whatsapp && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{staff.whatsapp}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {staff.assigned_event_ids.length === 0
                      ? 'Asignado a todos mis eventos'
                      : `Asignado a ${staff.assigned_event_ids.length} evento(s) específico(s)`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-[#0e111a] border border-white/10 rounded-3xl text-center space-y-2">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-sm">Aún no designaste recepcionistas o staff</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Podés agregar a tus colaboradores ingresando su correo electrónico registrado en Sale Baile para que puedan controlar los accesos en puerta desde su teléfono.
          </p>
        </div>
      )}

      {/* Modal para Agregar Staff */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0e111a] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-dance-coral" />
                <span>Designar Staff de Puerta</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ingresá el nombre y el correo con el que la persona está registrada en la app para habilitarle la herramienta de escaneo de entradas.
            </p>

            <form onSubmit={handleAddStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Colaborador *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Carolina Recepción"
                  className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-coral focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email del Colaborador (Registrado en la app) *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carolina.puerta@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-coral focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp de Contacto</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+54 9 11 ..."
                  className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-dance-coral focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Evento Asignado</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141926] border border-white/10 rounded-xl text-xs text-white focus:border-dance-coral focus:outline-none"
                >
                  <option value="all">Todos mis eventos activos</option>
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 px-3 bg-[#141926] text-slate-300 text-xs font-semibold rounded-xl border border-white/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 bg-gradient-to-r from-dance-coral to-dance-crimson text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer hover:opacity-95"
                >
                  Habilitar Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
