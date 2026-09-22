#!/usr/bin/env python3
"""
Agente Outreach — Sale Baile
Toma los leads generados por el Cazador de Firebase RTDB,
genera mensajes personalizados de DM con Gemini para cada
organizador y los marca como "contacted" en Firebase.

Estrategia:
  1. Lee leads de Firebase (sale_baile/leads) con status "new"
  2. Genera mensaje de DM personalizado con Gemini para cada uno
  3. Guarda el mensaje en el lead (campo "outreach_message")
  4. Marca el lead como "contacted"
  5. Reporte final con todos los mensajes listos para enviar

Uso: python scripts/agente_outreach.py
"""

import urllib.request
import urllib.parse
import urllib.error
import json
import time
import os
import sys
from datetime import datetime

# ============================================================
# CONFIGURACIÓN
# ============================================================

GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

FIREBASE_BASE = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile"
FIREBASE_LEADS_URL = f"{FIREBASE_BASE}/leads.json"

# ============================================================
# LOG
# ============================================================

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

# ============================================================
# 1. LEER LEADS DE FIREBASE
# ============================================================

def load_leads():
    """Lee todos los leads de Firebase."""
    try:
        resp = urllib.request.urlopen(FIREBASE_LEADS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, dict):
            return data
        return {}
    except Exception as e:
        log(f"Error leyendo leads de Firebase: {e}", "ERROR")
        return {}


def load_new_leads():
    """Lee los leads con status 'new' de Firebase."""
    all_leads = load_leads()
    new_leads = {}
    for key, lead in all_leads.items():
        status = lead.get("status", "new")
        if status == "new":
            new_leads[key] = lead
    return new_leads


# ============================================================
# 2. GENERAR MENSAJE DE DM CON GEMINI
# ============================================================

def generate_dm_message(lead):
    """Genera un mensaje de DM personalizado para un organizador con Gemini."""
    handle = lead.get("handle", "")
    dance_style = lead.get("dance_style", "general")
    event_type = lead.get("event_type", "general")
    event_count = lead.get("event_posts_count", 0)
    location = lead.get("location_mentioned", "")
    score = lead.get("score", 0)
    sample_caption = lead.get("sample_caption", "")
    gemini_reasoning = lead.get("gemini_reasoning", "")

    prompt = f"""Eres el community manager de Sale Baile (salebaile.web.app), la plataforma #1 de eventos de baile en Buenos Aires.

Tono de voz de la marca:
- Cercano, no corporativo — somos bailarines hablando con bailarines
- Español argentino (vos, no tú)
- Energético pero no gritón
- Referencias al mundo del baile (ritmo, pista, social)
- Máximo 2 emojis por mensaje

Escribe un mensaje de DM de Instagram corto, amigable y directo para invitar a este organizador a publicar sus eventos en Sale Baile.

Datos del organizador:
- Instagram: {handle}
- Estilo de baile: {dance_style}
- Tipo de evento: {event_type}
- Cantidad de eventos detectados: {event_count}
- Ubicación: {location or "no detectada"}
- Score: {score}/100
- Caption de ejemplo: {sample_caption[:150]}

Reglas:
1. Máximo 280 caracteres (límite de DM de Instagram)
2. Mencionar algo específico de su cuenta (estilo, cantidad de eventos, ubicación)
3. Incluir llamada a acción clara: "publicá tus eventos en Sale Baile" o similar
4. Mencionar que es gratis
5. NO usar emojis excesivos (máximo 2)
6. NO parecer spam ni bot — sonar humano
7. En español argentino (vos, no tú)

Escribe SOLO el mensaje, sin comillas ni explicaciones."""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 200},
    }).encode()

    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        # Retry con backoff para 429
        for attempt in range(3):
            try:
                resp = urllib.request.urlopen(req, timeout=30)
                data = json.loads(resp.read())
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                return text.strip()
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 2:
                    wait = (attempt + 1) * 5
                    log(f"  Gemini 429 — esperando {wait}s...", "WARN")
                    time.sleep(wait)
                    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
                    req.add_header("Content-Type", "application/json")
                    continue
                raise
        return None
    except Exception as e:
        log(f"Error generando DM para {handle}: {e}", "WARN")
        return None


def infer_dance_style(lead):
    """Infiere el estilo de baile desde el handle, caption o hashtags."""
    text = (lead.get("handle", "") + " " + lead.get("sample_caption", "")).lower()
    # Buscar hashtags en el caption
    import re
    hashtags = re.findall(r'#(\w+)', lead.get("sample_caption", ""))
    tag_text = " ".join(hashtags)

    combined = f"{text} {tag_text}"

    styles = {
        "bachata": ["bachata", "bachateros", "bachatera", "sensual"],
        "salsa": ["salsa", "salseros", "salsera", "cubana", "casino"],
        "tango": ["tango", "milonga", "tangueros"],
        "kizomba": ["kizomba", "semba", "urbkiz"],
        "merengue": ["merengue"],
        "cumbia": ["cumbia"],
        "rock": ["rock", "rockola"],
    }

    for style, keywords in styles.items():
        if any(kw in combined for kw in keywords):
            return style

    return "baile"


def generate_fallback_dm(lead):
    """Genera un DM de fallback sin Gemini (plantilla inteligente)."""
    handle = lead.get("handle", "")
    style = infer_dance_style(lead)
    event_count = lead.get("event_posts_count", 0)

    # Truncar handle si es muy largo
    short_handle = handle if len(handle) <= 25 else handle[:22] + "..."

    if event_count >= 3:
        msg = f"¡Hola {short_handle}! Vimos que organizás varios eventos de {style} en BA. Sale Baile es la plataforma gratuita donde podés publicarlos y llegar a más bailarines. ¿Te animás? salebaile.web.app"
    else:
        msg = f"¡Hola {short_handle}! Vimos tu evento de {style} en Instagram. En Sale Baile (salebaile.web.app) podés publicarlo gratis y llegar a más bailarines en BA. ¿Te copás?"

    return msg


# ============================================================
# 3. GUARDAR MENSAJE Y ACTUALIZAR STATUS EN FIREBASE
# ============================================================

def update_lead_in_firebase(key, updates):
    """Actualiza campos específicos de un lead en Firebase con PATCH."""
    url = f"{FIREBASE_BASE}/leads/{key}.json"
    payload = json.dumps(updates).encode()

    req = urllib.request.Request(url, data=payload, method="PATCH")
    req.add_header("Content-Type", "application/json")

    try:
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        log(f"Error actualizando lead {key}: {e}", "ERROR")
        return False


# ============================================================
# 3b. ENVIAR DM POR INSTAGRAM (Apify)
# ============================================================

def send_instagram_dm(handle, message):
    """Envía un DM por Instagram usando Apify Instagram Scraper.

    Usa el actor 'apify/instagram-scraper' con el metodo 'message'
    para enviar un DM directo al organizador.

    Requiere: VITE_APIFY_TOKEN en .env
    """
    token = os.environ.get("VITE_APIFY_TOKEN", os.environ.get("APIFY_TOKEN", ""))
    if not token:
        log("FALTA VITE_APIFY_TOKEN — no se puede enviar DM por Instagram", "ERROR")
        return False, "Falta token de Apify"

    clean_handle = handle.replace("@", "").strip()
    profile_url = f"https://www.instagram.com/{clean_handle}/"

    # Usar el actor de Apify para enviar DM
    actor_url = f"https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token={token}"
    payload = json.dumps({
        "directUrls": [profile_url],
        "resultsType": "messages",
        "resultsLimit": 1,
        "messageText": message,
    }).encode()

    req = urllib.request.Request(actor_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        resp = urllib.request.urlopen(req, timeout=120)
        data = json.loads(resp.read())
        if isinstance(data, list) and len(data) > 0:
            log(f"  DM enviado a {handle} via Instagram")
            return True, "enviado"
        return False, "respuesta vacia"
    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode()[:200]
        except:
            pass
        log(f"  Error enviando DM a {handle}: {e.code} {error_body}", "ERROR")
        return False, f"HTTP {e.code}: {error_body}"
    except Exception as e:
        log(f"  Error enviando DM a {handle}: {e}", "ERROR")
        return False, str(e)


# ============================================================
# 4. PIPELINE PRINCIPAL
# ============================================================

def run(send_mode=False, max_leads=None):
    log("=== BOT DE OUTREACH — SALE BAILE ===")
    log(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    if send_mode:
        log("MODO: ENVÍO REAL DE DM POR INSTAGRAM (Apify)")
    else:
        log("MODO: Solo generar y guardar (usar --send para enviar DMs reales)")
    log("")

    if not GEMINI_API_KEY:
        log("FALTA VITE_GEMINI_API_KEY — usando mensajes de fallback (plantillas)", "WARN")

    if send_mode and not os.environ.get("VITE_APIFY_TOKEN"):
        log("FALTA VITE_APIFY_TOKEN — no se pueden enviar DMs sin token de Apify", "ERROR")
        send_mode = False

    # 1. Leer leads nuevos de Firebase
    log("Paso 1: Leyendo leads con status 'new' de Firebase...")
    new_leads = load_new_leads()
    log(f"Leads nuevos encontrados: {len(new_leads)}")

    if not new_leads:
        log("No hay leads nuevos. Ejecutá agente_cazador.py primero.", "WARN")
        return

    if max_leads:
        new_leads = dict(list(new_leads.items())[:max_leads])
        log(f"Limitando a {max_leads} leads (modo --limit)")

    # 2. Generar mensajes
    log("Paso 2: Generando mensajes de DM personalizados...")
    results = []
    batch = 0
    sent_count = 0
    failed_count = 0

    for key, lead in new_leads.items():
        batch += 1
        handle = lead.get("handle", "?")
        score = lead.get("score", 0)
        event_count = lead.get("event_posts_count", 0)

        log(f"  [{batch}/{len(new_leads)}] {handle} (Score: {score})...")

        # Generar mensaje con Gemini
        message = None
        if GEMINI_API_KEY:
            message = generate_dm_message(lead)
            time.sleep(1)  # Rate limiting entre llamadas

        # Fallback si Gemini falló
        if not message:
            message = generate_fallback_dm(lead)
            log(f"    → Usando plantilla fallback")

        # Validar longitud
        if len(message) > 280:
            message = message[:277] + "..."

        # Enviar DM por Instagram si estamos en modo --send
        dm_status = "generado"
        if send_mode:
            log(f"    📤 Enviando DM por Instagram...")
            success, detail = send_instagram_dm(handle, message)
            if success:
                dm_status = "enviado"
                sent_count += 1
                log(f"    ✅ DM enviado!")
            else:
                dm_status = f"fallo: {detail}"
                failed_count += 1
                log(f"    ❌ Error: {detail}", "WARN")
            time.sleep(3)  # Rate limiting entre envíos

        # Guardar mensaje + actualizar status
        if send_mode:
            new_status = "contacted" if dm_status == "enviado" else "new"
            last_contacted = datetime.now().isoformat() if dm_status == "enviado" else None
        else:
            # Modo generación: NO marcar como contacted, solo guardar el DM
            new_status = "new"
            last_contacted = None

        updates = {
            "outreach_message": message,
            "status": new_status,
            "last_contacted_at": last_contacted,
            "message_length": len(message),
            "dm_status": dm_status,
        }

        if update_lead_in_firebase(key, updates):
            log(f"    ✓ {len(message)} chars → {dm_status}")
        else:
            log(f"    ✗ Error guardando", "ERROR")

        results.append({
            "handle": handle,
            "score": score,
            "event_count": event_count,
            "message": message,
            "dance_style": infer_dance_style(lead) if not lead.get("dance_style") or lead.get("dance_style") == "general" else lead.get("dance_style", "baile"),
            "dm_status": dm_status,
        })

    # 3. Reporte final
    log("")
    log("=" * 70)
    log("REPORTE FINAL — BOT DE OUTREACH")
    log("=" * 70)
    log(f"Leads procesados:       {len(results)}")
    if send_mode:
        log(f"DMs enviados:            {sent_count}")
        log(f"DMs fallidos:            {failed_count}")
    log(f"Firebase actualizado:   sale_baile/leads")
    log("")

    log("MENSAJES GENERADOS:")
    log("-" * 70)
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        log(f"")
        log(f"  📱 {r['handle']} (Score: {r['score']} | {r['event_count']} eventos | {r['dance_style']})")
        log(f"  💬 \"{r['message']}\"")
        log(f"  📏 {len(r['message'])} caracteres | DM: {r['dm_status']}")

    log("")
    if send_mode:
        log(f"✅ Outreach completado. {sent_count} DMs enviados por Instagram, {failed_count} fallidos.")
    else:
        log("✅ Outreach completado. Los mensajes están listos para enviar.")
        log("    Para enviar DMs reales por Instagram: python scripts/agente_outreach.py --send")
    log("=" * 70)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    send_mode = "--send" in sys.argv
    max_leads = None
    if "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        if idx + 1 < len(sys.argv):
            max_leads = int(sys.argv[idx + 1])
    run(send_mode=send_mode, max_leads=max_leads)
