#!/usr/bin/env python3
"""
Agente Auto-Detección — Sale Baile
Monitorea las cuentas de organizadores ya registrados en Sale Baile,
detecta nuevos posts con flyers de eventos, extrae los datos con Gemini
Vision y crea borradores automáticos en Firebase.

Diferencia con agente_radar.py:
  - Radar: carga eventos publicados/pendientes directamente a events.json
  - Auto-Detección: crea borradores en sale_baile/auto_drafts para que el
    organizador revise y confirme desde la app

Pipeline:
  1. Lee las cuentas monitoreadas de Firebase (sale_baile/monitored_accounts)
     o usa las 9 por defecto
  2. Scrapea los últimos posts de cada cuenta con Apify
  3. Filtra los posts que parecen flyers de evento
  4. Extrae datos con Gemini Vision (título, fecha, lugar, precio, género)
  5. Crea borrador en sale_baile/auto_drafts con status "pending"
  6. Notifica al organizador (mensaje guardado para envío manual)

Uso: python scripts/agente_autodeteccion.py
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import time
import os
import sys
import base64
from datetime import datetime

# ============================================================
# CONFIGURACIÓN
# ============================================================

APIFY_TOKEN = os.environ.get("VITE_APIFY_TOKEN", os.environ.get("APIFY_TOKEN", ""))
GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

FIREBASE_BASE = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile"
FIREBASE_DRAFTS_URL = f"{FIREBASE_BASE}/auto_drafts.json"
FIREBASE_EVENTS_URL = f"{FIREBASE_BASE}/events.json"

# Cuentas monitoreadas (mismo default que radarBot.ts)
MONITORED_ACCOUNTS = [
    {"handle": "@melanybys",            "name": "Melany Bys (José C. Paz)",          "category_tag": "bachata"},
    {"handle": "@bailamosacademia",      "name": "Club Bailamos (Ramos Mejía)",      "category_tag": "bachata"},
    {"handle": "@chambeasalsaybachata",  "name": "Chambea Salsa & Bachata (Morón)",  "category_tag": "salsa"},
    {"handle": "@saborlatino.ok",        "name": "Academia Sabor Latino (Monte Grande)", "category_tag": "salsa"},
    {"handle": "@lasalseracom",          "name": "La Salsera (CABA)",                 "category_tag": "salsa"},
    {"handle": "@jorge_solohaga",        "name": "Jorge Solohaga (Salsa y Bachata)",  "category_tag": "bachata"},
    {"handle": "@salsaarriba",           "name": "Salsa Arriba (CABA)",               "category_tag": "salsa"},
    {"handle": "@lavirubachatera",       "name": "La Viru Bachatera",                 "category_tag": "bachata"},
    {"handle": "@ceresitobi",            "name": "Ceresito BI (Morón)",               "category_tag": "salsa"},
]

# Proxies CORS para descargar imágenes
PROXIES = [
    lambda u: f"https://api.allorigins.win/raw?url={urllib.parse.quote(u)}",
    lambda u: f"https://corsproxy.io/?{urllib.parse.quote(u)}",
    lambda u: f"https://api.codetabs.com/v1/proxy?quest={urllib.parse.quote(u)}",
]

# ============================================================
# LOG
# ============================================================

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

# ============================================================
# 1. SCRAPER DE INSTAGRAM (Apify)
# ============================================================

def scrape_instagram(handle, limit=3):
    """Scrapea los posts más recientes de una cuenta de Instagram."""
    clean = handle.replace("@", "").strip()
    direct_url = f"https://www.instagram.com/{clean}/"

    actor_url = f"https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    payload = json.dumps({
        "directUrls": [direct_url],
        "resultsType": "posts",
        "resultsLimit": limit,
    }).encode()

    req = urllib.request.Request(actor_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=90)
        data = json.loads(resp.read())
        return data if isinstance(data, list) else []
    except Exception as e:
        log(f"  Error scrapeando {handle}: {e}", "ERROR")
        return []


# ============================================================
# 2. DESCARGAR IMAGEN DEL FLYER
# ============================================================

def download_image(url):
    """Descarga una imagen y la devuelve como base64."""
    # Intentar directo primero
    for attempt in range(2):
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            resp = urllib.request.urlopen(req, timeout=15)
            img_data = resp.read()
            if img_data and len(img_data) > 1000:
                b64 = base64.b64encode(img_data).decode()
                mime = resp.headers.get("Content-Type", "image/jpeg")
                return b64, mime, len(img_data)
        except:
            pass

    # Intentar con proxies CORS
    for proxy in PROXIES:
        try:
            proxy_url = proxy(url)
            req = urllib.request.Request(proxy_url)
            req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            resp = urllib.request.urlopen(req, timeout=15)
            img_data = resp.read()
            if img_data and len(img_data) > 1000:
                b64 = base64.b64encode(img_data).decode()
                mime = resp.headers.get("Content-Type", "image/jpeg")
                return b64, mime, len(img_data)
        except:
            continue

    return None, None, 0


# ============================================================
# 3. ANALIZAR FLYER CON GEMINI VISION
# ============================================================

def analyze_flyer(img_b64, mime, caption):
    """Analiza un flyer con Gemini Vision y extrae los datos del evento."""
    prompt = """Eres un experto analizando flyers de eventos de baile en Buenos Aires, Argentina.
Extrae toda la información del flyer y responde SOLO con un JSON:

{
  "title": "título del evento",
  "venue_name": "nombre del lugar/salón",
  "address": "dirección completa",
  "city": "ciudad",
  "start_date": "YYYY-MM-DD",
  "start_time_hour": "HH:mm",
  "end_time_hour": "HH:mm",
  "price": "precio en números o null si es gratis",
  "is_free": true/false,
  "genre_family": "bachata" | "salsa" | "tango" | "kizomba" | "sensual" | "salsa-y-bachata" | "otros",
  "organizer_name": "nombre del organizador si se menciona",
  "description": "descripción breve del evento",
  "has_dj": true/false,
  "has_class": true/false,
  "has_social": true/false
}

Reglas:
- Si una fecha no se puede determinar, deja start_date vacío
- Los precios van en números (ej: 5000, no "$5000")
- Si es gratis o dice "entrada libre", is_free=true
- NO INVENTES NADA que no esté en el flyer"""

    payload = json.dumps({
        "contents": [{
            "parts": [
                {"text": prompt},
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
                    log(f"  Gemini 429 — esperando {wait}s...", "WARN")
                    time.sleep(wait)
                    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
                    req.add_header("Content-Type", "application/json")
                    continue
                raise
        return None
    except Exception as e:
        log(f"  Error Gemini Vision: {e}", "WARN")
        return None


# ============================================================
# 4. HEURÍSTICA: ¿ES UN FLYER DE EVENTO?
# ============================================================

EVENT_KEYWORDS = [
    "entrada", "cover", "clase", "social", "fiesta", "evento",
    "milonga", "practica", "festival", "workshop", "taller",
    "salsa", "bachata", "tango", "kizomba", "sensual",
    "viernes", "sábado", "sabado", "domingo", "jueves",
]

def is_flyer_post(post):
    """Determina si un post es probablemente un flyer de evento."""
    caption = (post.get("caption", "") or "").lower()
    has_image = bool(post.get("displayUrl") or post.get("imageUrl") or post.get("images"))
    has_keywords = any(kw in caption for kw in EVENT_KEYWORDS)
    return has_image and has_keywords


# ============================================================
# 5. FIREBASE
# ============================================================

def load_existing_drafts():
    """Lee los borradores existentes para no duplicar."""
    try:
        resp = urllib.request.urlopen(FIREBASE_DRAFTS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, dict):
            return data
        return {}
    except:
        return {}


def save_draft(key, draft):
    """Guarda un borrador en Firebase con PUT."""
    url = f"{FIREBASE_BASE}/auto_drafts/{key}.json"
    payload = json.dumps(draft).encode()

    req = urllib.request.Request(url, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")

    try:
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        log(f"  Error guardando draft {key}: {e}", "ERROR")
        return False


def load_existing_events():
    """Lee eventos existentes para no duplicar."""
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


# ============================================================
# 6. GENERAR MENSAJE DE NOTIFICACIÓN
# ============================================================

def generate_notification(handle, event_title, event_date):
    """Genera un mensaje de notificación para el organizador."""
    date_str = event_date[:10] if event_date else "fecha a confirmar"
    return f"¡Hola {handle}! Detectamos tu evento \"{event_title}\" en Instagram. Ya lo tenemos como borrador en Sale Baile. ¿Lo publicamos? 🎉 salebaile.web.app"


# ============================================================
# 7. PIPELINE PRINCIPAL
# ============================================================

def run():
    log("=== AGENTE AUTO-DETECCIÓN — SALE BAILE ===")
    log(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    log("")

    if not APIFY_TOKEN:
        log("FALTA VITE_APIFY_TOKEN en .env", "ERROR")
        sys.exit(1)

    # 1. Cargar datos existentes
    log("Paso 1: Cargando borradores y eventos existentes...")
    existing_drafts = load_existing_drafts()
    existing_events = load_existing_events()
    existing_post_urls = set()
    for e in existing_events:
        if e.get("source_url"):
            existing_post_urls.add(e["source_url"])
    for d in existing_drafts.values():
        if d.get("source_url"):
            existing_post_urls.add(d["source_url"])
    log(f"Borradores: {len(existing_drafts)} | Eventos: {len(existing_events)} | URLs conocidas: {len(existing_post_urls)}")

    # 2. Scrapear cada cuenta (limitar a 3 para que termine en tiempo)
    MAX_ACCOUNTS = 3
    accounts_to_scan = MONITORED_ACCOUNTS[:MAX_ACCOUNTS] if len(MONITORED_ACCOUNTS) > MAX_ACCOUNTS else MONITORED_ACCOUNTS
    log(f"Paso 2: Scrapeando {len(accounts_to_scan)} cuentas monitoreadas (de {len(MONITORED_ACCOUNTS)} total)...")
    new_drafts = []
    stats = {"scraped": 0, "flyers": 0, "analyzed": 0, "drafts": 0, "skipped": 0}

    for account in accounts_to_scan:
        handle = account["handle"]
        log(f"")
        log(f"  📸 {handle} ({account['name']})")

        posts = scrape_instagram(handle, limit=2)
        stats["scraped"] += len(posts)
        log(f"     → {len(posts)} posts encontrados")

        for post in posts:
            post_url = post.get("url", "")

            # ¿Ya existe este post?
            if post_url and post_url in existing_post_urls:
                log(f"     ⏭️ Post ya procesado, saltando")
                stats["skipped"] += 1
                continue

            # ¿Es un flyer de evento?
            if not is_flyer_post(post):
                log(f"     ⏭️ No es flyer de evento, saltando")
                stats["skipped"] += 1
                continue

            stats["flyers"] += 1
            image_url = post.get("displayUrl") or post.get("imageUrl") or ""
            caption = post.get("caption") or ""

            if not image_url:
                log(f"     ⚠️ Sin imagen, saltando", "WARN")
                continue

            # Descargar imagen
            log(f"     📥 Descargando flyer...")
            img_b64, mime, img_size = download_image(image_url)

            if not img_b64:
                log(f"     ⚠️ No se pudo descargar la imagen", "WARN")
                continue

            # Analizar con Gemini Vision
            log(f"     🤖 Analizando con Gemini Vision...")
            ai_result = analyze_flyer(img_b64, mime, caption)
            stats["analyzed"] += 1

            if not ai_result:
                log(f"     ⚠️ Gemini no pudo analizar el flyer", "WARN")
                continue

            title = ai_result.get("title", "Evento detectado")
            log(f"     ✅ Evento detectado: \"{title}\"")

            # Crear borrador
            draft_id = f"draft-{int(time.time())}-{hash(post_url) % 100000}"
            draft = {
                "id": draft_id,
                "source_account": handle,
                "source_url": post_url,
                "source_caption": caption[:500],
                "flyer_url": f"data:{mime};base64,{img_b64}" if img_b64 else image_url,
                "extracted_data": ai_result,
                "title": title,
                "venue_name": ai_result.get("venue_name", ""),
                "address": ai_result.get("address", ""),
                "city": ai_result.get("city", "Buenos Aires"),
                "start_date": ai_result.get("start_date", ""),
                "start_time_hour": ai_result.get("start_time_hour", "22:00"),
                "end_time_hour": ai_result.get("end_time_hour", "02:00"),
                "price": ai_result.get("price"),
                "is_free": ai_result.get("is_free", False),
                "genre_family": ai_result.get("genre_family", "otros"),
                "organizer_name": ai_result.get("organizer_name", handle.replace("@", "")),
                "description": ai_result.get("description", ""),
                "has_dj": ai_result.get("has_dj", False),
                "has_class": ai_result.get("has_class", False),
                "has_social": ai_result.get("has_social", False),
                "notification_message": generate_notification(
                    handle,
                    title,
                    ai_result.get("start_date", "")
                ),
                "status": "pending",  # pending → published → dismissed
                "detected_at": datetime.now().isoformat(),
            }

            if save_draft(draft_id, draft):
                stats["drafts"] += 1
                new_drafts.append(draft)
                log(f"     💾 Borrador guardado en Firebase")
            else:
                log(f"     ❌ Error guardando borrador", "ERROR")

            time.sleep(2)  # Rate limiting para Gemini

        time.sleep(1)  # Pausa entre cuentas

    # 3. Reporte final
    log("")
    log("=" * 70)
    log("REPORTE FINAL — AGENTE AUTO-DETECCIÓN")
    log("=" * 70)
    log(f"Cuentas monitoreadas:   {len(MONITORED_ACCOUNTS)}")
    log(f"Posts scrapeados:       {stats['scraped']}")
    log(f"Flyers detectados:      {stats['flyers']}")
    log(f"Flyers analizados:      {stats['analyzed']}")
    log(f"Borradores nuevos:      {stats['drafts']}")
    log(f"Posts saltados (dups):  {stats['skipped']}")
    log("")

    if new_drafts:
        log("BORRADORES GENERADOS:")
        log("-" * 70)
        for d in new_drafts:
            log(f"  📋 {d['source_account']} → \"{d['title']}\"")
            log(f"     📅 {d['start_date'] or 'fecha a confirmar'} | 📍 {d['venue_name'] or 'lugar a confirmar'}")
            log(f"     💰 {'Gratis' if d['is_free'] else d.get('price', '?')} | 🎶 {d['genre_family']}")
            log(f"     💬 \"{d['notification_message']}\"")
            log(f"")

    log("✅ Auto-Detección completado. Borradores en Firebase: sale_baile/auto_drafts")
    log("    Los organizadores pueden revisar y publicar desde la app.")
    log("=" * 70)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    run()
