# SALEBAILE: Sistema de Diseño Unificado (Design System)

**Versión:** 2.0  
**Inspiración:** Maqueta Integral de 12 Pantallas Mobile First  
**Lema:** *¿Dónde bailamos hoy? Tu app. Tu noche. Tu gente. — Más Baile, Más Vida.*

---

## 1. Paleta de Colores y Gradiantes Neón

### 1.1. Colores de Fondo y Superficie (OLED Dark Mode)
- **Fondo Base (`oled-950`)**: `#050508` (Negro absoluto para pantallas OLED).
- **Tarjetas de Vidrio (`oled-900/90`)**: `rgba(9, 11, 16, 0.90)` con `backdrop-blur-md`.
- **Bordes Translúcidos**: `border-white/10` o `border-white/15`.
- **Superficie Activa / Hover (`dark-800`)**: `#181d29`.

### 1.2. Acentos Neón de Marca (Brand Accents)
- **Fuego Coral (`dance-coral`)**: `#ff6b4a` (Identidad principal, logos, ubicación, botones secundarios).
- **Carmesí Sensual (`dance-crimson`)**: `#ff2d55` (Badges de alerta, acentos de radar, llamadas a la acción).
- **Dorado VIP / Entrada (`dance-amber`)**: `#ffb300` (Precios, estrellas, destacados).
- **Violeta Noche (`dance-violet`)**: `#8b5cf6` (Fondo de ritmos urbanos y detalles de bachata).
- **Verde Libre / Confirmado (`dance-emerald`)**: `#10b981` (Entradas libres, estado verificado, pases válidos).

### 1.3. Degradados Oficiales (Gradients)
- **Degradado Primario (CTA / Botones principales)**:
  `bg-gradient-to-r from-dance-coral via-dance-crimson to-pink-600`
- **Degradado Título Hero ("bailamos hoy?")**:
  `bg-gradient-to-r from-orange-400 via-pink-500 to-purple-400 bg-clip-text text-transparent`
- **Degradado Tarjeta Radar**:
  `bg-gradient-to-r from-purple-950/40 via-rose-950/30 to-oled-900 border border-dance-crimson/50 shadow-glow-crimson/20`
- **Degradado Botón Buscar con IA**:
  `bg-gradient-to-r from-dance-coral via-dance-crimson to-purple-600`

---

## 2. Tipografía y Jerarquía Visual

- **Fuente Principal**: `"Plus Jakarta Sans"`, `Inter`, `system-ui`, `sans-serif`.
- **Pesos Utilizados**:
  - `font-black` (900): Títulos Hero (`¿Dónde bailamos hoy?`), logotipos, métricas destacadas.
  - `font-extrabold` (800): Encabezados de sección (`🔥 Eventos destacados`, `📍 Eventos en el mapa`).
  - `font-bold` (700): Nombres de eventos, botones, tabs, etiquetas de precio.
  - `font-medium` / `font-normal` (500/400): Subtítulos, descripciones, metadatos (hora, distancia).

---

## 3. Componentes Base del Sistema

### 3.1. Barra de Navegación Inferior (Bottom Bar)
- **Estilo**: Fondo negro translúcido `bg-oled-950/95 backdrop-blur-xl border-t border-white/10`.
- **5 Pestañas Fijas**:
  1. `Explorar` (`Flame` / Llama)
  2. `Mapa` (`Map` / Radar)
  3. `Agenda` (`Calendar` / Calendario)
  4. `Favoritos` (`Heart` / Corazón)
  5. `Mi Cuenta` (`User` / Avatar)
- **Estado Activo**: Icono y texto en `text-dance-coral` o `text-dance-crimson` con punto de brillo inferior.

### 3.2. Tarjetas de Evento (Cards)
- **Formato**: Esquinas redondeadas `rounded-3xl`, fondo `bg-oled-900/90`, borde sutil `border-white/10`.
- **Flyer**: Aspect ratio 4:3 o 3:4 con degradado inferior para legibilidad de textos.
- **Botón Favorito**: Círculo flotante en la esquina superior derecha `bg-black/50 backdrop-blur-md` con icono de corazón.
- **Píldoras de Información**: Categoría, género, horario, distancia y precio anticipada / entrada libre.

### 3.3. Botones de Acción (Buttons)
- **Primario (CTA)**: `rounded-2xl py-3 px-6 bg-gradient-to-r from-dance-coral via-dance-crimson to-pink-600 text-white font-black shadow-glow-coral`.
- **Secundario / Vidrio**: `rounded-2xl py-3 px-5 bg-white/10 hover:bg-white/15 text-white font-bold border border-white/15`.
- **Píldoras de Ritmos**: Cuadrículas redondeadas `rounded-2xl py-2 px-3` con colores distintivos por ritmo:
  - Salsa: Rojo/Coral
  - Bachata: Púrpura/Índigo
  - Rock: Azul/Cyan
  - Tango: Ámbar/Naranja
  - Cumbia: Esmeralda/Teal
  - Electrónica: Cyan/Celeste

### 3.4. Efectos de Resplandor Neón (Glow Effects)
- `shadow-glow-crimson`: `0 0 35px -5px rgba(255, 45, 85, 0.45)`
- `shadow-glow-coral`: `0 0 35px -5px rgba(255, 107, 74, 0.45)`
- `shadow-glass-card`: `0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)`

---

## 4. Reglas de Accesibilidad y Ergonomía Táctil (Mobile-First)

1. **Targets táctiles mínimos**: Todo botón interactivo o pill tiene una altura mínima de 44px para una pulsación cómoda con el pulgar.
2. **Contraste de lectura**: Textos principales en blanco `#ffffff` sobre fondos oscuros, garantizando un ratio de contraste superior a 7:1 (AAA).
3. **Animaciones fluidas**: Transiciones suaves de 200ms a 300ms con aceleración por hardware (`transform`, `opacity`).
