/**
 * Servicio de Integración Oficial con Mercado Pago
 * Implementación oficial con Checkout Pro y API de Preferencias
 */

export const MP_PUBLIC_KEY = 'APP_USR-c943f0e5-373f-41ed-b9b9-4c1236a81033';
export const MP_ACCESS_TOKEN = 'APP_USR-5226502327177478-040217-3c6bd5bf91cbb45cf19528d11d72d2a8-279971353';

export interface CreatePreferenceItem {
  id?: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

export interface CreatePreferenceBuyer {
  name?: string;
  email?: string;
  phone?: string;
  identificationNumber?: string;
}

export interface CreatePreferenceParams {
  orderId: string;
  items: CreatePreferenceItem[];
  buyer?: CreatePreferenceBuyer;
  metadata?: Record<string, any>;
}

export interface PreferenceResult {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

/**
 * Crea una preferencia de pago oficial en los servidores de Mercado Pago
 */
export async function createMercadoPagoPreference(params: CreatePreferenceParams): Promise<PreferenceResult> {
  const { orderId, items, buyer, metadata } = params;

  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://salebaile.web.app';

  const backUrls = {
    success: `${origin}/?payment=success&order_id=${encodeURIComponent(orderId)}`,
    failure: `${origin}/?payment=failure&order_id=${encodeURIComponent(orderId)}`,
    pending: `${origin}/?payment=pending&order_id=${encodeURIComponent(orderId)}`,
  };

  const payload: any = {
    items: items.map(item => ({
      id: item.id || `item-${Date.now()}`,
      title: item.title.slice(0, 120),
      description: (item.description || 'Entrada Digital Sale Baile').slice(0, 200),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unit_price: Math.max(1, Math.round(Number(item.unit_price))),
      currency_id: item.currency_id || 'ARS',
    })),
    back_urls: backUrls,
    auto_return: 'approved',
    external_reference: orderId,
    statement_descriptor: 'SALE BAILE',
    metadata: {
      order_id: orderId,
      ...metadata,
    },
  };

  if (buyer) {
    payload.payer = {
      name: buyer.name || undefined,
      email: buyer.email || 'comprador@salebaile.com',
      ...(buyer.identificationNumber ? {
        identification: {
          type: 'DNI',
          number: buyer.identificationNumber.replace(/\D/g, ''),
        }
      } : {}),
      ...(buyer.phone ? {
        phone: {
          number: buyer.phone.replace(/\D/g, '').slice(-10),
        }
      } : {}),
    };
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error al crear preferencia en Mercado Pago:', errorData);
    throw new Error(errorData.message || `Error HTTP ${response.status} al conectar con Mercado Pago`);
  }

  const data = await response.json();
  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  };
}

/**
 * Crea una preferencia de pago para destacar un evento ($3.500 ARS)
 */
export async function createFeaturedEventPreference(params: {
  eventTitle: string;
  organizerEmail?: string;
  eventId?: string;
}): Promise<PreferenceResult> {
  const orderId = `FEAT-${Date.now().toString().slice(-6)}`;
  return createMercadoPagoPreference({
    orderId,
    items: [
      {
        id: params.eventId || 'featured-promo',
        title: `Destacado Sale Baile: ${params.eventTitle}`,
        description: 'Espacio promocionado en Carrusel Superior de Portada',
        quantity: 1,
        unit_price: 3500,
        currency_id: 'ARS',
      }
    ],
    buyer: {
      email: params.organizerEmail || 'organizador@salebaile.com',
    },
    metadata: {
      type: 'featured_event',
      event_id: params.eventId,
    },
  });
}
