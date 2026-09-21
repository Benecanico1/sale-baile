import type { TicketItem, TicketOrder, TicketCheckInResult, StaffMember, EventItem } from '../types';
import { formatEventSchedule } from './dateUtils';
import { syncChannel } from './cloudRequests';

const STORAGE_TICKETS_KEY = 'sale_baile_tickets_v4';
const STORAGE_ORDERS_KEY = 'sale_baile_orders_v4';
const STORAGE_STAFF_KEY = 'sale_baile_staff_v4';

const RTDB_BASE = 'https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile';
const CLOUD_TICKETS_URL = `${RTDB_BASE}/tickets.json`;
const CLOUD_ORDERS_URL = `${RTDB_BASE}/orders.json`;

export const INITIAL_MOCK_TICKETS: TicketItem[] = [];
export const INITIAL_MOCK_STAFF: StaffMember[] = [];

function notifySync() {
  if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'SYNC_UPDATE', timestamp: Date.now() });
    } catch (e) {}
  }
}

export async function fetchCloudTickets(): Promise<TicketItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(CLOUD_TICKETS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object') return Object.values(data);
    }
  } catch (e) {}
  return [];
}

export async function syncCloudTickets(tickets: TicketItem[]): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(CLOUD_TICKETS_URL, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tickets),
    });
    clearTimeout(timeoutId);
    if (res.ok) notifySync();
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchCloudOrders(): Promise<TicketOrder[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(CLOUD_ORDERS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object') return Object.values(data);
    }
  } catch (e) {}
  return [];
}

export async function syncCloudOrders(orders: TicketOrder[]): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(CLOUD_ORDERS_URL, {
      method: 'PUT',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orders),
    });
    clearTimeout(timeoutId);
    if (res.ok) notifySync();
    return res.ok;
  } catch (e) {
    return false;
  }
}

export function reconcileTicketsAndOrders(tickets: TicketItem[], orders: TicketOrder[]): { tickets: TicketItem[]; orders: TicketOrder[] } {
  const approvedOrderIds = new Set(orders.filter(o => o.payment_status === 'approved').map(o => o.id));
  const rejectedOrderIds = new Set(orders.filter(o => o.payment_status === 'rejected').map(o => o.id));

  const updatedTickets = tickets.map(t => {
    // Si la orden correspondiente fue aprobada, la entrada DEBE ser válida si estaba en pending_payment
    if (approvedOrderIds.has(t.order_id) && t.status === 'pending_payment') {
      return { ...t, status: 'valid' as const };
    }
    // Si la orden fue rechazada, cancelar la entrada
    if (rejectedOrderIds.has(t.order_id) && t.status !== 'cancelled') {
      return { ...t, status: 'cancelled' as const };
    }
    return t;
  });

  return { tickets: updatedTickets, orders };
}

export function getLocalTickets(): TicketItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_TICKETS_KEY);
    const orders = getLocalOrders();
    if (saved) {
      const parsed: TicketItem[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const map = new Map<string, TicketItem>();
        INITIAL_MOCK_TICKETS.forEach(t => map.set(t.id, t));
        parsed.forEach(t => map.set(t.id, t));
        const all = Array.from(map.values());
        const { tickets: reconciled } = reconcileTicketsAndOrders(all, orders);
        return reconciled;
      }
    }
  } catch (e) {
    console.warn('Error loading local tickets:', e);
  }
  return INITIAL_MOCK_TICKETS;
}

export function saveLocalTickets(tickets: TicketItem[]): void {
  try {
    localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets));
    syncCloudTickets(tickets).catch(() => {});
  } catch (e) {
    console.warn('Error saving local tickets:', e);
  }
}

export function getLocalOrders(): TicketOrder[] {
  try {
    const saved = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (saved) {
      const parsed: TicketOrder[] = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveLocalOrders(orders: TicketOrder[]): void {
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    syncCloudOrders(orders).catch(() => {});
  } catch (e) {}
}

export function getLocalStaffMembers(): StaffMember[] {
  try {
    const saved = localStorage.getItem(STORAGE_STAFF_KEY);
    if (saved) {
      const parsed: StaffMember[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const map = new Map<string, StaffMember>();
        INITIAL_MOCK_STAFF.forEach(s => map.set(s.id, s));
        parsed.forEach(s => map.set(s.id, s));
        return Array.from(map.values());
      }
    }
  } catch (e) {}
  return INITIAL_MOCK_STAFF;
}

export function saveLocalStaffMember(staff: StaffMember): StaffMember[] {
  const current = getLocalStaffMembers();
  const existsIndex = current.findIndex(s => s.id === staff.id || s.email.toLowerCase() === staff.email.toLowerCase());
  let updated: StaffMember[];
  if (existsIndex >= 0) {
    updated = current.map((s, idx) => idx === existsIndex ? { ...s, ...staff } : s);
  } else {
    updated = [staff, ...current];
  }
  try {
    localStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function deleteLocalStaffMember(staffId: string): StaffMember[] {
  const current = getLocalStaffMembers();
  const updated = current.filter(s => s.id !== staffId);
  try {
    localStorage.setItem(STORAGE_STAFF_KEY, JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function isUserAssignedAsStaff(userEmail?: string): { isStaff: boolean; staffRecords: StaffMember[] } {
  if (!userEmail) return { isStaff: false, staffRecords: [] };
  const allStaff = getLocalStaffMembers();
  const matches = allStaff.filter(s => s.email.toLowerCase() === userEmail.toLowerCase() && s.status === 'active');
  return {
    isStaff: matches.length > 0,
    staffRecords: matches,
  };
}

export interface CreateOrderParams {
  event: EventItem;
  quantity: number;
  buyerUserId?: string;
  buyerName: string;
  buyerDni: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  paymentMethod: 'mercadopago' | 'transfer' | 'cash_whatsapp';
  paymentReference?: string;
  paymentReceiptUrl?: string;
}

export function purchaseTickets(params: CreateOrderParams): { order: TicketOrder; tickets: TicketItem[] } {
  const {
    event,
    quantity,
    buyerUserId,
    buyerName,
    buyerDni,
    buyerEmail,
    buyerWhatsapp,
    paymentMethod,
    paymentReference,
    paymentReceiptUrl,
  } = params;
  
  // La venta online de entradas solo aplica para anticipadas (el cobro en puerta no genera venta en la app)
  const unitPrice = event.is_free ? 0 : (event.advance_ticket_price || 0);
  // Comisión fija del 20% para la plataforma Sale Baile
  const unitCommission = Math.round(unitPrice * 0.20);
  const resaleCost = event.is_free ? 0 : (event.admin_resale_price !== undefined ? event.admin_resale_price : (unitPrice - unitCommission));
  
  const totalAmount = unitPrice * quantity;
  const totalAdminCommission = unitCommission * quantity;
  const totalOrganizerRevenue = (unitPrice - unitCommission) * quantity;

  // Si el evento es gratis ($0), se emite automáticamente válida.
  // Si es con cobro, queda en 'pending_payment' hasta verificación administrativa.
  const initialTicketStatus: 'valid' | 'pending_payment' = unitPrice === 0 ? 'valid' : 'pending_payment';
  const initialPaymentStatus: 'approved' | 'pending' = unitPrice === 0 ? 'approved' : 'pending';

  const orderId = 'ORD-' + Date.now().toString().slice(-6);
  const schedule = formatEventSchedule(event.start_time, event.end_time);

  const generatedTickets: TicketItem[] = [];

  for (let i = 1; i <= quantity; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const eventShortCode = (event.city || 'BA').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const ticketId = 'TKT-' + randomSuffix + '-' + eventShortCode;
    const securityToken = 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const qrPayload = JSON.stringify({
      tktId: ticketId,
      evtId: event.id,
      dni: buyerDni,
      tok: securityToken,
    });

    const ticket: TicketItem = {
      id: ticketId,
      order_id: orderId,
      event_id: event.id,
      event_title: event.title,
      event_date: schedule.dateLabel,
      event_time_range: schedule.timeRange,
      event_venue: event.venue_name,
      event_address: event.address,
      event_city: event.city,
      event_flyer_url: event.flyer_url,
      organizer_id: event.organizer_id,
      organizer_name: event.organizer_name,
      buyer_user_id: buyerUserId,
      buyer_name: buyerName,
      buyer_dni: buyerDni,
      buyer_email: buyerEmail,
      buyer_whatsapp: buyerWhatsapp,
      attendee_name: quantity === 1 ? buyerName : buyerName + ' (Pase #' + i + ')',
      attendee_dni: buyerDni,
      quantity: 1,
      unit_price_paid: unitPrice,
      admin_resale_cost: resaleCost,
      admin_commission_earned: unitCommission,
      qr_code_payload: qrPayload,
      security_token: securityToken,
      status: initialTicketStatus,
      payment_reference: paymentReference,
      payment_receipt_url: paymentReceiptUrl,
      created_at: new Date().toISOString(),
    };

    generatedTickets.push(ticket);
  }

  const order: TicketOrder = {
    id: orderId,
    event_id: event.id,
    event_title: event.title,
    buyer_user_id: buyerUserId,
    buyer_name: buyerName,
    buyer_dni: buyerDni,
    buyer_email: buyerEmail,
    buyer_whatsapp: buyerWhatsapp,
    quantity,
    total_amount_paid: totalAmount,
    total_admin_commission: totalAdminCommission,
    total_organizer_revenue: totalOrganizerRevenue,
    payment_method: paymentMethod,
    payment_status: initialPaymentStatus,
    payment_reference: paymentReference,
    payment_receipt_url: paymentReceiptUrl,
    tickets_generated: generatedTickets.map(t => t.id),
    created_at: new Date().toISOString(),
  };

  const currentTickets = getLocalTickets();
  const updatedTickets = [...generatedTickets, ...currentTickets];
  saveLocalTickets(updatedTickets);

  const currentOrders = getLocalOrders();
  const updatedOrders = [order, ...currentOrders];
  saveLocalOrders(updatedOrders);

  notifySync();

  return { order, tickets: generatedTickets };
}

export interface IssueManualTicketsParams {
  event: EventItem;
  quantity: number;
  buyerName: string;
  buyerDni: string;
  buyerEmail?: string;
  buyerWhatsapp: string;
  unitPricePaid: number;
  adminResaleCost?: number;
  paymentNotes?: string;
}

/**
 * Emite y valida inmediatamente entradas vendidas de forma manual por el Administrador (vía WhatsApp o transferencia directa)
 */
export function issueManualAdminTickets(params: IssueManualTicketsParams): { order: TicketOrder; tickets: TicketItem[] } {
  const {
    event,
    quantity,
    buyerName,
    buyerDni,
    buyerEmail,
    buyerWhatsapp,
    unitPricePaid,
    adminResaleCost,
    paymentNotes,
  } = params;

  const unitPrice = unitPricePaid;
  // Comisión fija del 20% para Sale Baile
  const defaultCommission = Math.round(unitPrice * 0.20);
  const resaleCost = adminResaleCost !== undefined ? adminResaleCost : (unitPrice - defaultCommission);
  const unitCommission = Math.max(0, unitPrice - resaleCost);

  const totalAmount = unitPrice * quantity;
  const totalAdminCommission = unitCommission * quantity;
  const totalOrganizerRevenue = resaleCost * quantity;

  const orderId = 'ORD-WA-' + Date.now().toString().slice(-6);
  const schedule = formatEventSchedule(event.start_time, event.end_time);

  const generatedTickets: TicketItem[] = [];

  for (let i = 1; i <= quantity; i++) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const eventShortCode = (event.city || 'BA').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
    const ticketId = 'TKT-WA-' + randomSuffix + '-' + eventShortCode;
    const securityToken = 'sec_wa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const qrPayload = JSON.stringify({
      tktId: ticketId,
      evtId: event.id,
      dni: buyerDni,
      tok: securityToken,
    });

    const ticket: TicketItem = {
      id: ticketId,
      order_id: orderId,
      event_id: event.id,
      event_title: event.title,
      event_date: schedule.dateLabel,
      event_time_range: schedule.timeRange,
      event_venue: event.venue_name,
      event_address: event.address,
      event_city: event.city,
      event_flyer_url: event.flyer_url,
      organizer_id: event.organizer_id,
      organizer_name: event.organizer_name,
      buyer_name: buyerName,
      buyer_dni: buyerDni,
      buyer_email: buyerEmail || 'comprador@whatsapp.com',
      buyer_whatsapp: buyerWhatsapp,
      attendee_name: quantity === 1 ? buyerName : buyerName + ' (Pase #' + i + ')',
      attendee_dni: buyerDni,
      quantity: 1,
      unit_price_paid: unitPrice,
      price: unitPrice,
      admin_resale_cost: resaleCost,
      admin_commission_earned: unitCommission,
      qr_code_payload: qrPayload,
      security_token: securityToken,
      status: 'valid', // Entrada manual emitida por el Admin => Válida directa para escanear en puerta
      payment_reference: paymentNotes || 'Venta Manual WhatsApp / Admin',
      created_at: new Date().toISOString(),
    };

    generatedTickets.push(ticket);
  }

  const order: TicketOrder = {
    id: orderId,
    event_id: event.id,
    event_title: event.title,
    buyer_name: buyerName,
    buyer_dni: buyerDni,
    buyer_email: buyerEmail || 'comprador@whatsapp.com',
    buyer_whatsapp: buyerWhatsapp,
    quantity,
    total_amount_paid: totalAmount,
    total_admin_commission: totalAdminCommission,
    total_organizer_revenue: totalOrganizerRevenue,
    payment_method: 'cash_whatsapp',
    payment_status: 'approved',
    payment_reference: paymentNotes || 'Venta Manual WhatsApp / Admin',
    tickets_generated: generatedTickets.map(t => t.id),
    created_at: new Date().toISOString(),
  };

  const currentTickets = getLocalTickets();
  const updatedTickets = [...generatedTickets, ...currentTickets];
  saveLocalTickets(updatedTickets);

  const currentOrders = getLocalOrders();
  const updatedOrders = [order, ...currentOrders];
  saveLocalOrders(updatedOrders);

  notifySync();

  return { order, tickets: generatedTickets };
}

/**
 * Aprueba una orden de compra y activa inmediatamente sus entradas QR
 */
export async function approveTicketOrder(orderId: string): Promise<boolean> {
  const orders = getLocalOrders();
  const tickets = getLocalTickets();

  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return false;

  const targetOrder = orders[orderIndex];
  const updatedOrder: TicketOrder = {
    ...targetOrder,
    payment_status: 'approved',
  };

  const updatedOrders = [...orders];
  updatedOrders[orderIndex] = updatedOrder;

  // Actualizar todas las entradas asociadas a esta orden a 'valid'
  const updatedTickets = tickets.map(t => {
    if (t.order_id === orderId || (targetOrder.tickets_generated && targetOrder.tickets_generated.includes(t.id))) {
      return {
        ...t,
        status: 'valid' as const,
      };
    }
    return t;
  });

  saveLocalOrders(updatedOrders);
  saveLocalTickets(updatedTickets);

  try {
    await Promise.all([syncCloudOrders(updatedOrders), syncCloudTickets(updatedTickets)]);
  } catch (e) {}

  notifySync();
  return true;
}

/**
 * Rechaza o cancela una orden de compra por falta de pago
 */
export async function rejectTicketOrder(orderId: string): Promise<boolean> {
  const orders = getLocalOrders();
  const tickets = getLocalTickets();

  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) return false;

  const targetOrder = orders[orderIndex];
  const updatedOrder: TicketOrder = {
    ...targetOrder,
    payment_status: 'rejected',
  };

  const updatedOrders = [...orders];
  updatedOrders[orderIndex] = updatedOrder;

  // Cancelar las entradas asociadas
  const updatedTickets = tickets.map(t => {
    if (t.order_id === orderId || (targetOrder.tickets_generated && targetOrder.tickets_generated.includes(t.id))) {
      return {
        ...t,
        status: 'cancelled' as const,
      };
    }
    return t;
  });

  saveLocalOrders(updatedOrders);
  saveLocalTickets(updatedTickets);

  try {
    await Promise.all([syncCloudOrders(updatedOrders), syncCloudTickets(updatedTickets)]);
  } catch (e) {}

  notifySync();
  return true;
}

export function validateTicketCheckIn(
  query: string,
  targetEventId?: string,
  staffEmail: string = 'staff@salebaile.com',
  staffName: string = 'Staff de Puerta'
): TicketCheckInResult {
  const tickets = getLocalTickets();
  const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const cleanQuery = query.trim().toUpperCase();

  const foundIndex = tickets.findIndex(t => 
    t.id.toUpperCase() === cleanQuery || 
    t.buyer_dni === cleanQuery || 
    t.attendee_dni === cleanQuery ||
    t.qr_code_payload.includes(cleanQuery) ||
    (t.security_token && t.security_token === query.trim())
  );

  if (foundIndex === -1) {
    return {
      success: false,
      status: 'invalid',
      message: '❌ ENTRADA NO ENCONTRADA. El código QR o DNI no existe en el registro.',
      timestamp: nowStr,
    };
  }

  const ticket = tickets[foundIndex];

  if (targetEventId && ticket.event_id !== targetEventId) {
    return {
      success: false,
      status: 'invalid',
      message: '⚠️ ENTRADA VÁLIDA PERO PARA OTRO EVENTO: "' + ticket.event_title + '".',
      ticket,
      timestamp: nowStr,
    };
  }

  if (ticket.status === 'pending_payment') {
    return {
      success: false,
      status: 'pending_payment',
      message: '🚫 PAGO PENDIENTE DE APROBACIÓN. El comprador informó transferencia pero aún no fue confirmada por el administrador/organizador.',
      ticket,
      timestamp: nowStr,
    };
  }

  if (ticket.status === 'used') {
    const usedTime = ticket.used_at ? new Date(ticket.used_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'hora anterior';
    const byStaff = ticket.validated_by_staff_name || 'Staff';
    return {
      success: false,
      status: 'already_used',
      message: '🚫 ENTRADA YA UTILIZADA. Ingresó a las ' + usedTime + ' hs (Validada por ' + byStaff + ').',
      ticket,
      timestamp: nowStr,
    };
  }

  if (ticket.status === 'cancelled') {
    return {
      success: false,
      status: 'cancelled',
      message: '❌ Entrada Anulada / Reembolsada.',
      ticket,
      timestamp: nowStr,
    };
  }

  const updatedTicket: TicketItem = {
    ...ticket,
    status: 'used',
    used_at: new Date().toISOString(),
    validated_by_staff_email: staffEmail,
    validated_by_staff_name: staffName,
  };

  const updatedTickets = [...tickets];
  updatedTickets[foundIndex] = updatedTicket;
  saveLocalTickets(updatedTickets);

  return {
    success: true,
    status: 'valid',
    message: '✅ ACCESO PERMITIDO: ' + ticket.buyer_name + ' (DNI ' + ticket.buyer_dni + ') - 1 Acceso General',
    ticket: updatedTicket,
    timestamp: nowStr,
  };
}

export function getOrganizerTicketStats(
  organizerIdOrIds: string | string[],
  customTickets?: TicketItem[],
  customOrders?: TicketOrder[]
) {
  const rawTickets = customTickets || getLocalTickets();
  const rawOrders = customOrders || getLocalOrders();

  const { tickets, orders } = reconcileTicketsAndOrders(rawTickets, rawOrders);

  const orgTickets = tickets.filter(t => {
    if (Array.isArray(organizerIdOrIds)) {
      return organizerIdOrIds.includes(t.event_id) || organizerIdOrIds.includes(t.organizer_id);
    }
    return t.organizer_id === organizerIdOrIds || 
           (t.organizer_name && t.organizer_name.toLowerCase().includes(organizerIdOrIds.toLowerCase()));
  });

  const orgOrders = orders.filter(o => {
    if (Array.isArray(organizerIdOrIds)) {
      return organizerIdOrIds.includes(o.event_id);
    }
    return true;
  });

  const approvedOrderIds = new Set(orgOrders.filter(o => o.payment_status === 'approved').map(o => o.id));

  const approvedTickets = orgTickets.filter(t => 
    (t.status === 'valid' || t.status === 'used' || approvedOrderIds.has(t.order_id)) && t.status !== 'cancelled'
  );

  const pendingPaymentTickets = orgTickets.filter(t => 
    t.status === 'pending_payment' && !approvedOrderIds.has(t.order_id)
  );

  const approvedOrders = orgOrders.filter(o => o.payment_status === 'approved');
  const pendingOrders = orgOrders.filter(o => o.payment_status === 'pending');

  const totalTicketsSold = approvedTickets.length;
  
  // Total bruto de recaudación
  const totalGrossRevenue = approvedOrders.length > 0
    ? approvedOrders.reduce((acc, o) => acc + (o.total_amount_paid || o.total_amount || 0), 0)
    : approvedTickets.reduce((acc, t) => acc + (t.unit_price_paid || t.price || 0), 0);

  // Total neto para el organizador (80% o precio de reventa)
  const organizerNetPayout = approvedOrders.length > 0
    ? approvedOrders.reduce((acc, o) => acc + (o.total_organizer_revenue !== undefined ? o.total_organizer_revenue : ((o.total_amount_paid || 0) * 0.8)), 0)
    : approvedTickets.reduce((acc, t) => acc + (t.admin_resale_cost !== undefined ? t.admin_resale_cost : ((t.price || 0) * 0.8)), 0);

  // Comisión plataforma (20% fijo)
  const platformCommissions = approvedOrders.length > 0
    ? approvedOrders.reduce((acc, o) => acc + (o.total_admin_commission !== undefined ? o.total_admin_commission : ((o.total_amount_paid || 0) * 0.2)), 0)
    : approvedTickets.reduce((acc, t) => acc + (t.admin_commission_earned !== undefined ? t.admin_commission_earned : ((t.price || 0) * 0.2)), 0);

  const pendingGrossAmount = pendingOrders.reduce((acc, o) => acc + (o.total_amount_paid || o.total_amount || 0), 0);
  const totalCheckedIn = orgTickets.filter(t => t.status === 'used').length;
  const pendingCheckIn = orgTickets.filter(t => t.status === 'valid').length;

  return {
    totalTicketsSold,
    totalGrossRevenue,
    totalRevenueToCollect: organizerNetPayout,
    organizerNetPayout,
    platformCommissions,
    totalCheckedIn,
    checkedInTickets: totalCheckedIn,
    pendingCheckIn,
    pendingCheckInTickets: pendingCheckIn,
    pendingPaymentCount: pendingPaymentTickets.length,
    pendingGrossAmount,
    pendingPaymentTickets,
    tickets: orgTickets,
    allTickets: orgTickets,
    allOrders: orgOrders,
  };
}

export function getAdminTicketStats(customTickets?: TicketItem[], customOrders?: TicketOrder[]) {
  const rawTickets = customTickets || getLocalTickets();
  const rawOrders = customOrders || getLocalOrders();

  const { tickets, orders } = reconcileTicketsAndOrders(rawTickets, rawOrders);

  const approvedOrders = orders.filter(o => o.payment_status === 'approved');
  const pendingOrders = orders.filter(o => o.payment_status === 'pending');

  const approvedOrderIds = new Set(approvedOrders.map(o => o.id));

  const approvedTickets = tickets.filter(t => 
    (t.status === 'valid' || t.status === 'used' || approvedOrderIds.has(t.order_id)) && t.status !== 'cancelled'
  );
  
  const pendingPaymentTickets = tickets.filter(t => 
    t.status === 'pending_payment' && !approvedOrderIds.has(t.order_id)
  );

  const totalTicketsSold = approvedTickets.length;

  // Cálculo financiero exacto sobre órdenes aprobadas
  const totalGrossRevenue = approvedOrders.length > 0
    ? approvedOrders.reduce((acc, o) => acc + (o.total_amount_paid || o.total_amount || 0), 0)
    : approvedTickets.reduce((acc, t) => acc + (t.unit_price_paid || t.price || 0), 0);

  const totalAdminCommissions = approvedOrders.length > 0
    ? approvedOrders.reduce((acc, o) => acc + (o.total_admin_commission !== undefined ? o.total_admin_commission : ((o.total_amount_paid || 0) * 0.2)), 0)
    : approvedTickets.reduce((acc, t) => acc + (t.admin_commission_earned !== undefined ? t.admin_commission_earned : ((t.price || 0) * 0.2)), 0);

  const totalOrganizerPayouts = approvedOrders.length > 0
    ? approvedOrders.reduce((acc, o) => acc + (o.total_organizer_revenue !== undefined ? o.total_organizer_revenue : ((o.total_amount_paid || 0) * 0.8)), 0)
    : approvedTickets.reduce((acc, t) => acc + (t.admin_resale_cost !== undefined ? t.admin_resale_cost : ((t.price || 0) * 0.8)), 0);

  const totalCheckedIn = tickets.filter(t => t.status === 'used').length;
  const pendingGrossAmount = pendingOrders.reduce((acc, o) => acc + (o.total_amount_paid || o.total_amount || 0), 0);

  return {
    totalTicketsSold,
    totalGrossAmount: totalGrossRevenue,
    totalGrossRevenue,
    totalAdminCommissions,
    totalPlatformCommissions: totalAdminCommissions,
    totalOrganizerPayouts,
    totalCheckedIn,
    pendingOrdersCount: pendingOrders.length,
    pendingGrossAmount,
    pendingOrders,
    approvedOrders,
    pendingPaymentTickets,
    tickets,
    allTickets: tickets,
    allOrders: orders,
  };
}
