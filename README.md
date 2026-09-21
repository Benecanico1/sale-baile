# Sale Baile (Hoy Bailamos) 💃🕺

> Aplicación web y PWA móvil-first para descubrir eventos, sociales, clases y festivales de bachata y salsa por ubicación geográfica real y fecha en Argentina, con venta de entradas QR, control de puerta y moderación en vivo.

👉 **[📖 Ver Manual Completo de Desarrollo, Configuración y Operaciones](./MANUAL_DESARROLLO.md)**

---

## 🌟 Características Principales

1. **Flyers como Protagonistas**: Visualización vertical de alta calidad sin recortes de texto ni logos.
2. **Geolocalización Sin Fricción**:
   - Descubrimiento sin necesidad de registrarse.
   - Permiso de GPS bajo demanda o selector manual con presets de Argentina (CABA, Zona Norte, Zona Sur, Zona Oeste, Córdoba, Rosario, Mendoza, etc.).
   - Radios de búsqueda: 5, 10, 25, 50 y 100 km.
   - Cálculo de distancias reales mediante fórmula de Haversine y PostGIS `ST_Distance`.
3. **Exploración y Filtros Rápidos**:
   - Fechas: Hoy, Mañana, Este fin de semana, Elegir fecha.
   - Categorías: Social, Clase, Taller, Festival, Práctica.
   - Ordenamiento por cercanía o por fecha.
4. **Mapa Interactivo con Leaflet**:
   - Marcadores temáticos según categoría.
   - Función *"Buscar en esta zona"* para explorar otras localidades sin cambiar tu ubicación de origen.
5. **Agenda Cronológica por Día**:
   - Agrupación por fecha con conteo de eventos y detalle de horarios que cruzan la medianoche.
6. **Detalle Completo del Evento**:
   - Flyer ampliable en alta resolución (Lightbox).
   - Botón "Cómo llegar" (Google Maps / Waze).
   - Botón "Agregar al Calendario" (Google Calendar / .ics).
   - Botón "Compartir" con enlace único directo (`?event=ID`).
   - Contactos directos de WhatsApp e Instagram del organizador.
   - Formulario para denunciar datos incorrectos o fraude.
7. **Panel del Organizador**:
   - Carga de flyers JPG/PNG/WebP con vista previa y validación.
   - Formulario estructurado con validación de horarios pasadas las 00:00.
   - Búsqueda de dirección con OpenStreetMap Nominatim.
   - Guardar borradores, duplicar eventos para otra fecha o cancelar con aviso destacado.
8. **Panel de Moderación (Admin)**:
   - Bandeja de revisión de eventos pendientes con aprobación/rechazo y motivo.
   - Bandeja de denuncias ciudadanas.
9. **PWA Instalable**:
   - Manifest y estilos listos para instalarse en pantalla de inicio de Android e iOS.
   - Paleta de colores cálidos y sensuales sobre fondo oscuro (`#07090e`, `#f43f5e`, `#fb923c`, `#f59e0b`).

---

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Requisitos
- Node.js 18+ instalado.

### 2. Instalación y Ejecución
```bash
# Entrar a la carpeta del proyecto
cd bachata-hoy

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre tu navegador en `http://localhost:5173`. La aplicación incluye datos mock de eventos en Argentina listos para usar sin necesidad de configurar servicios externos de inmediato.

---

## 🗄️ Conexión con Supabase y PostGIS (Producción)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **Database > Extensions** y activa la extensión `postgis`.
3. Abre el **SQL Editor** y ejecuta la migración ubicada en:
   [`supabase/migrations/20260913_initial_schema.sql`](./supabase/migrations/20260913_initial_schema.sql)
4. En **Storage**, crea un bucket público llamado `flyers`.
5. Copia tus credenciales en un archivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
   ```

---

## 📂 Estructura del Proyecto

```
bachata-hoy/
├── docs/
│   ├── PRODUCT.md                # Visión, decisiones y modelo de datos
│   └── MASTER_PROJECT.md         # Checklist de avances y guía de trabajo
├── public/
│   ├── favicon.svg               # Icono de la marca
│   └── manifest.webmanifest      # Configuración PWA
├── src/
│   ├── components/
│   │   ├── account/              # Favoritos, Mi Cuenta y switch de roles
│   │   ├── admin/                # Moderación de eventos y denuncias
│   │   ├── agenda/               # Calendario cronológico por días
│   │   ├── common/               # Navbar, BottomNav, Modales de ubicación y login
│   │   ├── event/                # Detalle, Lightbox, Compartir y Denunciar
│   │   ├── explore/              # Feed de flyers, chips y filtros de radio
│   │   ├── map/                  # Mapa interactivo Leaflet y buscador por zona
│   │   └── organizer/            # Formulario, uploader de flyers y mis eventos
│   ├── context/
│   │   ├── AuthContext.tsx       # Sesión y roles (Visitante, Organizador, Admin)
│   │   ├── FavoritesContext.tsx  # Guardado y persistencia de favoritos
│   │   ├── FilterContext.tsx     # Filtros globales sincronizados
│   │   └── LocationContext.tsx   # GPS bajo demanda y selector manual
│   ├── lib/
│   │   ├── dateUtils.ts          # Husos horarios y cruce de medianoche
│   │   ├── geo.ts                # Haversine, presets Argentina y geocodificación OSM
│   │   ├── mockData.ts           # Eventos reales de ejemplo con fechas dinámicas
│   │   └── supabase.ts           # Cliente Supabase con fallback offline/demo
│   ├── types/
│   │   └── index.ts              # Modelos TypeScript completos
│   ├── App.tsx                   # Enrutador principal y layout
│   ├── index.css                 # Estilos Tailwind y tema oscuro
│   └── main.tsx
├── supabase/
│   └── migrations/
│       └── 20260913_initial_schema.sql # Esquema PostGIS, RLS y RPC
└── package.json
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19, TypeScript, Vite.
- **Estilos y UI**: Tailwind CSS, Lucide React Icons, Canvas Confetti.
- **Mapas**: Leaflet, React-Leaflet, OpenStreetMap, Nominatim.
- **Backend / Database**: Supabase, PostgreSQL, PostGIS (`geography(Point, 4326)`).
