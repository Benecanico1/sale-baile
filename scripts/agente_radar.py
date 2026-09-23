#!/usr/bin/env python3
"""
Agente Radar Bot — Sale Baile
Scrapea cuentas de Instagram de organizadores de baile,
analiza los flyers con Gemini Vision, valida los datos
y carga los eventos reales en Firebase RTDB.

Uso: python agente_radar.py
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import base64
import time
import sys
import os
from datetime import datetime, timedelta

# ============================================================
# CONFIGURACIÓN
# ============================================================

# Apify (scraper de Instagram)
APIFY_TOKEN = os.environ.get("VITE_APIFY_TOKEN", os.environ.get("APIFY_TOKEN", ""))

# Gemini Vision (IA de Google)
GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

# Firebase RTDB
FIREBASE_EVENTS_URL = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile/events.json"

# Cuentas de Instagram monitoreadas (incluye @salebaile — cuenta profesional del proyecto)
MONITORED_ACCOUNTS = [
    {"handle": "@melanybys",            "name": "Melany Bys (José C. Paz)",          "category_tag": "bachata"},
    {"handle": "@bailamosacademia",      "name": "Club Bailamos (Ramos Mejía)",      "category_tag": "bachata"},
    {"handle": "@chambeasalsaybachata",  "name": "Chambea Salsa & Bachata (Morón)",  "category_tag": "salsa"},
    {"handle": "@salebaile",           "name": "Sale Baile (Cuenta Oficial)",     "category_tag": "oficial"},
    {"handle": "@saborlatino.ok",        "name": "Academia Sabor Latino (Monte Grande)", "category_tag": "salsa"},
    {"handle": "@lasalseracom",          "name": "La Salsera (CABA)",                 "category_tag": "salsa"},
    {"handle": "@jorge_solohaga",        "name": "Jorge Solohaga (Salsa y Bachata)",  "category_tag": "bachata"},
    {"handle": "@salsaarriba",           "name": "Salsa Arriba (CABA)",               "category_tag": "salsa"},
    {"handle": "@lavirubachatera",       "name": "La Viru Bachatera",                 "category_tag": "bachata"},
    {"handle": "@ceresitobi",            "name": "Ceresito BI (Morón)",               "category_tag": "salsa"},
]

# Instagram cookies para cuenta profesional @salebaile (leer de .env.instagram)
INSTAGRAM_SESSION = {}
try:
    for key in ["INSTAGRAM_SESSION_ID", "INSTAGRAM_SESSION_DATA"]:
        val = os.environ.get(key, "")
        if val:
            INSTAGRAM_SESSION[key.lower().replace("instagram_session_", "")] = val
except:
    pass

# Proxies CORS para descargar imágenes de Instagram
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
# 1.5 SCRAPER INSTAGRAM CON INSTAGRAPI (respaldo gratuito si Apify falla 402)
# ============================================================

def scrape_instagram_instagrapi(handle, limit=5):
    try:
        from instagrapi import Client
        user = os.environ.get("INSTAGRAM_USERNAME", "salebaile")
        pw = os.environ.get("INSTAGRAM_PASSWORD", "")
        cl = Client()
        cl.login(user, pw)
        user_id = cl.user_id_from_username(handle.replace("@", "").strip())
        posts = cl.user_medias(user_id, amount=limit)
        results = []
        for p in posts:
            results.append({
                "imageUrl": p.thumbnail_url if p.thumbnail_url else p.image_versions2["candidates"][0]["url"],
                "caption": p.caption_text or "",
                "likesCount": p.like_count,
                "author": handle,
                "timestamp": p.created_at_utc.isoformat() if hasattr(p.created_at_utc, 'isoformat') else str(p.created_at_utc),
            })
        log(f"  ✅ instagrapi: {len(results)} posts de {handle}")
        return results
    except Exception as e:
        log(f"  ⚠️ instagrapi falló para {handle}: {e}")
        return None

# ============================================================
# 2. SCRAPER DE INSTAGRAM (Apify)
# ============================================================

def scrape_instagram(handle):
    """Scrapea los posts más recientes de una cuenta de Instagram usando Apify."""
    clean = handle.replace("@", "").strip()
    direct_url = f"https://www.instagram.com/{clean}/"
    
    actor_url = f"https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    payload = json.dumps({
        "directUrls": [direct_url],
        "resultsType": "posts",
        "resultsLimit": 5,
    }).encode()
    
    req = urllib.request.Request(actor_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    
    try:
        resp = urllib.request.urlopen(req, timeout=90)
        posts = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        # Si Apify da 402 (token agotado/vencido), usar respaldo gratuito: instagrapi
        if e.code == 402:
            log(f"  ⚠️ Apify 402 ({handle}) — usando respaldo instagrapi (cuenta @salebaile)")
            posts = scrape_instagram_instagrapi(handle, limit=5)
            if posts:
                return posts
        log(f"  ❌ Error scrapeando {handle}: HTTP {e.code}")
        return []

    if not isinstance(posts, list) or len(posts) == 0:
        return []

    return posts

# ============================================================
# 2. DESCARGAR IMAGEN
# ============================================================

def download_image(image_url):
    """Descarga una imagen usando proxies CORS y la devuelve como base64."""
    for proxy_fn in PROXIES:
        try:
            proxy_url = proxy_fn(image_url)
            resp = urllib.request.urlopen(proxy_url, timeout=30)
            img_bytes = resp.read()
            
            if len(img_bytes) < 500:
                continue
            
            # Verificar que es una imagen real (no HTML)
            if img_bytes[:2] == b'\xff\xd8' or img_bytes[:4] == b'\x89PNG':
                mime = "image/jpeg"
                if img_bytes[:4] == b'\x89PNG':
                    mime = "image/png"
                b64 = base64.b64encode(img_bytes).decode()
                return b64, mime, len(img_bytes)
        except:
            continue
    
    return None, None, 0

# ============================================================
# 3. GEMINI VISION (anti-alucinación)
# ============================================================

PROMPT_GEMINI = """Eres un extractor de datos de flyers de eventos de baile. Tu UNICO trabajo es leer lo que ESTA ESCRITO en la imagen y el texto. No interpretes, no asumas, no completes informacion faltante.

REGLAS ABSOLUTAS:
- Si un dato NO aparece claramente en la imagen o el texto, pon null. SIN EXCEPCIONES.
- No asumas la ciudad aunque reconozcas el barrio. Solo pon la ciudad si esta escrita.
- No asumas el precio. Solo ponlo si hay un numero visible con signo de pesos ($), la palabra "pesos", "entrada", "puerta", "valor", "ticket" o "costo" cerca.
- No asumas el organizador por el estilo del flyer. Solo ponlo si esta escrito.
- Si la fecha no es legible o ambigua, pon null en start_date. No adivines.
- Si el flyer no tiene claramente la palabra "gratis", "entrada libre" o "sin cargo", pon is_free: false y price: null.
- El año: si NO esta escrito en el flyer, pon null. No asumas el año actual.

Extrae SOLO estos campos:
1. "title": El titulo principal del evento escrito en el flyer. null si no hay titulo claro.
2. "organizer_name": Nombre del organizador escrito en el flyer. null si no figura.
3. "venue_name": Nombre del lugar/salon. null si no figura.
4. "address": Direccion escrita (calle y numero). null si no figura.
5. "city": Ciudad o barrio escrito en el flyer. null si no figura.
6. "start_date": Fecha en formato YYYY-MM-DD. null si no esta claramente escrita.
7. "start_time_hour": Hora de inicio en formato HH:MM. null si no figura.
8. "price": Precio numerico de entrada. null si no figura o si es gratis.
9. "is_free": true SOLO si dice "gratis", "entrada libre" o "sin cargo". false en caso contrario.
10. "genre_family": "bachata", "salsa", "salsa-y-bachata", "tango", "rock", "cachengue", "folklore", "urbano" u "otros". Segun lo que diga el flyer.

Texto adjunto de Instagram: "{caption}"

Responde SOLO con un objeto JSON valido. Si un campo no esta en el flyer, debe ser null, no un string vacio."""

def analyze_flyer_with_gemini(image_b64, mime_type, caption):
    """Envía el flyer a Gemini Vision y devuelve los datos extraidos."""
    prompt = PROMPT_GEMINI.format(caption=(caption or "")[:500])
    
    payload = json.dumps({
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": image_b64}}
            ]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        }
    }).encode()
    
    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    
    # Reintentar hasta 3 veces (Gemini puede tener alta demanda)
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=45)
            data = json.loads(resp.read())
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if text:
                return json.loads(text)
            return None
        except urllib.error.HTTPError as e:
            if e.code == 503 and attempt < 2:
                log(f"Gemini con alta demanda (503), reintentando en 5s...", "WARN")
                time.sleep(5)
                continue
            body = e.read().decode()
            log(f"Error Gemini {e.code}: {body[:200]}", "ERROR")
            return None
        except Exception as e:
            log(f"Error Gemini: {e}", "ERROR")
            if attempt < 2:
                time.sleep(3)
            return None
    
    return None

# ============================================================
# 4. VALIDACIÓN POST-EXTRACCIÓN
# ============================================================

def validate_event(ai_result):
    """Valida los datos extraidos por Gemini. Devuelve (confidence, issues, is_valid)."""
    issues = []
    confidence = 0
    
    # Título
    title = (ai_result.get("title") or "").strip()
    if title and len(title) >= 3:
        confidence += 15
        generic = ["social de baile", "evento de baile", "noche de baile", "fiesta de baile"]
        if title.lower() in generic:
            issues.append("Título demasiado genérico")
            confidence -= 5
    else:
        issues.append("Falta título")
    
    # Fecha
    start_date = (ai_result.get("start_date") or "").strip()
    if start_date:
        try:
            parsed = datetime.strptime(start_date, "%Y-%m-%d")
            if parsed < datetime.now():
                issues.append("Fecha en el pasado")
            else:
                confidence += 20
        except:
            issues.append("Fecha inválida")
    else:
        issues.append("Falta fecha")
    
    # Dirección
    address = (ai_result.get("address") or "").strip()
    if address and address != "Dirección a confirmar" and len(address) >= 5:
        confidence += 15
    else:
        issues.append("Falta dirección")
    
    # Ciudad
    city = (ai_result.get("city") or "").strip()
    if city and len(city) >= 2:
        confidence += 10
    
    # Precio
    is_free = ai_result.get("is_free")
    price = ai_result.get("price")
    if is_free:
        confidence += 10
    elif price is not None and price is not None:
        if 500 <= price <= 250000:
            confidence += 10
        elif price > 0:
            issues.append(f"Precio fuera de rango: {price}")
    
    # Organizador
    org = (ai_result.get("organizer_name") or "").strip()
    if org and len(org) >= 2:
        confidence += 10
    
    # Venue
    venue = (ai_result.get("venue_name") or "").strip()
    if venue and len(venue) >= 2:
        confidence += 5
    
    # Género
    genre = (ai_result.get("genre_family") or "").strip()
    if genre and len(genre) >= 2:
        confidence += 5
    
    # Hora
    hour = (ai_result.get("start_time_hour") or "").strip()
    if hour:
        confidence += 10
    
    # Es válido SOLO si tiene los 4 datos obligatorios: título + fecha + dirección + precio
    # Si falta cualquiera, el evento NO se carga
    has_title = len(title) >= 3
    has_date = bool(start_date)
    has_address = len(address) >= 5 and address != "Dirección a confirmar"
    has_price = is_free or (price is not None and price >= 0)
    
    is_valid = has_title and has_date and has_address and has_price
    
    if not is_valid:
        missing = []
        if not has_title: missing.append("título")
        if not has_date: missing.append("fecha")
        if not has_address: missing.append("dirección")
        if not has_price: missing.append("precio")
        issues.append(f"Faltan datos obligatorios: {', '.join(missing)}")
    
    return min(confidence, 100), issues, is_valid

# ============================================================
# 5. GEOCODING (OpenStreetMap)
# ============================================================

def geocode(address, city="Buenos Aires"):
    """Geocodifica una dirección con OpenStreetMap Nominatim."""
    try:
        query = f"{address}, {city}, Argentina"
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(query)}&addressdetails=1&limit=1&countrycodes=ar"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "SaleBaile/1.0")
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        if data and len(data) > 0:
            return float(data[0]["lat"]), float(data[0]["lon"]), data[0].get("display_name", "")
    except:
        pass
    return -34.5880, -58.4350, ""

# ============================================================
# 6. FIREBASE RTDB
# ============================================================

def load_firebase_events():
    """Lee los eventos actuales de Firebase."""
    try:
        resp = urllib.request.urlopen(FIREBASE_EVENTS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return list(data.values())
    except:
        pass
    return []

def save_firebase_events(events):
    """Guarda la lista completa de eventos en Firebase."""
    payload = json.dumps(events).encode()
    req = urllib.request.Request(FIREBASE_EVENTS_URL, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=15)
    return resp.status == 200

# ============================================================
# 7. CONSTRUIR EVENTO PARA FIREBASE
# ============================================================

def build_event(ai_result, validation, post, account, flyer_b64=None, flyer_mime=None):
    """Construye un EventItem válido para Firebase a partir de los datos extraídos."""
    title = (ai_result.get("title") or f"Evento de {account['handle']}").strip()
    venue = (ai_result.get("venue_name") or "Lugar a confirmar").strip()
    address = (ai_result.get("address") or "Dirección a confirmar").strip()
    city = (ai_result.get("city") or "Buenos Aires").strip()
    organizer = (ai_result.get("organizer_name") or account["handle"].replace("@", "")).strip()
    is_free = bool(ai_result.get("is_free"))
    price = None if is_free else ai_result.get("price")
    genre = (ai_result.get("genre_family") or "otros").strip().lower()
    
    # Flyer: guardar como base64 data URL (las URLs de Instagram CDN expiran)
    if flyer_b64 and flyer_mime:
        flyer_url = f"data:{flyer_mime};base64,{flyer_b64}"
    else:
        flyer_url = post.get("displayUrl") or ""

    
    # Fecha y hora
    start_date = (ai_result.get("start_date") or "").strip()
    start_hour = (ai_result.get("start_time_hour") or "22:00").strip()
    
    if start_date:
        start_time = f"{start_date}T{start_hour}:00.000Z"
    else:
        start_time = datetime.now().isoformat()
    
    # Geocoding
    lat, lng, geo_name = -34.5880, -58.4350, ""
    if address and address != "Dirección a confirmar":
        lat, lng, geo_name = geocode(address, city)
    
    # Provincia
    province = "Capital Federal"
    if geo_name:
        gname = geo_name.lower()
        if "capital federal" in gname or "ciudad aut" in gname:
            province = "Capital Federal"
        elif "buenos aires" in gname or "gba" in gname:
            province = "Buenos Aires"
    elif city and "josé c. paz" in city.lower():
        province = "Buenos Aires"
    elif city and city.lower() not in ["buenos aires", "capital federal"]:
        province = "Buenos Aires"
    
    # Subgéneros
    subgenres_map = {
        "bachata": ["bachata-sensual", "bachata-dominicana"],
        "salsa": ["salsa-cubana", "salsa-linea"],
        "salsa-y-bachata": ["social-salsa-bachata"],
        "tango": ["milonga"],
        "rock": ["rock-and-roll"],
        "cachengue": ["cachengue"],
        "folklore": ["chacarera"],
        "urbano": ["hiphop"],
    }
    subgenres = subgenres_map.get(genre, ["fusion"])
    
    return {
        "id": f"evt-{int(time.time())}-{hash(title) % 10000}",
        "organizer_id": f"org-{account['handle'].replace('@', '').replace('.', '')}",
        "title": title,
        "description": (post.get("caption") or "")[:300] or f"Evento organizado por {organizer}.",
        "flyer_url": flyer_url,
        "flyer_aspect_ratio": 0.75,
        "category": "social",
        "genre_family": genre,
        "subgenres": subgenres,
        "start_time": start_time,
        "end_time": start_time,
        "timezone": "America/Argentina/Buenos_Aires",
        "venue_name": venue,
        "address": address,
        "city": city,
        "province": province,
        "country": "Argentina",
        "latitude": lat,
        "longitude": lng,
        "is_free": is_free,
        "price": price,
        "advance_ticket_price": None,
        "currency": "ARS",
        "organizer_name": organizer,
        "organizer_instagram": account["handle"],
        "status": "publicado" if validation[2] and validation[0] >= 50 else "pendiente",
        "is_cancelled": False,
        "is_featured": False,
        "created_at": datetime.now().isoformat(),
    }

# ============================================================
# AGENTE PRINCIPAL
# ============================================================

def run_agent():
    """Ejecuta el agente completo: scrapear → analizar → validar → cargar."""
    log("=" * 60)
    log("🤖 AGENTE RADAR BOT — SALE BAILE")
    log("=" * 60)
    
    # 1. Leer eventos actuales de Firebase
    current_events = load_firebase_events()
    existing_ids = {e.get("id") for e in current_events if e}
    log(f"Firebase: {len(current_events)} evento(s) actual(es)")
    
    new_events = []
    stats = {"scraped": 0, "analyzed": 0, "valid": 0, "needs_review": 0, "failed": 0}
    
    # 2. Scrapear cada cuenta
    for account in MONITORED_ACCOUNTS:
        handle = account["handle"]
        log(f"")
        log(f"📸 Scrapeando {handle} ({account['name']})...")
        
        try:
            posts = scrape_instagram(handle)
            stats["scraped"] += len(posts)
            log(f"   → {len(posts)} post(s) encontrado(s)")
        except Exception as e:
            log(f"   ❌ Error scrapeando: {e}", "ERROR")
            stats["failed"] += 1
            continue
        
        if not posts:
            log(f"   ⚠️ Sin posts", "WARN")
            continue
        
        # 3. Analizar los posts (máximo 2 por cuenta)
        for post in posts[:2]:
            caption = post.get("caption") or ""
            image_url = post.get("displayUrl") or ""
            post_url = post.get("url") or ""
            
            if not image_url:
                log(f"   ⚠️ Post sin imagen: {post_url}", "WARN")
                continue
            
            # Descargar imagen
            log(f"   📥 Descargando flyer...")
            img_b64, mime, img_size = download_image(image_url)
            
            if not img_b64:
                log(f"   ⚠️ No se pudo descargar la imagen — NO se carga el evento (sin flyer)", "WARN")
                continue
            
            log(f"   ✅ Imagen: {img_size} bytes")
            
            # Analizar con Gemini
            log(f"   🤖 Analizando con Gemini Vision...")
            ai_result = analyze_flyer_with_gemini(img_b64, mime, caption)
            stats["analyzed"] += 1
            
            if not ai_result:
                log(f"   ⚠️ Gemini no pudo analizar el flyer", "WARN")
                stats["failed"] += 1
                continue
            
            # Validar
            confidence, issues, is_valid = validate_event(ai_result)
            
            log(f"   📊 Confianza: {confidence}/100 | Válido: {is_valid}")
            if issues:
                log(f"   ⚠️ Problemas: {'; '.join(issues)}")
            
            # Construir evento (con flyer en base64 para que no expire)
            event = build_event(ai_result, (confidence, issues, is_valid), post, account, img_b64, mime)
            
            if event["id"] in existing_ids:
                log(f"   ⏭️ Ya existe en Firebase, saltando...")
                continue
            
            if is_valid and confidence >= 50:
                log(f"   ✅ Evento VÁLIDO: {event['title']}")
                log(f"      📍 {event['address']}, {event['city']}")
                log(f"      📅 {event['start_time'][:10]}")
                log(f"      💰 {event.get('price', 'Gratis')}")
                stats["valid"] += 1
                new_events.append(event)
            else:
                log(f"   ❌ Descartado: faltan datos obligatorios (título, dirección, precio o fecha)")
                log(f"      Problemas: {'; '.join(issues)}")
                stats["needs_review"] += 1
                # NO se agrega a new_events — no se carga sin los 4 datos obligatorios
            
            # Pausa entre posts para no saturar Gemini
            time.sleep(2)
        
        # Pausa entre cuentas
        time.sleep(1)
    
    # 4. Guardar en Firebase
    if new_events:
        all_events = current_events + new_events
        log(f"")
        log(f"💾 Guardando {len(new_events)} evento(s) nuevo(s) en Firebase...")
        success = save_firebase_events(all_events)
        if success:
            log(f"✅ Firebase actualizado: {len(all_events)} evento(s) total(es)")
        else:
            log(f"❌ Error guardando en Firebase", "ERROR")
    else:
        log(f"")
        log(f"ℹ️ No hay eventos nuevos para cargar")
    
    # 5. Resumen
    log(f"")
    log(f"{'=' * 60}")
    log(f"📊 RESUMEN")
    log(f"{'=' * 60}")
    log(f"  Cuentas scrapearadas: {len(MONITORED_ACCOUNTS)}")
    log(f"  Posts encontrados:    {stats['scraped']}")
    log(f"  Flyers analizados:    {stats['analyzed']}")
    log(f"  Eventos válidos:      {stats['valid']}")
    log(f"  Needs review:         {stats['needs_review']}")
    log(f"  Fallos:               {stats['failed']}")
    log(f"  Eventos nuevos:       {len(new_events)}")
    log(f"  Eventos en Firebase:   {len(current_events) + len(new_events)}")
    log(f"{'=' * 60}")
    
    return new_events


if __name__ == "__main__":
    run_agent()
