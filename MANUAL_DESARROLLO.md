# 📖 Manual de Desarrollo, Configuración y Operaciones • SALE BAILE (Hoy Bailamos)

Este documento contiene la guía completa de arquitectura, configuración de base de datos, procedimientos de despliegue y manual de operaciones para continuar sin problemas el desarrollo de **Sale Baile** en cualquier otra computadora.

---

## 🚀 1. Cómo Abrir y Continuar el Proyecto en Otra Computadora

### Requisitos Previos:
- **Node.js** v18 o superior instalado ([nodejs.org](https://nodejs.org)).
- **Git** instalado ([git-scm.com](https://git-scm.com)).
- **Firebase CLI** (opcional, para despliegues directos): `npm install -g firebase-tools`.

### Pasos de Instalación y Ejecución:
1. **Clonar el repositorio oficial desde GitHub:**
   ```bash
   git clone https://github.com/Benecanico1/hoy-bailamos.git
   ```

2. **Entrar en la carpeta del proyecto:**
   ```bash
   cd hoy-bailamos/bachata-hoy
   ```

3. **Instalar todas las dependencias:**
   ```bash
   npm install
   ```

4. **Iniciar el servidor local de desarrollo:**
   ```bash
   npm run dev
   ```
   El servidor iniciará en `http://localhost:5173`.

### Comandos de Compilación y Calidad:
- **Compilación de Producción:** `npm run build` (ejecuta verificación de tipos TypeScript `tsc -b` y empaqueta con `vite build`).
- **Vista Previa de Producción:** `npm run preview`.
- **Linter:** `npm run lint`.

---

## ☁️ 2. Configuración de Firebase y Base de Datos en la Nube

La aplicación utiliza **Firebase** para el hosting web y para la persistencia en tiempo real en la nube sin límites de cuota diaria.

### A. Firebase Hosting
- **Proyecto Principal:** `hoy-bailamos-app`
- **Dominio de Producción Activo:** [https://salebaile.web.app](https://salebaile.web.app)
- **Dominio Alternativo:** [https://hoy-bailamos-app.web.app](https://hoy-bailamos-app.web.app)
- **Configuración en `firebase.json`:**
  - `site: "salebaile"` y `site: "hoy-bailamos-app"` apuntando al directorio `dist`.
  - Single Page Application (SPA) rewrite a `/index.html`.

**Comando de despliegue de Hosting:**
```bash
npm run build
npx firebase deploy --only hosting --project hoy-bailamos-app
```

---

### B. Firebase Realtime Database (Sincronización Cross-Device)
- **Instancia RTDB:** `openclaw-nyj-ia-web-ddb56-default-rtdb`
- **URL Endpoint:** `https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile.json`
- **Reglas de Seguridad (`database.rules.json`):**
```json
{
  "rules": {
    "sale_baile": {
      ".read": true,
      ".write": true
    }
  }
}
```
- **Comando para desplegar reglas de base de datos:**
```bash
npx firebase deploy --only database --project openclaw-nyj-ia-web-ddb56
```

---

## 👥 3. Sistema de Roles, Cuentas y Permisos

| Rol | Permisos | Identificación / Activación |
| :--- | :--- | :--- |
| **🛡️ Master Admin** | Moderación total de eventos, aprobación de organizadores, configuración de destacados, visualización de GMV y comisiones. | Email maestro: `jesushidalgo25@gmail.com` (automáticamente recibe rol `admin` al iniciar sesión con Google o email). |
| **✨ Organizador** | Formulario para solicitar publicación de eventos/flyers, gestión de equipo Staff, panel de ventas de entradas, escáner de puerta QR, métricas de satisfacción y ranking de eventos. | Requiere aprobación del Administrador tras solicitar el alta o registro manual por el admin. |
| **🎟️ Staff (Puerta)** | Acceso exclusivo al lector de entradas QR y validación por número de DNI en la puerta del evento asignado. | Designado por el Organizador ingresando el email registrado del usuario en la pestaña *Equipo Staff*. |
| **💃 Bailarín (Usuario)** | Exploración geolocalizada por GPS o selector manual, compra de entradas QR con Mercado Pago, agenda, mapa interactivo, reseñas con estrellas y favoritos. | Rol por defecto para todos los usuarios registrados. |

---

## 🎟️ 4. Sistema de Venta de Entradas y Control de Acceso

1. **Compra de Entradas (Usuario):**
   - Selección de cantidad de entradas anticipadas.
   - Ingreso de Nombre, Email, Teléfono y DNI del asistente.
   - Simulación y checkout integrado con Mercado Pago.
   - Emisión instantánea de Pase QR único con código de seguridad y resumen descargable.
   - Pases disponibles en la pestaña *Mis Entradas*.

2. **Liquidación y Modelo de Negocio (Admin / Organizador):**
   - **Comisión de Plataforma:** 10% por defecto sobre cada venta anticipada.
   - **Acuerdo de Reventa:** El organizador puede proponer un precio de reventa mayorista al Admin en el formulario de solicitud.
   - El panel de Administración (`AdminDashboard`) registra el GMV total, comisiones netas y balance a liquidar a cada productor.

3. **Control de Puerta (Escáner QR & DNI):**
   - **Lector de Cámara:** Escaneo en vivo de códigos QR mediante cámara.
   - **Búsqueda por DNI:** Si el asistente no tiene batería o no puede mostrar el QR, el personal de puerta ingresa el DNI y valida el pase al instante.
   - **Protección Anti-Fraude:** Una vez ingresado un ticket, su estado cambia a `checked_in` y bloquea cualquier intento de re-ingreso duplicado.

---

## ⏳ 5. Regla de Caducidad (+24 Horas) y Zona de Historial

- Los eventos se muestran en la **Cartelera Principal** y en la pestaña de exploración mientras estén vigentes.
- **Transición Automática a Historial:** Exactamente **24 horas después** de la hora de finalización del evento (`end_time`), la función `isEventExpired()` oculta el flyer de la cartelera pública y lo traslada a la sección de **Historial (+24h)** del organizador.
- Los flyers pasados permanecen archivados junto con sus calificaciones y comentarios históricos de la comunidad.

---

## 🔄 6. Arquitectura de Sincronización en Tiempo Real

1. **Firebase Realtime Database:** Guarda las solicitudes de organizador y eventos pendientes/publicados en la nube.
2. **Polling Activo:** Consultas cada 4 segundos para detectar cambios realizados desde otros dispositivos.
3. **BroadcastChannel API (`sale_baile_channel_v4`):** Sincronización instantánea (<10ms) entre pestañas y ventanas abiertas en el mismo navegador sin recargar.
4. **LocalStorage Resiliente:** Caché local de alta velocidad para funcionamiento offline:
   - `sale_baile_events_v4`: Lista unificada de eventos.
   - `sale_baile_users_db_v4`: Base de datos de usuarios y solicitudes de organizadores.
   - `sale_baile_auth_user_v4`: Sesión actual del usuario.
   - `sale_baile_tickets_orders_v1`: Registro central de órdenes de compra y tickets emitidos.
   - `sale_baile_reviews_v4`: Reseñas de 1 a 5 estrellas con comentarios de asistentes.

---

## 🛠️ 7. Tecnologías Utilizadas

- **Framework:** React 19 + TypeScript + Vite 8.
- **Estilos:** Tailwind CSS 4 con tema oscuro elegante (`dark-950`, acentos coral `#f43f5e`, naranja `#fb923c` y dorado `#f59e0b`).
- **Mapas y Geocodificación:** Leaflet, React-Leaflet, OpenStreetMap y Nominatim.
- **Códigos QR:** `qrcode` y `canvas-confetti`.
- **Iconografía:** `lucide-react`.
- **Hosting & Backend:** Firebase Hosting, Firebase Realtime Database.
