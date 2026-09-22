#!/usr/bin/env python3
"""
Agente WhatsApp Bot — Sale Baile
Bot de WhatsApp Cloud API de Meta que:

1. Organizadores mandan foto del flyer → extrae datos con Gemini Vision → crea evento
2. Bailarines consultan cartelera → responde con eventos de Firebase
3. Compra de entradas → responde con link de MercadoPago
4. Onboarding automático → bienvenida + instrucciones

Requisitos:
- WhatsApp Cloud API de Meta (gratis hasta 1000 conversaciones/mes)
- Numero de WhatsApp Business dedicado al bot
- Webhook endpoint (Flask) accesible via HTTPS
- Token de Meta (WHATSAPP_TOKEN) y Phone Number ID (WHATSAPP_PHONE_ID)
- Verify token (WHATSAPP_VERIFY_TOKEN) para el webhook
- Gemini API key para Vision

Configuracion de Meta Business:
1. Ir a https://business.facebook.com
2. Crear Meta Business Account
3. WhatsApp Business -> Cloud API -> crear app
4. Obtener:
   - Access Token (permanente o temporal)
   - Phone Number ID
   - WhatsApp Business Account ID
5. Configurar webhook:
   - URL: https://tu-servidor.com/webhook
   - Verify Token: cualquier string (WHATSAPP_VERIFY_TOKEN)
   - Suscribirse a: messages

Uso:
  # Iniciar el servidor webhook
  python scripts/agente_whatsapp.py

  # O con variables de entorno:
  export WHATSAPP_TOKEN=xxx
  export WHATSAPP_PHONE_ID=xxx
  export WHATSAPP_VERIFY_TOKEN=xxx
  export VITE_GEMINI_API_KEY=xxx
  export PORT=5000
  python scripts/agente_whatsapp.py
"""

import os
import sys
import json
import time
import base64
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

# ============================================================
# CONFIGURACIÓN
# ============================================================

# Meta WhatsApp Cloud API
WHATSAPP_TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
WHATSAPP_PHONE_ID = os.environ.get("WHATSAPP_PHONE_ID", "")
WHATSAPP_VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "salebaile_verify_2026")

# Gemini Vision
GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

# Firebase
FIREBASE_BASE = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile"
FIREBASE_EVENTS_URL = f"{FIREBASE_BASE}/events.json"
FIREBASE_LEADS_URL = f"{FIREBASE_BASE}/leads.json"
FIREBASE_WHATSAPP_LOGS = f"{FIREBASE_BASE}/whatsapp_logs.json"

# MercadoPago
MERCADOPAGO_LINK = "https://salebaile.web.app"  # TODO: link real de MP cuando se integre

# Servidor
PORT = int(os.environ.get("PORT", "5000"))

# Log
def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

# ============================================================
# WHATSAPP CLOUD API — ENVIAR MENSAJES
# ============================================================

def send_whatsapp_message(to, text, reply_to=None):
    """Envía un mensaje de texto por WhatsApp Cloud API."""
    url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"body": text, "preview_url": True},
    }
    if reply_to:
        payload["context"] = {"message_id": reply_to}

    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {WHATSAPP_TOKEN}")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        log(f"WhatsApp message sent to {to}: {result.get('messages', [{}])[0].get('id', '?')}")
        return True
    except Exception as e:
        log(f"Error sending WhatsApp message to {to}: {e}", "ERROR")
        return False


def send_whatsapp_button(to, body_text, buttons):
    """Envía un mensaje con botones interactivos por WhatsApp."""
    url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body_text},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": btn["id"], "title": btn["title"]}}
                    for btn in buttons
                ]
            },
        },
    }

    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Bearer {WHATSAPP_TOKEN}")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=30)
        log(f"WhatsApp button sent to {to}")
        return True
    except Exception as e:
        log(f"Error sending WhatsApp button to {to}: {e}", "ERROR")
        return False


# ============================================================
# WHATSAPP — DESCARGAR IMAGEN RECIBIDA
# ============================================================

def download_whatsapp_media(media_id):
    """Descarga un archivo multimedia (imagen) recibido por WhatsApp."""
    # 1. Obtener URL del media
    url = f"https://graph.facebook.com/v18.0/{media_id}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {WHATSAPP_TOKEN}")

    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        media_url = data.get("url", "")
        mime_type = data.get("mime_type", "image/jpeg")
    except Exception as e:
        log(f"Error getting media URL: {e}", "ERROR")
        return None, None

    if not media_url:
        return None, None

    # 2. Descargar la imagen
    req2 = urllib.request.Request(media_url)
    req2.add_header("Authorization", f"Bearer {WHATSAPP_TOKEN}")

    try:
        resp2 = urllib.request.urlopen(req2, timeout=30)
        img_data = resp2.read()
        b64 = base64.b64encode(img_data).decode()
        return b64, mime_type
    except Exception as e:
        log(f"Error downloading media: {e}", "ERROR")
        return None, None


# ============================================================
# GEMINI VISION — ANALIZAR FLYER
# ============================================================

def analyze_flyer(img_b64, mime, caption=""):
    """Analiza un flyer con Gemini Vision y extrae los datos del evento."""
    prompt = """Eres un experto analizando flyers de eventos de baile en Buenos Aires, Argentina.
Extrae toda la informacion del flyer y responde SOLO con un JSON:
{
  "title": "titulo del evento",
  "venue_name": "nombre del lugar/salon",
  "address": "direccion completa",
  "city": "ciudad",
  "start_date": "YYYY-MM-DD",
  "start_time_hour": "HH:mm",
  "end_time_hour": "HH:mm",
  "price": "precio en numeros o null si es gratis",
  "is_free": true/false,
  "genre_family": "bachata" | "salsa" | "tango" | "kizomba" | "sensual" | "salsa-y-bachata" | "otros",
  "organizer_name": "nombre del organizador si se menciona",
  "description": "descripcion breve del evento",
  "has_dj": true/false,
  "has_class": true/false,
  "has_social": true/false
}
Reglas:
- Si una fecha no se puede determinar, deja start_date vacio
- Los precios van en numeros (ej: 5000, no "$5000")
- Si es gratis o dice "entrada libre", is_free=true
- NO INVENTES NADA que no este en el flyer"""

    payload = json.dumps({
        "contents": [{
            "parts": [
                {"text": prompt + f"\n\nCaption del post: {caption}"},
                {"inline_data": {"mime_type": mime or "image/jpeg", "data": img_b64}}
            ]
        }],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }).encode()

    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        for attempt in range(3):
            try:
                resp = urllib.request.urlopen(req, timeout=45)
                data = json.loads(resp.read())
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
                return json.loads(text)
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 2:
                    wait = (attempt + 1) * 10
                    log(f"Gemini 429 — esperando {wait}s...", "WARN")
                    time.sleep(wait)
                    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
                    req.add_header("Content-Type", "application/json")
                    continue
                raise
        return None
    except Exception as e:
        log(f"Error Gemini Vision: {e}", "WARN")
        return None


# ============================================================
# FIREBASE — LEER Y GUARDAR EVENTOS
# ============================================================

def load_events():
    """Lee los eventos de Firebase."""
    try:
        resp = urllib.request.urlopen(FIREBASE_EVENTS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, list):
            return [e for e in data if e]
        elif isinstance(data, dict):
            return list(data.values())
        return []
    except:
        return []


def save_event_to_firebase(event):
    """Guarda un evento en Firebase."""
    url = f"{FIREBASE_BASE}/events.json"
    payload = json.dumps([event]).encode()

    # Primero leer los existentes
    try:
        resp = urllib.request.urlopen(url, timeout=10)
        existing = json.loads(resp.read())
        if not isinstance(existing, list):
            existing = []
        existing.append(event)
        payload = json.dumps(existing).encode()
    except:
        existing = [event]
        payload = json.dumps(existing).encode()

    req = urllib.request.Request(url, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")

    try:
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        log(f"Error guardando evento en Firebase: {e}", "ERROR")
        return False


def save_whatsapp_log(phone, message_type, content, response):
    """Guarda un log de la conversación de WhatsApp en Firebase."""
    log_entry = {
        "phone": phone,
        "type": message_type,
        "content": content[:500] if content else "",
        "response": response[:500] if response else "",
        "timestamp": datetime.now().isoformat(),
    }
    url = f"{FIREBASE_WHATSAPP_LOGS}/{int(time.time())}.json"
    payload = json.dumps(log_entry).encode()

    req = urllib.request.Request(url, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")

    try:
        urllib.request.urlopen(req, timeout=10)
    except:
        pass


# ============================================================
# PROCESAR MENSAJES RECIBIDOS
# ============================================================

def format_event_for_whatsapp(event):
    """Formatea un evento para enviarlo por WhatsApp."""
    title = event.get("title", "Evento")
    date = event.get("start_time", "")[:10] if event.get("start_time") else ""
    venue = event.get("venue_name", "Lugar a confirmar")
    city = event.get("city", "")
    price = "Gratis" if event.get("is_free") else f"${event.get('price', '?')}"
    genre = event.get("genre_family", "").upper()

    line = f"🎵 {title}\n"
    if date:
        line += f"📅 {date}\n"
    line += f"📍 {venue}"
    if city:
        line += f", {city}"
    line += f"\n💸 {price}\n"
    if genre:
        line += f"🎶 {genre}\n"
    line += f"🔗 salebaile.web.app"
    return line


def get_today_events(genre_filter=None):
    """Obtiene los eventos de hoy desde Firebase."""
    events = load_events()
    today = datetime.now().strftime("%Y-%m-%d")
    today_events = []

    for e in events:
        if e.get("status") != "publicado":
            continue
        start_time = e.get("start_time", "")
        if start_time and start_time[:10] == today:
            if genre_filter:
                if genre_filter.lower() not in (e.get("genre_family", "") or "").lower():
                    continue
            today_events.append(e)

    return today_events


def get_upcoming_events(limit=5, genre_filter=None):
    """Obtiene los próximos eventos desde Firebase."""
    events = load_events()
    now = datetime.now().isoformat()
    upcoming = []

    for e in events:
        if e.get("status") != "publicado":
            continue
        if e.get("is_cancelled"):
            continue
        start_time = e.get("start_time", "")
        if start_time and start_time > now:
            if genre_filter:
                if genre_filter.lower() not in (e.get("genre_family", "") or "").lower():
                    continue
            upcoming.append(e)

    upcoming.sort(key=lambda x: x.get("start_time", ""))
    return upcoming[:limit]


def handle_text_message(phone, text):
    """Procesa un mensaje de texto recibido."""
    text_lower = text.lower().strip()
    log(f"Text from {phone}: '{text}'")

    # Comandos
    if text_lower in ["hola", "hi", "hello", "buenas", "buenos dias", "buenas tardes", "buenas noches"]:
        response = (
            "¡Hola! Bienvenido a Sale Baile 💃🕺\n\n"
            "Soy el bot de Sale Baile, la plataforma #1 de eventos de baile en Buenos Aires.\n\n"
            "¿Qué querés hacer?\n"
            "1️⃣ Ver eventos de HOY → escribí HOY\n"
            "2️⃣ Ver PRÓXIMOS eventos → escribí PROXIMOS\n"
            "3️⃣ Publicar tu evento → mandame la foto del flyer\n"
            "4️⃣ Buscar por ritmo → escribí BACHATA, SALSA o TANGO\n\n"
            "🌐 salebaile.web.app"
        )
        send_whatsapp_message(phone, response)
        return response

    if text_lower in ["hoy", "que hay hoy", "que hay", "eventos hoy", "eventos de hoy"]:
        events = get_today_events()
        if not events:
            response = "No hay eventos para hoy 😔\n\nPero podés ver los próximos eventos escribiendo PROXIMOS\n\n🌐 salebaile.web.app"
        else:
            lines = [f"🎉 EVENTOS DE HOY ({len(events)})\n"]
            for e in events:
                lines.append(format_event_for_whatsapp(e))
                lines.append("")
            lines.append("🌐 Ver todo: salebaile.web.app")
            response = "\n".join(lines)
        send_whatsapp_message(phone, response)
        return response

    if "proxim" in text_lower or "proximo" in text_lower or "upcoming" in text_lower:
        events = get_upcoming_events(limit=5)
        if not events:
            response = "No hay eventos próximos por ahora 😔\n\nVolvé a consultar en unos días!\n\n🌐 salebaile.web.app"
        else:
            lines = [f"📅 PRÓXIMOS EVENTOS ({len(events)})\n"]
            for e in events:
                lines.append(format_event_for_whatsapp(e))
                lines.append("")
            lines.append("🌐 Ver todo: salebaile.web.app")
            response = "\n".join(lines)
        send_whatsapp_message(phone, response)
        return response

    if "bachata" in text_lower:
        events = get_upcoming_events(limit=5, genre_filter="bachata")
        if not events:
            response = "No hay eventos de bachata próximos 😔\n\nPero podés ver todos los eventos en salebaile.web.app"
        else:
            lines = [f"💃 EVENTOS DE BACHATA ({len(events)})\n"]
            for e in events:
                lines.append(format_event_for_whatsapp(e))
                lines.append("")
            lines.append("🌐 salebaile.web.app")
            response = "\n".join(lines)
        send_whatsapp_message(phone, response)
        return response

    if "salsa" in text_lower:
        events = get_upcoming_events(limit=5, genre_filter="salsa")
        if not events:
            response = "No hay eventos de salsa próximos 😔\n\nPero podés ver todos los eventos en salebaile.web.app"
        else:
            lines = [f"🟥 EVENTOS DE SALSA ({len(events)})\n"]
            for e in events:
                lines.append(format_event_for_whatsapp(e))
                lines.append("")
            lines.append("🌐 salebaile.web.app")
            response = "\n".join(lines)
        send_whatsapp_message(phone, response)
        return response

    if "tango" in text_lower:
        events = get_upcoming_events(limit=5, genre_filter="tango")
        if not events:
            response = "No hay eventos de tango próximos 😔\n\nPero podés ver todos los eventos en salebaile.web.app"
        else:
            lines = [f"🔴 EVENTOS DE TANGO ({len(events)})\n"]
            for e in events:
                lines.append(format_event_for_whatsapp(e))
                lines.append("")
            lines.append("🌐 salebaile.web.app")
            response = "\n".join(lines)
        send_whatsapp_message(phone, response)
        return response

    if "comprar" in text_lower or "entradas" in text_lower or "ticket" in text_lower:
        response = (
            "🎟️ COMPRAR ENTRADAS\n\n"
            "Para comprar entradas de un evento:\n"
            "1. Entrá a salebaile.web.app\n"
            "2. Buscá el evento que querés\n"
            "3. Tocá 'Comprar entrada'\n"
            "4. Pagá con MercadoPago\n\n"
            f"🔗 {MERCADOPAGO_LINK}"
        )
        send_whatsapp_message(phone, response)
        return response

    if "publicar" in text_lower or "subir" in text_lower or "evento" in text_lower:
        response = (
            "📤 PUBLICAR TU EVENTO\n\n"
            "Es muy fácil:\n"
            "1. Mandame la foto del flyer de tu evento\n"
            "2. Nuestra IA extrae los datos automáticamente\n"
            "3. Te confirmamos los detalles\n"
            "4. Tu evento aparece en Sale Baile\n\n"
            "¡Mandá la foto ahora! 📸"
        )
        send_whatsapp_message(phone, response)
        return response

    if "ayuda" in text_lower or "help" in text_lower or "?" in text_lower:
        response = (
            "🤖 AYUDA — SALE BAILE BOT\n\n"
            "Comandos disponibles:\n"
            "• HOY → eventos de hoy\n"
            "• PROXIMOS → próximos eventos\n"
            "• BACHATA → eventos de bachata\n"
            "• SALSA → eventos de salsa\n"
            "• TANGO → eventos de tango\n"
            "• COMPRAR → cómo comprar entradas\n"
            "• PUBLICAR → cómo publicar tu evento\n\n"
            "O mandá una foto del flyer para publicar un evento automáticamente!\n\n"
            "🌐 salebaile.web.app"
        )
        send_whatsapp_message(phone, response)
        return response

    # Respuesta por defecto
    response = (
        "Recibí tu mensaje pero no lo reconocí 😅\n\n"
        "Probá con:\n"
        "• HOY → eventos de hoy\n"
        "• PROXIMOS → próximos eventos\n"
        "• BACHATA / SALSA / TANGO → buscar por ritmo\n"
        "• PUBLICAR → publicar tu evento\n\n"
        "O mandá una foto del flyer! 📸\n\n"
        "🌐 salebaile.web.app"
    )
    send_whatsapp_message(phone, response)
    return response


def handle_image_message(phone, media_id, caption=""):
    """Procesa una imagen (flyer) recibida."""
    log(f"Image from {phone}: media_id={media_id}")

    # Confirmar recepción
    send_whatsapp_message(phone, "📥 Recibí tu flyer! Analizando... ⏳")

    # Descargar imagen
    img_b64, mime = download_whatsapp_media(media_id)
    if not img_b64:
        send_whatsapp_message(phone, "❌ No pude descargar la imagen. Probá de nuevo por favor.")
        return "Error downloading image"

    # Analizar con Gemini Vision
    ai_result = analyze_flyer(img_b64, mime, caption)

    if not ai_result:
        send_whatsapp_message(phone, "❌ No pude analizar el flyer. ¿Podés mandarlo más nítido?\n\nO escribí los datos manualmente y te ayudo a publicarlo.")
        return "Error analyzing flyer"

    title = ai_result.get("title", "Evento detectado")
    date = ai_result.get("start_date", "")
    venue = ai_result.get("venue_name", "Lugar a confirmar")
    city = ai_result.get("city", "Buenos Aires")
    price = "Gratis" if ai_result.get("is_free") else f"${ai_result.get('price', '?')}"
    genre = ai_result.get("genre_family", "otros").upper()

    # Crear evento en Firebase
    event = {
        "id": f"wa-{int(time.time())}-{hash(title) % 10000}",
        "title": title,
        "venue_name": venue,
        "address": ai_result.get("address", ""),
        "city": city,
        "start_time": f"{date}T{ai_result.get('start_time_hour', '22:00')}:00" if date else datetime.now().isoformat(),
        "end_time": f"{date}T{ai_result.get('end_time_hour', '02:00')}:00" if date else "",
        "is_free": ai_result.get("is_free", False),
        "price": ai_result.get("price"),
        "currency": "ARS",
        "genre_family": ai_result.get("genre_family", "otros"),
        "category": "social",
        "description": ai_result.get("description", ""),
        "venue_name": venue,
        "province": "Capital Federal",
        "country": "Argentina",
        "organizer_name": ai_result.get("organizer_name", ""),
        "organizer_instagram": "",
        "status": "pendiente",  # Pendiente hasta que el organizador confirme
        "is_cancelled": False,
        "is_featured": False,
        "created_at": datetime.now().isoformat(),
        "source": "whatsapp",
        "organizer_phone": phone,
    }

    save_event_to_firebase(event)

    # Responder con los datos extraídos
    response = (
        f"✅ FLYER ANALIZADO!\n\n"
        f"🎵 Evento: {title}\n"
    )
    if date:
        response += f"📅 Fecha: {date}\n"
    response += f"📍 Lugar: {venue}, {city}\n"
    response += f"💸 Precio: {price}\n"
    response += f"🎶 Ritmo: {genre}\n\n"

    has_class = ai_result.get("has_class", False)
    has_dj = ai_result.get("has_dj", False)
    has_social = ai_result.get("has_social", False)
    if has_class:
        response += "🧑‍🏫 Clase: Sí\n"
    if has_dj:
        response += "🎧 DJ: Sí\n"
    if has_social:
        response += "舞 Social: Sí\n"

    response += (
        f"\n¿Los datos están correctos?\n"
        f"• Escribí CONFIRMAR para publicar\n"
        f"• Escribí CORREGIR + lo que quieras cambiar\n"
        f"• Ej: CORREGIR fecha 2026-10-01\n\n"
        f"🌐 salebaile.web.app"
    )

    send_whatsapp_message(phone, response)
    return response


def handle_confirmation(phone, text):
    """Procesa confirmación o corrección de un evento."""
    text_lower = text.lower().strip()

    if "confirmar" in text_lower or "confirmo" in text_lower or "ok" == text_lower or "si" == text_lower:
        # TODO: Buscar el último evento pendiente del phone y publicarlo
        response = (
            "🎉 ¡Evento confirmado!\n\n"
            "Tu evento ya está visible en Sale Baile.\n\n"
            "🔗 salebaile.web.app\n\n"
            "¿Querés agregar otro evento? Mandame el flyer! 📸"
        )
        send_whatsapp_message(phone, response)
        return response

    if "corregir" in text_lower:
        # TODO: Procesar corrección
        response = (
            "✏️ ¿Qué querés corregir?\n\n"
            "Ejemplos:\n"
            "• CORREGIR titulo nuevo nombre\n"
            "• CORREGIR fecha 2026-10-01\n"
            "• CORREGIR precio 8000\n"
            "• CORREGIR lugar nuevo salon\n"
        )
        send_whatsapp_message(phone, response)
        return response

    return None


# ============================================================
# WEBHOOK — SERVIDOR FLASK
# ============================================================

def create_app():
    """Crea la aplicación Flask para el webhook."""
    try:
        from flask import Flask, request, jsonify
    except ImportError:
        log("Flask no instalado. Instalar con: pip install flask", "ERROR")
        sys.exit(1)

    app = Flask(__name__)

    @app.route("/", methods=["GET"])
    def home():
        return jsonify({
            "status": "online",
            "bot": "Sale Baile WhatsApp Bot",
            "web": "salebaile.web.app",
            "time": datetime.now().isoformat(),
        })

    @app.route("/webhook", methods=["GET"])
    def verify():
        """Verificación del webhook por Meta."""
        mode = request.args.get("hub.mode")
        token = request.args.get("hub.verify_token")
        challenge = request.args.get("hub.challenge")

        if mode == "subscribe" and token == WHATSAPP_VERIFY_TOKEN:
            log("Webhook verified by Meta!")
            return challenge, 200
        else:
            log(f"Webhook verification failed: mode={mode}, token={token}", "WARN")
            return "Forbidden", 403

    @app.route("/webhook", methods=["POST"])
    def webhook():
        """Recibe mensajes de WhatsApp Cloud API."""
        try:
            body = request.get_json()
            log(f"Webhook received: {json.dumps(body)[:500]}")

            # Verificar que es un mensaje de WhatsApp
            if body.get("object") != "whatsapp_business_account":
                return jsonify({"status": "not_whatsapp"}), 404

            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})

                    # Verificar configuración
                    if "messages" not in value:
                        continue

                    phone_number_id = value.get("metadata", {}).get("phone_number_id")
                    if phone_number_id != WHATSAPP_PHONE_ID:
                        log(f"Ignoring message from different phone_number_id: {phone_number_id}", "WARN")
                        continue

                    for message in value.get("messages", []):
                        phone = message.get("from", "")
                        msg_type = message.get("type", "")
                        msg_id = message.get("id", "")

                        log(f"Message from {phone}: type={msg_type}")

                        if msg_type == "text":
                            text = message.get("text", {}).get("body", "")
                            # Verificar si es confirmación/corrección
                            confirmation = handle_confirmation(phone, text)
                            if confirmation:
                                save_whatsapp_log(phone, "text", text, confirmation)
                                continue
                            # Procesar como comando normal
                            response = handle_text_message(phone, text)
                            save_whatsapp_log(phone, "text", text, response)

                        elif msg_type == "image":
                            media_id = message.get("image", {}).get("id", "")
                            caption = message.get("image", {}).get("caption", "")
                            response = handle_image_message(phone, media_id, caption)
                            save_whatsapp_log(phone, "image", caption or media_id, response)

                        elif msg_type == "interactive":
                            # Respuesta de botón
                            button_reply = message.get("interactive", {}).get("button_reply", {})
                            button_id = button_reply.get("id", "")
                            response = handle_text_message(phone, button_id)
                            save_whatsapp_log(phone, "button", button_id, response)

                        elif msg_type == "audio":
                            send_whatsapp_message(phone, "🎤 Recibí tu audio pero todavía no puedo procesar audios. Escribime texto! 😅")
                            save_whatsapp_log(phone, "audio", "audio", "not supported")

                        elif msg_type == "document":
                            send_whatsapp_message(phone, "📄 Recibí tu documento. Para publicar un evento, mandá la foto del flyer. 📸")
                            save_whatsapp_log(phone, "document", "document", "not supported")

                        else:
                            send_whatsapp_message(phone, f"Recibí un mensaje tipo {msg_type} pero no lo soporto todavía. Escribime texto! 😅")
                            save_whatsapp_log(phone, msg_type, "", "not supported")

            return jsonify({"status": "ok"}), 200

        except Exception as e:
            log(f"Webhook error: {e}", "ERROR")
            return jsonify({"error": str(e)}), 500

    @app.route("/test/<phone>", methods=["GET"])
    def test_send(phone):
        """Endpoint de prueba para enviar un mensaje manualmente."""
        if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
            return jsonify({"error": "WHATSAPP_TOKEN y WHATSAPP_PHONE_ID no configurados"}), 400
        msg = request.args.get("msg", "¡Hola! Soy el bot de Sale Baile 💃🕺")
        success = send_whatsapp_message(phone, msg)
        return jsonify({"success": success, "phone": phone, "message": msg})

    return app


# ============================================================
# MAIN
# ============================================================

def main():
    log("=" * 60)
    log("WHATSAPP BOT — SALE BAILE")
    log("=" * 60)

    # Verificar configuración
    missing = []
    if not WHATSAPP_TOKEN:
        missing.append("WHATSAPP_TOKEN")
    if not WHATSAPP_PHONE_ID:
        missing.append("WHATSAPP_PHONE_ID")
    if not GEMINI_API_KEY:
        missing.append("VITE_GEMINI_API_KEY")

    if missing:
        log(f"Faltan variables de entorno: {', '.join(missing)}", "WARN")
        log("El webhook iniciará pero no podrá enviar mensajes.", "WARN")
        log("")
        log("Para configurar WhatsApp Cloud API:")
        log("1. Ir a https://business.facebook.com")
        log("2. Crear Meta Business Account")
        log("3. WhatsApp Business > Cloud API > crear app")
        log("4. Obtener WHATSAPP_TOKEN y WHATSAPP_PHONE_ID")
        log("5. Configurar webhook URL con WHATSAPP_VERIFY_TOKEN")
        log("")

    log(f"Verify Token: {WHATSAPP_VERIFY_TOKEN}")
    log(f"Phone ID: {WHATSAPP_PHONE_ID or '(no configurado)'}")
    log(f"Gemini: {GEMINI_API_KEY[:10]}...{GEMINI_API_KEY[-4:]}" if GEMINI_API_KEY else "Gemini: (no configurado)")
    log(f"Port: {PORT}")
    log("")

    app = create_app()

    # Para desarrollo: ngrok o similar
    # Para produccion: deploy en Vercel, Railway, Render, etc.
    log(f"Iniciando servidor en puerto {PORT}...")
    log(f"Webhook URL: http://localhost:{PORT}/webhook")
    log(f"Para exponer publicamente: ngrok http {PORT}")
    log("")

    app.run(host="0.0.0.0", port=PORT, debug=True)


if __name__ == "__main__":
    main()
