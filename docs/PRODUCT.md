# Bachata Hoy (Bachata Cerca) - Documento de Producto

## 1. Misión y Propósito
**Bachata Hoy** es una plataforma móvil-first diseñada para conectar a la comunidad bachatera (bailarines, alumnos, profesores y organizadores) con eventos presenciales (sociales, talleres, clases magistrales, festivales y prácticas) ordenados por proximidad geográfica real y fecha.

## 2. Principios de Diseño
- **Flyer First**: Los flyers son obras de arte y contienen toda la información visual. La app los muestra completos, con relación de aspecto natural, sin recortar textos ni logos.
- **Fricción Cero para Descubrir**: Se puede buscar, filtrar, ver mapas y consultar la agenda completa sin registrarse.
- **Geolocalización Ética y Bajo Demanda**:
  - No rastreo permanente en segundo plano.
  - Permiso de GPS solicitado únicamente al presionar "Usar mi ubicación".
  - Selector manual con presets de ciudades (Buenos Aires, Córdoba, Rosario, Mendoza, etc.) si se niega el GPS o para explorar a distancia.
  - Función "Buscar en esta zona" en el mapa para explorar otras localidades sin cambiar la ubicación de origen.
- **Diseño Móvil y Paleta Sensual de Baile**:
  - Fondo oscuro de alto contraste (`#0d0f14`, `#161a23`).
  - Acentos cálidos: Rosa carmesí (`#f43f5e`), naranja atardecer (`#fb923c`), dorado ámbar (`#eab308`).
  - Tipografía clara, botones con áreas táctiles generosas (48px+).

## 3. Modelo de Datos y Roles

### Roles de Usuario
1. **Público / Visitante**: Acceso libre a explorar, mapa, agenda, compartir enlace directo y denunciar eventos.
2. **Usuario Registrado**: Guarda favoritos en la nube, gestiona su perfil.
3. **Organizador**: Crea eventos, sube flyers optimizados, define ubicación exacta en el mapa, gestiona borradores, duplica eventos y envía a revisión.
4. **Administrador**: Revisa la cola de moderación, aprueba o rechaza eventos con motivo, gestiona denuncias y suspende organizadores fraudulentos.

### Ciclo de Vida del Evento
- `borrador`: En edición por el organizador.
- `pendiente`: Enviado a moderación (no visible al público).
- `publicado`: Visible en búsquedas si la fecha de fin no ha expirado.
- `rechazado`: Devuelto al organizador con motivo explicativo.
- `cancelado`: Mantiene su página pública pero con aviso visual destacado de cancelación.

## 4. Tecnologías y Proveedores
- **Frontend**: React 18/19, TypeScript, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet.
- **Backend & Database**: Supabase (PostgreSQL 15+) con extensión PostGIS (`geography(Point, 4326)`).
- **Mapas & Geocodificación**: OpenStreetMap + Nominatim con control de peticiones y caché local para respetar límites de servicio.
- **PWA**: Soporte offline para shell, instalación en pantalla de inicio de Android e iOS.
