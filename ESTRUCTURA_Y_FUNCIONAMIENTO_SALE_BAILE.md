# 💃 Sale Baile / Hoy Bailamos
### 📋 Manual Explicativo y Estructura del Sistema (Para no programadores)

> **Versión:** 4.0 Pro Cloud  
> **Estado:** En Producción Activa  
> **Web Oficial:** [https://salebaile.web.app](https://salebaile.web.app)  

---

## 1. ¿Qué es la Aplicación y qué Problema Resuelve?

**Sale Baile** es una plataforma web y móvil inteligente diseñada específicamente para la comunidad del baile social (**Bachata, Salsa, Ritmos Caribeños y Urbanos**).

Funciona como un **puente digital de 3 vías** que conecta a:
1. **Los Bailarines / Alumnos:** Quienes buscan fiestas, prácticas, clases o talleres.
2. **Los Organizadores / Profesores:** Quienes producen eventos y venden entradas.
3. **El Administrador (Tú):** Quien modera, destaca publicaciones, supervisa comisiones y tiene el control total del negocio.

```
                  ┌────────────────────────────────────────┐
                  │          PLATAFORMA SALE BAILE         │
                  └───────────────────┬────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
  👤 BAILARINES                🎪 ORGANIZADORES             👑 ADMINISTRADOR
 (Exploran cartelera,          (Publican sus flyers,       (Aprueba solicitudes,
  compran tickets con QR)       designan Staff y puerta)    destaca eventos y modera)
```

---

## 2. Los 3 Roles de Usuarios (Cómo interactúa cada uno)

### 👤 ROL 1: El Bailarín (Usuario Común)
Es cualquier persona que entra a la aplicación desde su celular o computadora para buscar dónde ir a bailar o aprender.

* **Cartelera Visual en Vivo:** Ve todos los flyers organizados por fechas (*Hoy*, *Mañana*, *Fin de semana*).
* **GPS y Distancia Exacta:** La aplicación calcula automáticamente a cuántos kilómetros le queda cada evento (ejemplo: *a 2.5 km en Plaza Los Patos de Merlo*).
* **Filtros por Ritmo:** Puede filtrar y ver solo *Bachata Sensual*, *Salsa Cubana*, *Talleres*, *Boliches* o *Eventos Gratuitos*.
* **Boletería con Código QR:** Compra su entrada anticipada y el sistema le genera un pase digital con un código QR único que queda guardado en la pestaña **"Mis Entradas"** para entrar sin necesidad de imprimir papel.
* **Historial Automático:** Los eventos que terminaron hace más de 24 horas pasan a la sección de *Historial*, manteniendo la cartelera limpia y siempre al día.
* **Calificaciones y Reseñas:** Luego de asistir, puede dejarle estrellas y opiniones al organizador.

---

### 🎪 ROL 2: El Organizador (Profesores, Academias y Boliches)
Son los productores de eventos que difunden sus clases y fiestas.

* **Solicitud de Alta:** Envían su solicitud al Administrador con sus datos (nombre, WhatsApp, Instagram) para ser habilitados.
* **Subida Inteligente de Flyers:** Al subir una foto de 5 MB, la app la comprime automáticamente a ~90 KB sin perder calidad para que cargue al instante y no gaste datos.
* **Designación de Staff en Puerta:** El organizador puede escribir el correo de sus colaboradores para nombrarlos **Staff**.
* **Escáner QR de Entrada:** El Staff abre la cámara desde la app y escanea los códigos QR de los asistentes:
  * 🟢 **Verde:** Entrada válida y registrada.
  * 🔴 **Rojo:** Entrada inválida o ya utilizada (evita fraudes y duplicados).
* **Métricas de Recaudación:** Ve en tiempo real cuántas entradas vendió y cuánto dinero recaudó.

---

### 👑 ROL 3: El Administrador (Tu Centro de Control Maestro)
Es tu cuenta con control total sobre la plataforma y el modelo de negocio.

* **Centro Unificado de Moderación:** Cada nuevo organizador que se registra o cada nuevo flyer enviado llega directo a tu panel.
* **Aprobación Dual con 1 Clic:**
  * **Aprobar Estándar:** El evento sale a la cartelera pública.
  * **Aprobar como DESTACADO (⭐):** El evento aparece arriba de todo en el carrusel de portada con corona dorada (ideal para cobrar una tarifa publicitaria).
  * **Rechazar con Motivo:** Permite rechazar publicaciones de baja calidad indicando el motivo al organizador.
* **Control de Comisiones:** Puedes fijar comisiones de reventa por cada entrada que se venda por la app.
* **Botón de Sincronización en Vivo:** Actualiza y recarga cualquier solicitud o evento en tiempo real en todos los dispositivos.

---

## 3. ¿Cómo Funciona la Boletería Digital?

| Paso | Acción del Usuario | Resultado en la Plataforma |
| :--- | :--- | :--- |
| **1. Compra** | El bailarín compra su entrada anticipada. | Se genera un código QR criptográfico único asociado a su cuenta. |
| **2. Custodia** | El boleto queda guardado en *"Mis Entradas"*. | Funciona offline en el celular, sin necesidad de imprimir. |
| **3. Acceso** | El Staff de puerta enfoca el QR con la cámara. | La app valida la entrada en 1 segundo y registra el ingreso. |

---

## 4. ¿Cómo Funciona la Tecnología por Dentro?

* **☁️ Firebase Realtime Database (Base de Datos en Vivo):** Es el cerebro central en la nube. Si tú apruebas un flyer desde tu celular, en 1 segundo aparece en el teléfono de todos los bailarines sin necesidad de recargar la página.
* **🚀 Firebase Hosting (Servidor Web):** La página web está alojada en la infraestructura mundial de Google en `https://salebaile.web.app` disponible 24/7 de forma rápida y segura.
* **🔒 GitHub (Caja Fuerte de Código):** Todo el código fuente, componentes y configuraciones están guardados en el repositorio oficial para que puedas abrir el proyecto en cualquier computadora en el futuro.
* **⚡ Optimización de Rendimiento:** Sistema de carga fluida a 60/120 FPS que elimina cualquier traba o parpadeo al scrollear flyers.

---

*© 2026 Sale Baile / Hoy Bailamos • Plataforma Oficial de Difusión y Boletería.*
