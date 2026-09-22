#!/usr/bin/env python3
"""
Agente Reportes Semanales — Sale Baile
Genera reportes semanales para cada organizador con sus métricas
en Sale Baile y sugerencias de mejora con IA.

Estrategia:
  1. Lee eventos de Firebase agrupados por organizador
  2. Lee leads de Firebase para tener contactos
  3. Genera reporte semanal con métricas (eventos, views, clicks, favoritos)
  4. Genera sugerencias de mejora con Gemini para cada organizador
  5. Guarda reportes en Firebase (sale_baile/weekly_reports)
  6. Marca leads con last_report_at

Uso: python scripts/agente_reportes.py
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

GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"

FIREBASE_BASE = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile"
FIREBASE_EVENTS_URL = f"{FIREBASE_BASE}/events.json"
FIREBASE_LEADS_URL = f"{FIREBASE_BASE}/leads.json"
FIREBASE_REPORTS_URL = f"{FIREBASE_BASE}/weekly_reports.json"

# ============================================================
# LOG
# ============================================================

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

# ============================================================
# 1. LEER DATOS DE FIREBASE
# ============================================================

def load_events():
    """Lee todos los eventos de Firebase."""
    try:
        resp = urllib.request.urlopen(FIREBASE_EVENTS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, list):
            return [e for e in data if e]
        elif isinstance(data, dict):
            return list(data.values())
        return []
    except Exception as e:
        log(f"Error leyendo eventos: {e}", "ERROR")
        return []


def load_leads():
    """Lee todos los leads de Firebase."""
    try:
        resp = urllib.request.urlopen(FIREBASE_LEADS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, dict):
            return data
        return {}
    except Exception as e:
        log(f"Error leyendo leads: {e}", "ERROR")
        return {}


# ============================================================
# 2. AGRUPAR EVENTOS POR ORGANIZADOR
# ============================================================

def group_events_by_organizer(events):
    """Agrupa eventos por organizer_instagram o organizer_name."""
    groups = {}
    for event in events:
        org = (event.get("organizer_instagram") or event.get("organizer_name") or "desconocido").strip()
        if org not in groups:
            groups[org] = []
        groups[org].append(event)
    return groups


def compute_organizer_stats(events):
    """Computa estadísticas para un organizador a partir de sus eventos."""
    total = len(events)
    published = sum(1 for e in events if e.get("status") == "publicado")
    pending = sum(1 for e in events if e.get("status") == "pendiente")
    cancelled = sum(1 for e in events if e.get("is_cancelled"))
    featured = sum(1 for e in events if e.get("is_featured"))

    # Eventos futuros vs pasados
    now = datetime.now().isoformat()
    future = 0
    past = 0
    for e in events:
        start = e.get("start_time", "")
        if start:
            try:
                if start > now:
                    future += 1
                else:
                    past += 1
            except:
                pass

    # Géneros
    genres = {}
    for e in events:
        g = e.get("genre_family", "general") or "general"
        genres[g] = genres.get(g, 0) + 1

    # Ciudades
    cities = {}
    for e in events:
        c = e.get("city", "") or ""
        if c:
            cities[c] = cities.get(c, 0) + 1

    # Métricas de engagement (si existen)
    total_views = sum(e.get("views", 0) or 0 for e in events)
    total_clicks = sum(e.get("clicks", 0) or 0 for e in events)
    total_favorites = sum(e.get("favorites_count", 0) or 0 for e in events)
    total_tickets = sum(e.get("tickets_sold", 0) or 0 for e in events)

    return {
        "total_events": total,
        "published": published,
        "pending": pending,
        "cancelled": cancelled,
        "featured": featured,
        "future_events": future,
        "past_events": past,
        "genres": genres,
        "cities": cities,
        "total_views": total_views,
        "total_clicks": total_clicks,
        "total_favorites": total_favorites,
        "total_tickets_sold": total_tickets,
    }


# ============================================================
# 3. GENERAR SUGERENCIAS CON GEMINI
# ============================================================

def generate_suggestions(org_handle, stats, events):
    """Genera sugerencias de mejora para un organizador con Gemini."""
    top_genres = sorted(stats["genres"].items(), key=lambda x: x[1], reverse=True)
    genres_str = ", ".join(f"{g}: {c}" for g, c in top_genres[:3]) if top_genres else "general"

    event_titles = [e.get("title", "?") for e in events[:5]]
    titles_str = " | ".join(event_titles)

    prompt = f"""Eres un consultor de marketing especializado en eventos de baile en Buenos Aires.
Genera 3 sugerencias accionables y específicas para ayudar a este organizador a mejorar su presencia en Sale Baile.

Organizador: {org_handle}
Estadísticas:
- Eventos totales: {stats['total_events']}
- Publicados: {stats['published']}
- Pendientes: {stats['pending']}
- Destacados: {stats['featured']}
- Eventos futuros: {stats['future_events']}
- Géneros: {genres_str}
- Views totales: {stats['total_views']}
- Clicks totales: {stats['total_clicks']}
- Favoritos: {stats['total_favorites']}
- Entradas vendidas: {stats['total_tickets_sold']}
- Eventos recientes: {titles_str}

Genera 3 sugerencias breves (máx 100 chars cada una) en español argentino.
Responde SOLO con un JSON array de strings:
["sugerencia 1", "sugerencia 2", "sugerencia 3"]"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7, "maxOutputTokens": 300},
    }).encode()

    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")

    try:
        for attempt in range(3):
            try:
                resp = urllib.request.urlopen(req, timeout=30)
                data = json.loads(resp.read())
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "[]")
                return json.loads(text)
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 2:
                    wait = (attempt + 1) * 5
                    log(f"  Gemini 429 — esperando {wait}s...", "WARN")
                    time.sleep(wait)
                    req = urllib.request.Request(GEMINI_ENDPOINT, data=payload, method="POST")
                    req.add_header("Content-Type", "application/json")
                    continue
                raise
        return []
    except Exception as e:
        log(f"Error generando sugerencias para {org_handle}: {e}", "WARN")
        return []


def generate_fallback_suggestions(stats):
    """Sugerencias de fallback sin Gemini."""
    suggestions = []

    if stats["pending"] > 0:
        suggestions.append(f"Tenés {stats['pending']} eventos pendientes — revisá y publicá para que aparezcan en la cartelera")
    if stats["future_events"] == 0:
        suggestions.append("No tenés eventos futuros — cargá uno nuevo para mantener tu perfil activo")
    if stats["featured"] == 0:
        suggestions.append("Destacá un evento para aparecer primero en los resultados de búsqueda")
    if not suggestions:
        suggestions.append("Tu perfil se ve bien — seguí publicando eventos regularmente para crecer")
    if len(suggestions) < 3:
        suggestions.append("Compartí tus eventos en Instagram stories etiquetando @salebaile para llegar a más bailarines")
    if len(suggestions) < 3:
        suggestions.append("Agregá fotos de calidad en tus flyers — los eventos con imagen propia reciben más clicks")

    return suggestions[:3]


# ============================================================
# 4. GUARDAR REPORTES EN FIREBASE
# ============================================================

def save_report_to_firebase(org_key, report):
    """Guarda un reporte semanal en Firebase."""
    safe_key = org_key.replace("@", "").replace(".", ",")
    url = f"{FIREBASE_BASE}/weekly_reports/{safe_key}.json"
    payload = json.dumps(report).encode()

    req = urllib.request.Request(url, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")

    try:
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        log(f"Error guardando reporte {org_key}: {e}", "ERROR")
        return False


# ============================================================
# 5. PIPELINE PRINCIPAL
# ============================================================

def run():
    log("=== AGENTE REPORTES SEMANALES — SALE BAILE ===")
    log(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    log("")

    week_start = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    week_end = datetime.now().strftime("%Y-%m-%d")

    # 1. Cargar datos
    log("Paso 1: Cargando eventos y leads de Firebase...")
    events = load_events()
    leads = load_leads()
    log(f"Eventos: {len(events)} | Leads: {len(leads)}")

    if not events:
        log("No hay eventos en Firebase. Terminando.", "WARN")
        return

    # 2. Agrupar por organizador
    log("Paso 2: Agrupando eventos por organizador...")
    org_groups = group_events_by_organizer(events)
    log(f"Organizadores con eventos: {len(org_groups)}")

    # 3. Generar reporte
    log("Paso 3: Generando reportes semanales...")
    reports = []
    batch = 0

    for org_handle, org_events in org_groups.items():
        batch += 1
        stats = compute_organizer_stats(org_events)

        log(f"  [{batch}/{len(org_groups)}] {org_handle} ({stats['total_events']} eventos)...")

        # Sugerencias con Gemini
        suggestions = []
        if GEMINI_API_KEY:
            suggestions = generate_suggestions(org_handle, stats, org_events)
            time.sleep(1)
        if not suggestions:
            suggestions = generate_fallback_suggestions(stats)
            log(f"    → Usando sugerencias de fallback")

        # Buscar si el organizador está en leads
        lead_info = None
        for key, lead in leads.items():
            if lead.get("handle", "").lower().replace("@", "") == org_handle.lower().replace("@", ""):
                lead_info = lead
                break

        # Eventos del organizador (resumen)
        event_summaries = []
        for e in org_events[:10]:
            event_summaries.append({
                "title": e.get("title", ""),
                "status": e.get("status", ""),
                "start_time": e.get("start_time", ""),
                "city": e.get("city", ""),
                "is_featured": e.get("is_featured", False),
                "is_cancelled": e.get("is_cancelled", False),
            })

        report = {
            "organizer": org_handle,
            "week_start": week_start,
            "week_end": week_end,
            "stats": stats,
            "suggestions": suggestions,
            "event_summaries": event_summaries,
            "lead_score": lead_info.get("score", 0) if lead_info else 0,
            "lead_status": lead_info.get("status", "unknown") if lead_info else "unknown",
            "generated_at": datetime.now().isoformat(),
        }

        if save_report_to_firebase(org_handle, report):
            log(f"    ✓ {stats['total_events']} eventos | {stats['published']} publicados | {len(suggestions)} sugerencias")
        else:
            log(f"    ✗ Error guardando", "ERROR")

        reports.append(report)

    # 4. Reporte final
    log("")
    log("=" * 70)
    log("REPORTE FINAL — AGENTE REPORTES SEMANALES")
    log("=" * 70)
    log(f"Semana:                 {week_start} → {week_end}")
    log(f"Organizadores:          {len(org_groups)}")
    log(f"Reportes generados:     {len(reports)}")
    log(f"Guardados en Firebase:  sale_baile/weekly_reports")
    log("")

    log("RESUMEN POR ORGANIZADOR:")
    log("-" * 70)
    for r in reports:
        s = r["stats"]
        log(f"")
        log(f"  📊 {r['organizer']}")
        log(f"     Eventos: {s['total_events']} | Publicados: {s['published']} | Pendientes: {s['pending']}")
        log(f"     Futuros: {s['future_events']} | Destacados: {s['featured']} | Géneros: {s['genres']}")
        log(f"     Views: {s['total_views']} | Clicks: {s['total_clicks']} | Favoritos: {s['total_favorites']}")
        log(f"     Sugerencias:")
        for sug in r["suggestions"]:
            log(f"       • {sug}")

    log("")
    log("✅ Reportes semanales completados.")
    log("    Firebase: sale_baile/weekly_reports")
    log("=" * 70)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    run()
