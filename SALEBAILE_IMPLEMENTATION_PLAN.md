# SALEBAILE: Plan de Implementación por Etapas (10 Sprints)

**Objetivo:** Transformar SaleBaile en la experiencia mobile premium unificada representada en la plantilla de 12 pantallas enviada por el usuario, sin romper la lógica existente, la base de datos ni los flujos de pago y staff.

---

## 🗺️ Mapa de Pantallas y Correspondencia de Sprints

| N° | Pantalla en la Plantilla | Sprint Asignado | Componente Principal |
| :---: | :--- | :---: | :--- |
| **1** | **Pantalla Principal (Explorar / Home)** | **Sprint 1** | `ExploreView.tsx` / `NewHomeDemoView.tsx` |
| **2** | **Mapa / Radar de Baile** | **Sprint 3** | `MapView.tsx` |
| **3** | **Detalle de Evento** | **Sprint 2** | `EventDetailModal.tsx` |
| **4** | **Buscar con IA (Voz y Texto)** | **Sprint 5** | `AIAssistantModal.tsx` |
| **5** | **Registro de Usuario (Login / Auth)** | **Sprint 4** | `AuthModal.tsx` |
| **6** | **Selección de Estilos (Onboarding)** | **Sprint 4** | `GenrePreferencesModal.tsx` |
| **7** | **Perfil de Usuario** | **Sprint 6** | `AccountView.tsx` / `ProfileView.tsx` |
| **8** | **Agenda Personal** | **Sprint 6** | `AgendaView.tsx` |
| **9** | **Panel Organizador (SaleBaile PRO)** | **Sprint 7** | `OrganizerDashboard.tsx` |
| **10** | **Crear Evento (Stepper 4 Pasos)** | **Sprint 7** | `EventForm.tsx` |
| **11** | **Analíticas & Estadísticas PRO** | **Sprint 8** | `AnalyticsView.tsx` / `OrganizerStats.tsx` |
| **12** | **Onboarding Final (Bienvenida)** | **Sprint 4 & 9** | `WelcomeOnboardingModal.tsx` |

---

## 🚀 Desglose de los 10 Sprints de Implementación

### SPRINT 1: Design System + Home Definitiva (Pantalla 1)
- Establecer las clases globales y variables CSS de la paleta en `tailwind.config.js` e `index.css`.
- Migrar el componente `NewHomeDemoView` a la vista definitiva `ExploreView.tsx`.
- Header integrado con logo neón, selector de ciudad `📍 Buenos Aires ⌵`, campana con badge `3` y avatar de usuario.
- Título Hero `¿Dónde bailamos hoy?`, buscador glassmorphism con chispas `✨`, selector de 6 géneros en 2 filas con botón `••• Más`.
- Tarjeta de **Radar de Baile (IA)** con círculos concéntricos y conteo de lugares a menos de 15 km.
- Píldoras de fecha (`Hoy`, `Mañana`, `Este finde`, `Cerca mío`), carrusel horizontal de **Eventos destacados** y preview de **Eventos en el mapa**.
- Botón flotante **"Buscar con IA"** con degradado neón.
- **Verificación**: `npm run build`, comprobación de scroll horizontal suave, carga instantánea de flyers y filtros en vivo.

### SPRINT 2: Detalle de Evento (Pantalla 3)
- Modernizar `EventDetailModal.tsx` con la estética de la Pantalla 3:
  - Header translúcido flotante con botón volver, compartir y corazón.
  - Flyer principal amplio con esquinas redondeadas.
  - Píldora de ritmo (`Salsa • Bachata`), título, lugar, fecha y hora, distancia y precio.
  - Fila social con asistentes: `38 van`, `12 guardados`, botón `Compartir`.
  - Botones de acción principales: **`📍 Cómo llegar`** (apertura de Google Maps/Waze) y **`🎟️ Quiero ir`** (apertura de compra de anticipada o reserva).
  - Pestañas de información: `Descripción`, `Artistas`, `Lugar` y `Más`.
  - Cita gráfica y galería de fotos secundarias.
- **Verificación**: Comprobar que los eventos con anticipada abren Mercado Pago o transferencia y los que son gratuitos muestran "Entrada libre".

### SPRINT 3: Radar de Baile & Mapa Interactivo (Pantalla 2)
- Modernizar `MapView.tsx`:
  - Cabecera con título `Radar de Baile` y selector de filtros `Hoy`, `Todos los estilos ⌵`.
  - Tarjeta neón flotante central sobre el mapa: `17 eventos a menos de 15 km` con pulso luminoso.
  - Pines de mapa estilizados en colores neón (fucsia, naranja, cyan y blanco) según el género de baile.
  - Carrusel inferior de tarjetas de eventos cercanos al pin seleccionado (`Salsa en Vivo`, etc.).
  - Selector flotante de vista `Mapa` / `Lista`.
- **Verificación**: Geolocalización por GPS, arrastre de mapa, toque en pines y apertura del flyer correspondiente.

### SPRINT 4: Registro, Selección de Estilos y Onboarding (Pantallas 5, 6 y 12)
- **Registro (Pantalla 5)**:
  - Botones de inicio de sesión social: `Continuar con Google`, `Continuar con Facebook`, `Continuar con Apple`.
  - Separador y campos oscuros: `Nombre`, `Email`, `Contraseña` con botón de visibilidad (ojo).
  - Botón principal de acción con degradado: `Crear cuenta`.
- **Selección de Estilos (Pantalla 6)**:
  - Indicador `Paso 1 de 3` con título `¿Qué bailás?`.
  - Cuadrícula de 12 estilos de baile con iconos y colores diferenciados (Salsa, Bachata, Tango, Rock, Cumbia, Electrónica, Kizomba, Reggaetón, Folklore, Swing, Disco, Otros).
  - Guardado en el perfil de usuario (`favorite_genres`).
- **Onboarding Final (Pantalla 12)**:
  - Pantalla de bienvenida cinematográfica: `¡Todo listo! Ya sos parte de SaleBaile. Descubrí, guardá y compartí los mejores eventos de baile.` con botón `Comenzar a explorar`.
- **Verificación**: Creación de usuario en Firebase Auth y guardado de preferencias en Realtime Database.

### SPRINT 5: Buscar con IA por Voz y Texto (Pantalla 4)
- Rediseñar `AIAssistantModal.tsx`:
  - Cabecera con robot `🤖` y título `Buscar con IA - Decime qué querés bailar`.
  - Sugerencias interactivas en píldoras:
    - *Quiero bailar bachata esta noche cerca mío*
    - *¿Dónde hay rock el sábado?*
    - *Algo gratis para hoy*
    - *Buscame salsa a menos de 10 km*
  - Animación de onda de audio neón con botón de micrófono central para dictado por voz (Web Speech API).
  - Campo de texto inferior: `Escribí tu consulta...` con botón enviar `➤`.
- **Verificación**: Probar el reconocimiento de consultas, filtrado automático de eventos y navegación directa.

### SPRINT 6: Perfil de Usuario & Agenda Personal (Pantallas 7 y 8)
- **Perfil de Usuario (Pantalla 7)**:
  - Foto de perfil circular grande con halo neón, nombre, handle (`@usuario`), bio (*"La vida es mejor bailando 💃"*).
  - Contadores: `Eventos`, `Favoritos`, `Siguiendo`.
  - Botón `Editar perfil`.
  - Menú de opciones: `Mis favoritos`, `Mi agenda`, `Eventos a los que voy`, `Organizadores que sigo`, `Notificaciones`, `Configuración`.
- **Agenda Personal (Pantalla 8)**:
  - Selector de pestañas `Próximos` y `Pasados`.
  - Tarjetas limpias con flyer miniatura, lugar, fecha y hora, y menú de opciones `⋮` (agendar en Google Calendar, compartir).
- **Verificación**: Sincronización de eventos favoritos y agenda personal entre dispositivos.

### SPRINT 7: Panel Organizador & Creador de Eventos (Pantallas 9 y 10)
- **Panel Organizador PRO (Pantalla 9)**:
  - Identidad de productora con enlace a perfil público.
  - 4 métricas en tarjeta: `Visualizaciones`, `Guardados`, `Clics en cómo llegar`, `Compartidos`.
  - Menú de gestión: `Mis eventos`, `Crear nuevo evento`, `Entradas y ventas`, `Estadísticas`, `Promocionar`, `Configuración`.
- **Crear Evento en 4 Pasos (Pantalla 10)**:
  - Stepper visual: `1. Información básica`, `2. Fecha y lugar`, `3. Entradas y precios`, `4. Publicación`.
  - Subida y optimización de flyer con recorte inteligente y compresión webp.
- **Verificación**: Publicación exitosa de eventos, cálculo de precios y autopublicación para verificados.

### SPRINT 8: Analíticas & Métricas Avanzadas (Pantalla 11)
- Módulo de estadísticas para organizadores:
  - Selector de rango: `Últimos 30 días`.
  - Gráfico de visualizaciones diario con línea neón coral.
  - Sub-métricas con porcentaje de crecimiento: `Guardados`, `Cómo llegar`, `Compartidos`, `Personas van`.
  - Gráfico circular / Donut con el origen geográfico de la audiencia (CABA, GBA, Interior, Otros).
- **Verificación**: Visualización responsiva de gráficos sin librerías pesadas que afecten el rendimiento.

### SPRINT 9: Viralidad, Compartir y Crecimiento
- Modal de compartir optimizado con previsualización en WhatsApp, Instagram Stories y Telegram.
- Deep links para que al compartir un flyer por WhatsApp se abra la app directamente en ese evento.
- Generador de banners sociales con branding de SaleBaile.

### SPRINT 10: Optimización Extrema, Rendimiento y QA Final
- Auditoría Lighthouse: Objetivo > 90 en Performance y Accesibilidad.
- Pruebas en Android físico vía APK generado y emuladores.
- Pruebas en iOS / Safari (PWA y notch compatibility con `safe-area-inset`).
- Despliegue final en producción en Firebase Hosting.

---

## 🛡️ Reglas de Seguridad para Cada Sprint
1. **Ejecutar `npm run build`** antes de cada commit.
2. **No alterar los esquemas de datos** de `events.json`, `requests.json` ni `tickets.json` para garantizar retrocompatibilidad.
3. **Mantener la opción de rollback** mediante control de versiones en Git.
4. **Documentar cada entrega** en `walkthrough.md`.
