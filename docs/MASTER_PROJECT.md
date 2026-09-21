# MASTER PROJECT - Bachata Hoy (Bachata Cerca)

Estado del proyecto, checklist de requerimientos y guía de continuidad.

## Estado General
- **Fase**: V1 Funcional Completa (Frontend + PWA + DB Schema + Modo Fallback + Panel Organizador & Admin).
- **Entorno**: React TypeScript + Vite + Tailwind CSS + Supabase/PostGIS + Leaflet.

---

## Checklist de Funcionalidades V1

- [x] **1. Formato y Diseño PWA Móvil-First**
  - [x] Tema oscuro con acentos cálidos (carmesí / ámbar).
  - [x] Navegación: Explorar, Mapa, Agenda, Favoritos, Mi Cuenta / Publicar.
  - [x] PWA Manifest e iconos instalables.
- [x] **2. Descubrimiento y Geolocalización**
  - [x] Acceso sin registro obligatorio.
  - [x] Explicación previa de uso de ubicación y botón "Usar mi ubicación".
  - [x] Selector manual con presets de ciudades (CABA, Córdoba, Rosario, Mendoza, etc.).
  - [x] Filtro de radio: 5, 10, 25, 50, 100 km.
  - [x] Distancia calculada con coordenadas reales (Haversine & PostGIS ST_Distance).
- [x] **3. Pantalla Explorar**
  - [x] Filtros temporales rápidos: Hoy, Mañana, Este fin de semana, Fecha personalizada.
  - [x] Filtros por categoría: Social, Clase, Taller, Festival, Práctica.
  - [x] Tarjetas de eventos con flyer completo sin recortar información.
  - [x] Ordenamiento por proximidad o por fecha.
  - [x] Filtro de eventos vencidos (ocultar eventos finalizados).
  - [x] Estado vacío inteligente con sugerencia de ampliar radio.
- [x] **4. Mapa y Agenda**
  - [x] Leaflet sincronizado con filtros de fecha y categoría.
  - [x] Botón "Buscar en esta zona" para mover el centro sin alterar ubicación del usuario.
  - [x] Agrupamiento (clustering) y modal de previsualización al tocar marcador.
  - [x] Agenda organizada por días con conteo de eventos y vista cronológica.
- [x] **5. Detalle del Evento**
  - [x] Flyer ampliable (modal Lightbox en alta definición).
  - [x] Horario de inicio y fin (manejando cruce de medianoche).
  - [x] Botón "Cómo llegar" (Google Maps / Apple Maps / Waze).
  - [x] Botón "Agregar al calendario" (Google Calendar / .ics).
  - [x] Botón "Compartir" con enlace único directo por URL `?event=<id>`.
  - [x] Botón de contacto directo por WhatsApp e Instagram.
  - [x] Modal de reporte/denuncia de evento fraudulento o erróneo.
  - [x] Cartel destacado si el evento está cancelado.
- [x] **6. Panel del Organizador**
  - [x] Formulario estructurado (Título, Flyer, Horarios, Ubicación exacta, Precio, Categoría).
  - [x] Validación de horarios posteriores al inicio con cruce de medianoche.
  - [x] Selector interactivo de ubicación en el mapa con buscador de dirección.
  - [x] Gestor de eventos propios (borrador, pendiente, publicado, cancelado).
  - [x] Duplicar evento para otra fecha.
- [x] **7. Panel Administrativo**
  - [x] Bandeja de moderación de eventos pendientes (Aprobar / Rechazar con motivo).
  - [x] Bandeja de denuncias con resolución y ocultamiento.
  - [x] Suspensión de organizadores fraudulentos.
- [x] **8. Base de Datos y Seguridad**
  - [x] Script de migración PostGIS con índices espaciales.
  - [x] Políticas de seguridad RLS en todas las tablas.
  - [x] Modo fallback offline con eventos mock de Argentina de demostración.

---

## Pasos para Retomar o Extender
1. **Configurar Supabase en Producción**:
   - Crear un proyecto en [supabase.com](https://supabase.com).
   - Habilitar PostGIS en Database > Extensions.
   - Ejecutar la migración `supabase/migrations/20260913_initial_schema.sql` en el SQL Editor.
   - Crear un bucket en Storage llamado `flyers` y marcarlo como público.
   - Copiar las variables en `.env`: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. **Ejecutar Localmente**:
   ```bash
   cd bachata-hoy
   npm install
   npm run dev
   ```
