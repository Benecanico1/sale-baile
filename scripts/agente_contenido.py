#!/usr/bin/env python3
"""
Agente Contenido — Sale Baile
Genera contenido para redes sociales, describe eventos de baile
y crea copy marketing para la plataforma.

Uso: python scripts/agente_contenido.py [tipo] [evento]
  tipo: redes | descripcion | campaña | todos (default: todos)
  evento: nombre del evento o "auto" para usar eventos de Firebase
"""

import json
import time
import os
import urllib.request
from datetime import datetime

GEMINI_KEY = ""
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_KEY}"
FIREBASE_URL = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile/events.json"

TIPOS_CONTENIDO = {
    "redes": "Posts para Instagram/Facebook/WhatsApp con hashtags, emojis y llamado a la acción",
    "descripcion": "Descripciones atractivas de eventos para la cartelera de Sale Baile",
    "campaña": "Campaña de marketing completa: copy, target, segmentación, presupuesto sugerido",
}

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def leer_eventos_firebase():
    """Lee los eventos actuales de Firebase."""
    try:
        resp = urllib.request.urlopen(FIREBASE_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, list):
            return [e for e in data if e and e.get("status") == "publicado"]
        return []
    except:
        return []

def generar_contenido_redes(evento):
    """Genera posts de redes sociales para un evento."""
    titulo = evento.get("title", "Evento de Baile")
    lugar = evento.get("venue_name", "Lugar a confirmar")
    direccion = evento.get("address", "Dirección a confirmar")
    ciudad = evento.get("city", "Buenos Aires")
    fecha = evento.get("start_time", "")[:10] if evento.get("start_time") else "Fecha a confirmar"
    precio = evento.get("price", "Gratis") if not evento.get("is_free") else "GRATIS"
    genero = evento.get("genre_family", "bachata").title()
    organizador = evento.get("organizer_instagram", "@salebaile")
    
    prompt = f"""Eres un community manager experto en eventos de baile en Buenos Aires.
Genera 3 posts de Instagram para este evento:

Evento: {titulo}
Ritmo: {genero}
Lugar: {lugar}, {direccion}, {ciudad}
Fecha: {fecha}
Precio: ${precio if isinstance(precio, (int, float)) else precio}
Organizador: {organizador}

Genera 3 posts diferentes:
1. Post de anuncio (con emojis, hashtags y CTA)
2. Post de recordatorio (más corto, urgente)
3. Post para historias/reels (muy corto, directo)

Responde en español con JSON: {{"posts": [{{"tipo": "anuncio", "texto": "...", "hashtags": ["..."]}}]}}"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.7}
    }).encode()
    
    req = urllib.request.Request(GEMINI_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    
    try:
        resp = urllib.request.urlopen(req, timeout=45)
        data = json.loads(resp.read())
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if text:
            return json.loads(text)
    except Exception as e:
        log(f"Error Gemini: {e}", "ERROR")
    return None

def generar_descripcion_evento(evento):
    """Genera una descripción atractiva para un evento en la cartelera."""
    titulo = evento.get("title", "Evento de Baile")
    genero = evento.get("genre_family", "bachata")
    lugar = evento.get("venue_name", "")
    ciudad = evento.get("city", "")
    
    prompt = f"""Eres un copywriter experto en eventos de baile.
Escribe una descripción corta (2-3 líneas) y atractiva para este evento en la cartelera de Sale Baile.

Evento: {titulo}
Ritmo: {genero}
Lugar: {lugar}, {ciudad}

Responde en español con JSON: {{"descripcion": "..."}}"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.6}
    }).encode()
    
    req = urllib.request.Request(GEMINI_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if text:
            return json.loads(text)
    except:
        pass
    return None

def generar_campana():
    """Genera una campaña de marketing completa para Sale Baile."""
    prompt = """Eres un director de marketing experto en plataformas de eventos.
Diseña una campaña de marketing completa para Sale Baile (plataforma de eventos de baile en Buenos Aires).

Objetivos:
1. Atraer más organizadores a publicar eventos
2. Atraer más bailarines a usar la app
3. Posicionar Sale Baile como la plataforma #1 de baile en Buenos Aires

Público: Bailarines de Bachata, Salsa, Tango en CABA y GBA (18-45 años)
Presupuesto sugerido: Bajo (startup bootstrap)

Responde en español con JSON:
{
  "nombre_campana": "...",
  "objetivo": "...",
  "publico": "...",
  "canales": [{"nombre": "...", "estrategia": "...", "presupuesto": "..."}],
  "kopys": [{"canal": "...", "texto": "..."}],
  "kpis": ["..."],
  "cronograma": [{"fase": "...", "accion": "...", "duracion": "..."}]
}"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.6}
    }).encode()
    
    req = urllib.request.Request(GEMINI_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    
    try:
        resp = urllib.request.urlopen(req, timeout=45)
        data = json.loads(resp.read())
        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if text:
            return json.loads(text)
    except Exception as e:
        log(f"Error Gemini: {e}", "ERROR")
    return None

def run_agente(tipo="todos", evento_nombre="auto"):
    log("=" * 60)
    log("📢 AGENTE CONTENIDO — SALE BAILE")
    log("=" * 60)
    
    # Leer eventos de Firebase si es necesario
    eventos = []
    if tipo in ("redes", "descripcion", "todos") and evento_nombre == "auto":
        log("📡 Leyendo eventos de Firebase...")
        eventos = leer_eventos_firebase()
        log(f"   → {len(eventos)} evento(s) publicado(s)")
    
    if not eventos and evento_nombre == "auto":
        # Usar un evento de ejemplo
        eventos = [{
            "title": "Bachata Social Night",
            "venue_name": "Club Palermo",
            "address": "Av. Santa Fe 2534",
            "city": "Buenos Aires (Palermo)",
            "start_time": "2026-09-26T22:00:00.000Z",
            "price": 6000,
            "is_free": False,
            "genre_family": "bachata",
            "organizer_instagram": "@salebaile",
        }]
        log("   → Usando evento de ejemplo (no hay eventos publicados)")
    
    resultados = {}
    
    if tipo in ("redes", "todos"):
        log(f"\n📱 Generando posts de redes sociales...")
        for evt in eventos[:3]:
            titulo = evt.get("title", "Evento")
            log(f"   📝 {titulo}...")
            resultado = generar_contenido_redes(evt)
            if resultado:
                posts = resultado.get("posts", [])
                log(f"   ✅ {len(posts)} post(s) generado(s)")
                for p in posts:
                    log(f"      [{p.get('tipo', 'N/A')}] {p.get('texto', '')[:100]}...")
                resultados.setdefault("redes", []).append({"evento": titulo, "posts": posts})
            time.sleep(2)
    
    if tipo in ("descripcion", "todos"):
        log(f"\n📝 Generando descripciones de eventos...")
        for evt in eventos[:5]:
            titulo = evt.get("title", "Evento")
            resultado = generar_descripcion_evento(evt)
            if resultado:
                desc = resultado.get("descripcion", "")
                log(f"   ✅ {titulo}: {desc[:80]}...")
                resultados.setdefault("descripciones", []).append({"evento": titulo, "descripcion": desc})
            time.sleep(1)
    
    if tipo in ("campaña", "todos"):
        log(f"\n🎯 Generando campaña de marketing...")
        resultado = generar_campana()
        if resultado:
            nombre = resultado.get("nombre_campana", "N/A")
            objetivo = resultado.get("objetivo", "N/A")
            log(f"   ✅ Campaña: {nombre}")
            log(f"   📋 Objetivo: {objetivo}")
            
            canales = resultado.get("canales", [])
            for c in canales:
                log(f"   📡 {c.get('nombre', 'N/A')}: {c.get('estrategia', 'N/A')[:80]}")
            
            kpis = resultado.get("kpis", [])
            if kpis:
                log(f"   📊 KPIs: {', '.join(kpis[:5])}")
            
            resultados["campaña"] = resultado
    
    # Guardar reporte
    reporte_path = os.path.expanduser("~/sale-baile/reporte_contenido.json")
    with open(reporte_path, "w", encoding="utf-8") as f:
        json.dump({"fecha": datetime.now().isoformat(), "resultados": resultados}, f, ensure_ascii=False, indent=2)
    log(f"\n💾 Reporte guardado: {reporte_path}")
    log("=" * 60)

if __name__ == "__main__":
    import sys
    tipo = sys.argv[1] if len(sys.argv) > 1 else "todos"
    evento = sys.argv[2] if len(sys.argv) > 2 else "auto"
    run_agente(tipo, evento)
