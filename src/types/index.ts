export type UserRole = 'user' | 'organizer' | 'admin' | 'staff';

export type EventStatus = 'borrador' | 'pendiente' | 'publicado' | 'rechazado' | 'cancelado';

export type EventCategory = 'social' | 'clase' | 'taller' | 'festival' | 'practica';

export type ProfileType = 'bailarin' | 'profesor' | 'organizador' | 'dueno_local';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  whatsapp_phone?: string;
  instagram_handle?: string;
  facebook_url?: string;
  zone?: string;
  role: UserRole;
  profile_type?: ProfileType; // 'bailarin' | 'profesor' | 'organizador' | 'dueno_local'
  avatar_url?: string;
  bio?: string;
  favorite_genres?: string[]; // ['salsa-y-bachata', 'bachata', 'salsa', 'rock', 'cachengue', 'tango', 'folklore', 'urbano', 'otros']

  // Atributos específicos para Profesor de Baile
  teacher_academy?: string;
  teacher_genres?: string[];
  teacher_days?: string[]; // ['Lunes', 'Miércoles', etc.]
  teacher_levels?: string[]; // ['Inicial', 'Intermedio', 'Avanzado', 'Multinivel']

  // Atributos específicos para Dueño de Local / Salón
  venue_name_registered?: string;
  venue_capacity?: number;
  venue_address?: string;
  venue_features?: string[]; // ['Pista de madera', 'Aire acondicionado', 'Barra / Bebidas', 'Sonido profesional', 'Alquiler para eventos / clases']

  onboarding_completed?: boolean;
  organizer_status?: 'none' | 'pending' | 'approved' | 'rejected';
  organizer_request_date?: string;
  organizer_request_notes?: string;
  website_url?: string;
  is_staff?: boolean;
  assigned_staff_events?: string[]; // IDs de eventos asignados para control de puerta
  staff_assigned_by_organizer_id?: string;
  is_suspended?: boolean;
  created_at: string;
}

export interface StaffMember {
  id: string;
  organizer_id: string;
  organizer_name: string;
  user_id?: string;
  name: string;
  email: string;
  whatsapp?: string;
  role: 'door_control' | 'cashier' | 'general';
  assigned_event_ids: string[]; // IDs de eventos asignados (vacío = todos los del organizador)
  status: 'active' | 'inactive';
  created_at: string;
}

export interface TicketItem {
  id: string; // Ej: TKT-9842-PATOS
  order_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_time_range: string;
  event_venue: string;
  event_address: string;
  event_city: string;
  event_flyer_url: string;
  organizer_id: string;
  organizer_name: string;
  buyer_user_id?: string;
  buyer_name: string;
  buyer_dni: string;
  buyer_email: string;
  buyer_whatsapp: string;
  attendee_name?: string; // Nombre del asistente específico
  attendee_dni?: string;  // DNI del asistente específico
  quantity: number;
  unit_price_paid: number;
  price?: number; // Alias de unit_price_paid
  tier_name?: string; // Ej: "Anticipada General"
  qr_code?: string; // Alias de id / security_token
  admin_resale_cost: number;
  admin_commission_earned: number;
  qr_code_payload: string;
  security_token: string;
  status: 'valid' | 'pending_payment' | 'used' | 'cancelled';
  payment_reference?: string;
  payment_receipt_url?: string;
  used_at?: string;
  validated_by_staff_email?: string;
  validated_by_staff_name?: string;
  created_at: string;
}

export interface TicketOrder {
  id: string;
  event_id: string;
  event_title: string;
  buyer_user_id?: string;
  buyer_name: string;
  buyer_dni: string;
  buyer_email: string;
  buyer_whatsapp: string;
  quantity: number;
  total_amount_paid: number;
  total_amount?: number; // Alias de total_amount_paid
  total_admin_commission: number;
  platform_commission?: number; // Alias de total_admin_commission
  total_organizer_revenue: number;
  payment_method: 'mercadopago' | 'transfer' | 'cash_whatsapp';
  payment_status: 'approved' | 'pending' | 'rejected';
  payment_reference?: string;
  payment_receipt_url?: string;
  tickets_generated: string[]; // Array de Ticket IDs
  created_at: string;
}

export interface TicketCheckInResult {
  success: boolean;
  status: 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'cancelled' | 'pending_payment';
  message: string;
  ticket?: TicketItem;
  timestamp: string;
}

export interface EventMediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  duration?: number;
  caption?: string;
}

export interface EventItem {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  flyer_url: string;
  flyer_aspect_ratio?: number;
  gallery?: EventMediaItem[];
  category: EventCategory;
  
  // Género y Ritmos de Baile
  genre_family?: string; // 'salsa-y-bachata' | 'bachata' | 'salsa' | 'rock' | 'cachengue' | 'tango' | 'folklore' | 'urbano' | 'otros'
  subgenres?: string[];  // ['bachata-sensual', 'bachata-dominicana', 'salsa-cubana', etc.]
  
  // Específico para Clases y Profesores de Baile
  class_days?: string[]; // ['Lunes', 'Miércoles', 'Viernes']
  class_level?: string;  // 'Inicial' | 'Intermedio' | 'Avanzado' | 'Multinivel'
  event_target?: 'general' | 'clase_profesor' | 'salon_local';

  // Horarios y zona
  start_time: string; // ISO 8601 string
  end_time: string;   // ISO 8601 string
  timezone: string;
  
  // Ubicación
  venue_name: string;
  address: string;
  city: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  distance_meters?: number; // Calculado en búsquedas
  
  // Precios y Entradas Anticipadas
  is_free: boolean;
  price?: number;
  advance_ticket_price?: number; // Precio anticipada con descuento al público
  advance_sales_end_date?: string; // Fecha límite de venta anticipada (YYYY-MM-DD)
  advance_sales_end_time?: string; // Hora límite de venta anticipada (HH:mm)
  is_recurring_weekly?: boolean;   // Si es una clase recurrente todas las semanas sin caducidad
  admin_resale_price?: number;   // Precio de reventa / costo para el Administrador (Sale Baile)
  admin_commission_rate?: string; // Comisión o ganancia acordada por entrada para el Administrador
  organizer_notes_to_admin?: string; // Notas o condiciones enviadas por el organizador para la moderación
  admin_review_notes?: string;   // Notas o respuesta del administrador
  currency: string;
  tickets_url?: string;
  advance_tickets_whatsapp?: string; // WhatsApp exclusivo para comprar anticipadas
  
  // Organizador
  organizer_name: string;
  organizer_whatsapp?: string;
  organizer_instagram?: string;
  
  // Feedback y Calificaciones
  rating_average?: number; // Ej: 4.9
  rating_count?: number;   // Ej: 18

  // Destacados & Cuota Comercial (Solo administrable por Admin)
  is_featured?: boolean;        // Si el Admin lo puso en la sección de Destacados (Hero Carousel)
  featured_fee_paid?: boolean;  // Si el organizador abonó la cuota adicional de promoción destacada
  clicks_count?: number;        // Contador de veces que se abrió o presionó este flyer

  // Estado
  status: EventStatus;
  rejection_reason?: string;
  is_cancelled: boolean;
  cancellation_notice?: string;
  
  created_at: string;
  updated_at?: string;
}

export interface EventReview {
  id: string;
  event_id: string;
  event_title: string;
  organizer_id: string;
  organizer_name: string;
  user_name: string;
  user_email: string;
  rating: number; // 1 a 5 estrellas
  comment?: string;
  created_at: string;
}

export interface PromoterCustomFlyer {
  id: string;
  promoter_email: string;
  event_id: string;
  flyer_url: string;
  label?: string; // Ej: "Flyer con mi foto", "Flyer para Historias"
  created_at: string;
}

export interface PromoterSeller {
  id: string;
  organizer_id: string;
  organizer_name: string;
  name: string;
  email: string;
  whatsapp: string;
  commission_rate?: string; // Ej: "15%" o "$1.500 por entrada"
  assigned_event_ids?: string[]; // IDs de eventos asignados (vacío = todos)
  notes?: string;
  status: 'active' | 'inactive';
  custom_flyers?: PromoterCustomFlyer[];
  created_at: string;
}

export type QuickDateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'custom';

export type SortOption = 'distance' | 'date' | 'rating';

export interface FilterState {
  dateFilter: QuickDateFilter;
  customStartDate?: string;
  customEndDate?: string;
  category: EventCategory | 'all';
  genreFamily: string; // 'all' | 'salsa-y-bachata' | 'bachata' | 'salsa' | 'rock' | 'cachengue' | 'tango' | 'folklore' | 'urbano' | 'otros'
  selectedSubgenre?: string;
  radiusKm: number; // 5, 10, 25, 50, 100
  sortBy: SortOption;
  searchQuery: string;
  onlyFree: boolean;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  cityName: string;
  isManual: boolean;
  hasPermission: boolean;
}

export interface CityPreset {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
}

export interface EventReport {
  id: string;
  event_id: string;
  reporter_email?: string;
  reason: string;
  details?: string;
  is_resolved: boolean;
  created_at: string;
  event_title?: string;
}
