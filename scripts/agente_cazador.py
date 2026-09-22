#!/usr/bin/env python3
"""
Agente Cazador de Organizadores — Sale Baile
Busca cuentas de Instagram que publican flyers de eventos de baile
en Buenos Aires y alrededores, las analiza, puntúa y guarda los
prospectos en Firebase RTDB para luego hacer outreach.

Estrategia:
  1. Busca posts por hashtags de baile en Argentina (#bachata #salsa #tango ...)
  2. Extrae las cuentas únicas que publican esos posts
  3. Filtra las que ya están monitoreadas (9 actuales)
  4. Analiza cada cuenta: seguidores, frecuencia de posts, ubicación, engagement
  5. Puntúa y rankea los prospectos (0-100)
  6. Guarda en Firebase bajo sale_baile/leads

Uso: python scripts/agente_cazador.py
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import time
import os
import sys
from datetime import datetime, timedelta

# ============================================================
# CONFIGURACIÓN
# ============================================================

APIFY_TOKEN = os.environ.get("VITE_APIFY_TOKEN", os.environ.get("APIFY_TOKEN", ""))
GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

FIREBASE_BASE = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile"
FIREBASE_LEADS_URL = f"{FIREBASE_BASE}/leads.json"
FIREBASE_EVENTS_URL = f"{FIREBASE_BASE}/events.json"

# Cuentas ya monitoreadas (no queremos volver a prospectarlas)
KNOWN_ACCOUNTS = [
    "melanybys", "bailamosacademia", "chambeasalsaybachata",
    "saborlatino.ok", "lasalseracom", "jorge_solohaga",
    "salsaarriba", "lavirubachatera", "ceresitobi",
]

# Hashtags para buscar (que usan los organizadores de baile en Argentina)
# Reducido a los más efectivos para no agotar el tiempo de ejecución
SEARCH_HASHTAGS = [
    "#bachata", "#salsa", "#tango", "#bachataargentina",
    "#salsaargentina", "#tangoargentina", "#bailesocial",
    "#clasesdebaile", "#eventosdebaile", "#milongacaramban",
]

# Palabras clave que indican que un post es un flyer/evento de baile
EVENT_KEYWORDS = [
    "entrada", "cover", "entradas", "clase", "social",
    "fiesta", "evento", "milonga", "practica", "festival",
    "workshop", "taller", "congreso", "maratón", "maraton",
    "salsa", "bachata", "tango", "kizomba", "merengue",
    "sensual", "ladies", "copa", "ron", "cubano",
    "viernes", "sábado", "sabado", "domingo", "jueves",
]

# Palabras que indican que NO es un organizador (cuentas personales, tiendas, etc.)
NEGATIVE_KEYWORDS = [
    "venta", "ropa", "indumentaria", "shoes", "zapatos",
    "tienda", "store", "shop", "compra", "remate",
]

# ============================================================
# LOG
# ============================================================

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

# ============================================================
# 1. BUSCAR POSTS POR HASHTAGS (Apify)
# ============================================================

def search_hashtag_posts(hashtag, limit=30):
    """Busca posts recientes de un hashtag usando Apify Instagram Scraper."""
    clean = hashtag.replace("#", "").strip()
    hashtag_url = f"https://www.instagram.com/explore/tags/{clean}/"

    actor_url = f"https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    payload = json.dumps({
        "directUrls": [hashtag_url],
        "resultsType": "posts",
        "resultsLimit": limit,
        "search": "hashtag",
    }).encode()

    req = urllib.request.Request(actor_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=90)
        data = json.loads(resp.read())
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        log(f"Error buscando hashtag {hashtag}: {e}", "ERROR")
        return []


def get_account_details(handle):
    """Obtiene detalles de una cuenta de Instagram usando Apify."""
    clean = handle.replace("@", "").strip()
    profile_url = f"https://www.instagram.com/{clean}/"

    actor_url = f"https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    payload = json.dumps({
        "directUrls": [profile_url],
        "resultsType": "profile",
        "resultsLimit": 1,
    }).encode()

    req = urllib.request.Request(actor_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=60)
        data = json.loads(resp.read())
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return None
    except Exception as e:
        log(f"Error obteniendo perfil de @{clean}: {e}", "ERROR")
        return None


# ============================================================
# 2. ANALIZAR SI UN POST ES UN FLYER DE EVENTO DE BAILE
# ============================================================

def is_event_post(post):
    """Heurística: determina si un post es probablemente un flyer de evento de baile."""
    caption = (post.get("caption", "") or "").lower()
    if not caption:
        return False

    has_event_keyword = any(kw in caption for kw in EVENT_KEYWORDS)
    has_negative = any(kw in caption for kw in NEGATIVE_KEYWORDS)

    # Tiene imagen (flyer)?
    has_image = bool(post.get("imageUrl") or post.get("displayUrl") or post.get("images"))

    return has_event_keyword and has_image and not has_negative


def batch_analyze_with_gemini(accounts_data):
    """Analiza todas las cuentas en un solo llamado a Gemini para evitar rate limits.

    accounts_data: dict {handle: {"posts": [...], "event_count": int}}
    Returns: dict {handle: {is_dance_event, dance_style, event_type, location_mentioned, reasoning}}
    """
    if not accounts_data:
        return {}

    # Construir resumen de cada cuenta para el prompt
    summaries = []
    for handle, info in accounts_data.items():
        # Unir captions de los posts
        captions = [(p.get("caption", "") or "")[:200] for p in info["posts"][:3]]
        combined = " | ".join(captions)
        summaries.append(f"@{handle}: {combined}")

    accounts_text = "\n".join(summaries)

    prompt = f"""Eres un analista de redes sociales especializado en eventos de baile en Argentina.
Analiza estas cuentas de Instagram que publican flyers de eventos de baile y para cada una determina:
1. Si es un organizador de eventos de baile (no una tienda, no una persona que solo baila)
2. Qué estilo de baile (bachata, salsa, tango, kizomba, sensual, general)
3. Tipo de evento (clase, social, festival, milonga, taller, otro)
4. Ubicación mencionada (si se menciona alguna)

Cuentas a analizar:
{accounts_text}

Responde SOLO con un JSON array donde cada elemento tiene:
{{
  "handle": "handle_sin_arroba",
  "is_dance_organizer": true/false,
  "dance_style": "bachata" | "salsa" | "tango" | "kizomba" | "sensual" | "general",
  "event_type": "clase" | "social" | "festival" | "milonga" | "taller" | "otro",
  "location_mentioned": "texto o vacío",
  "reasoning": "explicación breve"
}}"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1},
    }).encode()

    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        # Retry con backoff para evitar 429
        for attempt in range(3):
            try:
                resp = urllib.request.urlopen(req, timeout=45)
                data = json.loads(resp.read())
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "[]")
                result = json.loads(text)
                # Convertir lista a dict por handle
                out = {}
                for item in result:
                    h = item.get("handle", "").replace("@", "").strip()
                    out[h] = item
                return out
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 2:
                    wait = (attempt + 1) * 5
                    log(f"  Gemini 429 — esperando {wait}s antes de retry...", "WARN")
                    time.sleep(wait)
                    # Reconstruir request
                    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
                    req.add_header("Content-Type", "application/json")
                    continue
                raise
        return {}
    except Exception as e:
        log(f"Error Gemini análisis batch: {e}", "WARN")
        return {}


# ============================================================
# 3. PUNTUAR PROSPECTOS
# ============================================================

def score_prospect(handle, event_posts, gemini_result=None):
    """Puntúa un prospecto de 0 a 100 basado en los datos de sus posts."""
    score = 0
    reasons = []

    # Datos agregados de los posts
    total_likes = sum(p.get("likesCount", 0) or 0 for p in event_posts)
    total_comments = sum(p.get("commentsCount", 0) or 0 for p in event_posts)
    event_count = len(event_posts)
    avg_likes = total_likes / event_count if event_count else 0

    # Frecuencia de eventos (más eventos = más probable que sea organizador)
    if event_count >= 5:
        score += 25
        reasons.append(f"+25 ({event_count} eventos detectados)")
    elif event_count >= 3:
        score += 20
        reasons.append(f"+20 ({event_count} eventos)")
    elif event_count >= 2:
        score += 15
        reasons.append(f"+15 ({event_count} eventos)")
    else:
        score += 10
        reasons.append(f"+10 ({event_count} evento)")

    # Engagement promedio (likes por post)
    if avg_likes > 100:
        score += 20
        reasons.append(f"+20 (engagement alto: {int(avg_likes)} likes prom)")
    elif avg_likes > 30:
        score += 15
        reasons.append(f"+15 (engagement medio: {int(avg_likes)} likes prom)")
    elif avg_likes > 10:
        score += 10
        reasons.append(f"+10 (engagement: {int(avg_likes)} likes prom)")
    else:
        score += 5
        reasons.append(f"+5 (engagement bajo: {int(avg_likes)} likes prom)")

    # Comments (interacción)
    if total_comments > 20:
        score += 10
        reasons.append(f"+10 ({total_comments} comentarios)")
    elif total_comments > 5:
        score += 5
        reasons.append(f"+5 ({total_comments} comentarios)")

    # Gemini confirmó que es organizador de baile
    if gemini_result:
        is_org = gemini_result.get("is_dance_organizer", True)
        if is_org:
            score += 15
            reasons.append("+15 (Gemini confirma: organizador de baile)")
        else:
            score -= 10
            reasons.append("-10 (Gemini: quizás no es organizador)")

        # Estilo de baile detectado
        style = (gemini_result.get("dance_style", "") or "").lower()
        if style and style != "general":
            score += 10
            reasons.append(f"+10 (estilo: {style})")

        # Ubicación mencionada
        loc = (gemini_result.get("location_mentioned", "") or "").lower()
        if any(kw in loc for kw in ["buenos aires", "caba", "argentina", "gba", "palermo", "alamo"]):
            score += 10
            reasons.append(f"+10 (ubicación BA/Argentina: {loc})")
        elif loc:
            score += 5
            reasons.append(f"+5 (ubicación: {loc})")
    else:
        # Sin Gemini, dar puntos por defecto
        score += 5
        reasons.append("+5 (sin análisis Gemini)")

    # Caption menciona Buenos Aires / Argentina
    all_captions = " ".join([(p.get("caption", "") or "").lower() for p in event_posts])
    if any(kw in all_captions for kw in ["buenos aires", "caba", "argentina", "gba", "palermo", "alamo", "caballito"]):
        score += 10
        reasons.append("+10 (caption menciona BA/Argentina)")
    elif any(kw in all_captions for kw in ["baile", "clase", "social", "festival", "milonga"]):
        score += 5
        reasons.append("+5 (caption menciona baile/evento)")

    # Hashtags del post (más hashtags de baile = más relevante)
    all_hashtags = []
    for p in event_posts:
        ht = p.get("hashtags", []) or []
        all_hashtags.extend([h.lower().replace("#", "") for h in ht])
    dance_hashtags = [h for h in all_hashtags if any(kw in h for kw in ["bachata", "salsa", "tango", "baile", "milonga", "kizomba", "sensual"])]
    if len(dance_hashtags) >= 5:
        score += 10
        reasons.append(f"+10 ({len(dance_hashtags)} hashtags de baile)")
    elif len(dance_hashtags) >= 2:
        score += 5
        reasons.append(f"+5 ({len(dance_hashtags)} hashtags de baile)")

    return max(0, min(score, 100)), reasons


# ============================================================
# 4. FIREBASE
# ============================================================

def load_existing_leads():
    """Lee los leads ya guardados en Firebase."""
    try:
        resp = urllib.request.urlopen(FIREBASE_LEADS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, dict):
            return data
        return {}
    except:
        return {}


def save_lead_to_firebase(lead):
    """Guarda un lead en Firebase con PUT (key = handle)."""
    handle_key = lead["handle"].replace("@", "").replace(".", ",")
    url = f"{FIREBASE_BASE}/leads/{handle_key}.json"
    payload = json.dumps(lead).encode()

    req = urllib.request.Request(url, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")

    try:
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        log(f"Error guardando lead @{lead['handle']}: {e}", "ERROR")
        return False


# ============================================================
# 5. PIPELINE PRINCIPAL
# ============================================================

def run():
    log("=== CAZADOR DE ORGANIZADORES — SALE BAILE ===")
    log(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    log("")

    if not APIFY_TOKEN:
        log("FALTA VITE_APIFY_TOKEN en .env — no se puede ejecutar", "ERROR")
        sys.exit(1)

    # 1. Buscar posts por hashtags
    log(f"Paso 1: Buscando posts por {len(SEARCH_HASHTAGS)} hashtags de baile...")
    all_posts = []
    seen_urls = set()

    for hashtag in SEARCH_HASHTAGS:
        log(f"  Buscando {hashtag}...")
        posts = search_hashtag_posts(hashtag, limit=10)
        for p in posts:
            url = p.get("url", "")
            if url and url not in seen_urls:
                all_posts.append(p)
                seen_urls.add(url)
        log(f"    → {len(posts)} posts encontrados ({len(all_posts)} acumulados)")
        time.sleep(0.5)  # Rate limiting

    log(f"Total posts únicos recolectados: {len(all_posts)}")

    # 2. Filtrar: solo posts que parecen flyers de evento de baile
    log("Paso 2: Filtrando posts que parecen flyers de evento...")
    event_posts = []
    for p in all_posts:
        if is_event_post(p):
            event_posts.append(p)
    log(f"Posts que pasaron filtro heurístico: {len(event_posts)}")

    # 3. Agrupar por autor
    log("Paso 3: Agrupando por autor (cuenta de Instagram)...")
    accounts = {}
    for p in event_posts:
        handle = p.get("ownerUsername", p.get("username", ""))
        if not handle:
            continue
        clean = handle.lower().strip()
        if clean in KNOWN_ACCOUNTS:
            continue  # Ya monitoreada
        if clean not in accounts:
            accounts[clean] = {"handle": f"@{handle}", "posts": []}
        accounts[clean]["posts"].append(p)

    log(f"Cuentas únicas candidatas: {len(accounts)}")
    log(f"(Filtradas {len(KNOWN_ACCOUNTS)} cuentas ya monitoreadas)")

    if not accounts:
        log("No se encontraron cuentas candidatas. Terminando.", "WARN")
        return

    # 4. Analizar cuentas con Gemini (batch) + puntuar
    log("Paso 4: Analizando cuentas candidatas con Gemini (batch)...")

    # Ordenar por cantidad de eventos detectados (más eventos = más probable que sea organizador)
    sorted_accounts = sorted(accounts.items(), key=lambda x: len(x[1]["posts"]), reverse=True)
    # Limitar a las top 15 para no agotar el tiempo de ejecución
    MAX_ANALYZE = 15
    if len(sorted_accounts) > MAX_ANALYZE:
        log(f"  Limitando a top {MAX_ANALYZE} de {len(sorted_accounts)} cuentas...")
        sorted_accounts = sorted_accounts[:MAX_ANALYZE]

    # Análisis batch con Gemini — un solo llamado para todas las cuentas
    accounts_for_gemini = {h: info for h, info in sorted_accounts}
    log(f"  Enviando {len(accounts_for_gemini)} cuentas a Gemini en un solo llamado...")
    gemini_results = batch_analyze_with_gemini(accounts_for_gemini)
    log(f"  Gemini analizó {len(gemini_results)} cuentas")

    leads = []
    batch = 0

    for handle_clean, info in sorted_accounts:
        batch += 1
        handle = info["handle"]
        event_count = len(info["posts"])

        gemini_result = gemini_results.get(handle_clean)
        if gemini_result:
            is_dance = gemini_result.get("is_dance_organizer", True)
            if not is_dance:
                log(f"  [{batch}/{len(sorted_accounts)}] {handle} — Gemini: no es organizador, saltando", "SKIP")
                continue

        # Puntuar con datos de los posts + Gemini
        score, reasons = score_prospect(handle, info["posts"], gemini_result)
        total_likes = sum(p.get("likesCount", 0) or 0 for p in info["posts"])
        total_comments = sum(p.get("commentsCount", 0) or 0 for p in info["posts"])
        avg_likes = total_likes / event_count if event_count else 0

        # Info del primer post (avatar, caption resumen)
        first_post = info["posts"][0]
        avatar = first_post.get("ownerProfilePicUrl", "") or first_post.get("profilePicUrl", "") or ""
        sample_caption = (first_post.get("caption", "") or "")[:200]

        lead = {
            "handle": handle,
            "full_name": handle,
            "avatar_url": avatar,
            "followers": 0,  # No disponible sin get_account_details
            "bio": "",
            "external_url": "",
            "is_business": False,
            "event_posts_count": event_count,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "avg_likes_per_post": int(avg_likes),
            "score": score,
            "score_reasons": reasons,
            "dance_style": (gemini_result.get("dance_style", "general") if gemini_result else "general"),
            "event_type": (gemini_result.get("event_type", "general") if gemini_result else "general"),
            "location_mentioned": (gemini_result.get("location_mentioned", "") if gemini_result else ""),
            "gemini_reasoning": (gemini_result.get("reasoning", "") if gemini_result else ""),
            "sample_caption": sample_caption,
            "status": "new",  # new → contacted → joined → declined
            "detected_at": datetime.now().isoformat(),
            "last_contacted_at": None,
            "notes": "",
        }

        leads.append(lead)
        log(f"  [{batch}/{len(sorted_accounts)}] {handle:35s} | Score: {score:3d} | {event_count} eventos | {int(avg_likes):4d} likes/prom")

    # 5. Ordenar por score descendente
    leads.sort(key=lambda x: x["score"], reverse=True)

    log(f"Paso 5: Guardando {len(leads)} leads en Firebase...")

    saved = 0
    for lead in leads:
        if save_lead_to_firebase(lead):
            saved += 1

    log(f"Leads guardados: {saved}/{len(leads)}")

    # 6. Reporte final
    log("")
    log("=" * 60)
    log("REPORTE FINAL — CAZADOR DE ORGANIZADORES")
    log("=" * 60)
    log(f"Hashtags buscados:     {len(SEARCH_HASHTAGS)}")
    log(f"Posts recolectados:     {len(all_posts)}")
    log(f"Posts de evento:        {len(event_posts)}")
    log(f"Cuentas candidatas:     {len(accounts)}")
    log(f"Leads generados:        {len(leads)}")
    log(f"Leads guardados en FB:  {saved}")
    log("")

    if leads:
        log("TOP 10 PROSPECTOS:")
        log("-" * 60)
        for i, lead in enumerate(leads[:10], 1):
            log(f"  {i:2d}. {lead['handle']:30s} | Score: {lead['score']:3d} | "
                f"{lead['followers']:>7,} seg | {lead['event_posts_count']} eventos | "
                f"{lead['dance_style']}")
    log("")
    log("✅ Cazador completado. Revisar leads en Firebase: sale_baile/leads")
    log("    URL: https://console.firebase.google.com/project/hoy-bailamos-app")
    log("=" * 60)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    run()
