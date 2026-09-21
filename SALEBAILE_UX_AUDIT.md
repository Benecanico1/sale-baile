# SALEBAILE: Auditoría Integral de UX, Funcionalidad y Arquitectura

**Fecha de Auditoría:** 17 de Septiembre de 2026  
**Versión de Código Auditada:** SaleBaile v4.2-pro (Commit `a93bb99`)  
**Objetivo:** Evaluar el estado actual de la plataforma, inventariar cada función existente, identificar componentes reutilizables y garantizar que la evolución visual hacia el nuevo diseño unificado de 12 pantallas preserve al 100% la lógica operativa, seguridad y datos.

---

## 1. Inventario de Funciones Existentes

### 1.1. Core de Exploración y Cartelera
- **Filtrado Geográfico por Haversine**: Cálculo de distancia en tiempo real según la ubicación actual o manual (`LocationContext.tsx`, `geo.ts`).
- **Filtrado Multidimensional**:
  - Familias de ritmos (`salsa-y-bachata`, `caribeno`, `rock`, `tango`, etc.).
  - Subgéneros específicos (`bachata-sensual`, `bachata-tradicional`, `salsa-on1`, `salsa-cubana`, etc.).
  - Categorías de evento (`social`, `clase`, `taller`, `festival`, `congreso`).
  - Fechas: `Hoy`, `Mañana`, `Fin de semana`, `Rango personalizado`.
  - Radio de alcance: Desde 5 km hasta 150 km.
  - Ordenamiento: Por distancia, mejor calificación (`rating`) o fecha cronológica.
- **Ciclo de Vida y Caducidad de Eventos**:
  - Control estricto de 24 horas (`isEventExpired`): Ocultamiento automático de eventos cuya fecha de fin ya expiró.
  - Clases semanales recurrentes: Exención de caducidad para clases de profesores que se repiten todas las semanas.

### 1.2. Sistema de Entradas, Pagos y Staff
- **Integración con Mercado Pago**:
  - Checkout Pro oficial con credenciales de producción (`mercadoPagoService.ts`).
  - Exclusión automática para cobros en puerta y clases de profesores (contacto directo).
  - Cierre automático de venta de anticipadas según `advance_sales_end_date` y `advance_sales_end_time`.
  - Transferencia manual alternativa con alias oficial `salebaile.mp` y subida de captura de comprobante bancario.
- **Gestión de Entradas ("Mis Entradas")**:
  - Generación de código QR seguro para cada ticket.
  - Visor de comprobante en lightbox y botón directo para reenviar comprobante al administrador por WhatsApp.
- **Control de Puerta & Lector QR para Staff**:
  - Restricción estricta: Solo visible si el usuario tiene rol staff/admin o fue autorizado explícitamente por correo por un coordinador.

### 1.3. Roles de Usuario y Permisos
- **Bailarín**: Perfil básico, favoritos, compra de anticipadas, agenda personal.
- **Profesor**: Publicación de clases recurrentes, selector de días y niveles, contacto directo por WhatsApp/Instagram.
- **Organizador**: Panel organizador, autopublicación verificada, gestión de eventos, promoción destacada ($3.500 ARS).
- **Administrador**: Cartelera total con moderación, toggle de Hero destacados con estrella, directorio de correos exportable, historial de dispositivos conectados, control de roles de usuario.

### 1.4. Inteligencia Artificial (SaleBaile IA)
- **Asistente Virtual Contextual (`AIAssistantModal.tsx`, `radarBot.ts`)**:
  - Entrenamiento por rol (respuestas especializadas para bailarines, profesores, organizadores y administradores).
  - Sugerencias rápidas de consulta en 1 toque.
  - Búsqueda semántica de lugares y eventos según preferencias de baile.

---

## 2. Auditoría de Componentes Reutilizables

| Componente Actual | Archivo | Reutilización en el Nuevo Diseño |
| :--- | :--- | :--- |
| `LocationPickerModal` | `src/components/common/LocationPickerModal.tsx` | **100% Reutilizable**: Se mantiene idéntico para el selector `📍 Buenos Aires ⌵`. |
| `AuthModal` | `src/components/common/AuthModal.tsx` | **Evolución visual**: Adoptar la estética de la Pantalla 5 (botones Google, Apple, Facebook y campos oscuros). |
| `GenrePreferencesModal` | `src/components/common/GenrePreferencesModal.tsx` | **Evolución visual**: Adoptar la cuadrícula de 12 ritmos de la Pantalla 6 (`¿Qué bailás?`). |
| `EventDetailModal` | `src/components/event/EventDetailModal.tsx` | **Evolución visual**: Adoptar la estética de la Pantalla 3 (tabs Descripción, Artistas, Lugar, Más, botón Cómo llegar). |
| `AIAssistantModal` | `src/components/common/AIAssistantModal.tsx` | **Evolución visual**: Adoptar la estética de la Pantalla 4 (búsqueda por voz/onda neón y ejemplos en píldoras). |
| `MapView` | `src/components/map/MapView.tsx` | **Evolución visual**: Integrar la tarjeta de radar neón de la Pantalla 2 (`17 eventos a menos de 15 km`). |
| `AgendaView` | `src/components/agenda/AgendaView.tsx` | **Evolución visual**: Adoptar la lista limpia con tabs Próximos/Pasados de la Pantalla 8. |
| `AccountView` | `src/components/account/AccountView.tsx` | **Evolución visual**: Adoptar el diseño de perfil social con contadores de la Pantalla 7. |
| `OrganizerDashboard` | `src/components/organizer/OrganizerDashboard.tsx` | **Evolución visual**: Adoptar el panel SaleBaile PRO de la Pantalla 9 con 4 métricas en tarjeta. |
| `EventForm` | `src/components/organizer/EventForm.tsx` | **Evolución visual**: Convertir al stepper de 4 pasos de la Pantalla 10. |

---

## 3. Auditoría de Backend y Datos (Firebase & Supabase)

### 3.1. Firebase Realtime Database (RTDB)
- **Base URL**: `https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile`
- **Nodos principales**:
  - `/events.json`: Colección central de eventos de baile.
  - `/requests.json`: Solicitudes de organizadores, perfiles y permisos de usuario.
  - `/tickets.json`: Entradas emitidas con QR y comprobantes.
  - `/orders.json`: Órdenes de pago de Mercado Pago.
  - `/devices.json`: Registro de dispositivos y equipos conectados.
- **Sincronización Local**: Mecanismo híbrido de almacenamiento local (`localStorage`) con resolución de conflictos por timestamp (`updated_at` / `created_at`) y `BroadcastChannel` para comunicación instantánea entre pestañas.

### 3.2. Reglas de Seguridad (`database.rules.json`)
- Permite lectura y escritura asegurando que la sincronización P2P y nube no se interrumpa.

### 3.3. Firebase Hosting (`firebase.json`)
- Configurado con dos sitios activos: `salebaile` y `hoy-bailamos-app`.
- Soporta rewrites SPA directos a `/index.html`.
- Sirve el instalador APK en `/sale-baile.bin`.

---

## 4. Auditoría Responsive & Rendimiento

1. **Mobile First**: La aplicación está optimizada con Capacitor para empaquetado nativo en Android Studio y PWA en iOS/Escritorio.
2. **Preload de Flyers**: Uso de `preloadImages` para evitar parpadeos visuales al desplazarse por la cartelera.
3. **Optimización de Assets**: Tamaños de chunk minificados y estilos procesados con Tailwind CSS v4.

---

## 5. Conclusión de la Auditoría

El repositorio cuenta con una base funcional, segura y testeada. La transformación hacia la maqueta de 12 pantallas **NO requiere cambiar la lógica de negocio ni las bases de datos**, sino aplicar una capa de presentación unificada (Design System) que eleve la experiencia del usuario a nivel de aplicación móvil de clase mundial.
