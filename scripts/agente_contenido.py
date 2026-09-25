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

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", os.environ.get("VITE_DEEPSEEK_API_KEY", ""))
if not DEEPSEEK_API_KEY:
    try:
        with open(".env.deepseek") as f:
            for line in f:
                if line.startswith("DEEPSEEK_API_KEY="):
                    DEEPSEEK_API_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
    except:
        pass
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
FIREBASE_URL = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile/events.json"
FIREBASE_LEADS_URL = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile/leads.json"

TIPOS_CONTENIDO = {
    "redes": "Posts para Instagram/Facebook/WhatsApp con hashtags, emojis y llamado a la acción",
    "descripcion": "Descripciones atractivas de eventos para la cartelera de Sale Baile",
    "campaña": "Campaña de marketing completa: copy, target, segmentación, presupuesto sugerido",
}

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def leer_eventos_firebase():
    """Lee eventos actuales de Firebase (solo futuros o muy recientes, no viejos)."""
    try:
        resp = urllib.request.urlopen(FIREBASE_URL, timeout=10)
        data = json.loads(resp.read())
        from datetime import datetime
        hoy = datetime.now()
        eventos = []
        if isinstance(data, list):
            for e in data:
                if not e or e.get("status") != "publicado":
                    continue
                start = e.get("start_time", "")
                try:
                    fecha_evento = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    if fecha_evento >= hoy:
                        eventos.append(e)
                except:
                    eventos.append(e)
            return eventos
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
    
    prompt = f"""Eres el community manager de Sale Baile (salebaile.web.app), la plataforma #1 de eventos de baile en Buenos Aires.

Manual de marca — tono de voz:
- Cercano, no corporativo — somos bailarines hablando con bailarines
- Español argentino (vos, no tú)
- Energético pero no gritón
- Referencias al mundo del baile (ritmo, pista, social, milonga)
- Máximo 2-3 emojis por post

Colores de marca: Negro #141316, Rojo #FF0000, Amarillo #F9B637
Tipografía títulos: Archivo Expanded Bold
Tipografía cuerpo: Montserrat Regular

Genera 3 posts de Instagram para este evento:

Evento: {titulo}
Ritmo: {genero}
Lugar: {lugar}, {direccion}, {ciudad}
Fecha: {fecha}
Precio: ${precio if isinstance(precio, (int, float)) else precio}
Organizador: {organizador}

Genera 3 posts diferentes:
1. Post de anuncio (con emojis, hashtags y CTA "publicá en Sale Baile")
2. Post de recordatorio (más corto, urgente)
3. Post para historias/reels (muy corto, directo)

Responde en español argentino con JSON: {{"posts": [{{"tipo": "anuncio", "texto": "...", "hashtags": ["..."]}}]}}"""

    payload = json.dumps({
        "model": "deepseek-chat",
        "messages": [{"role": "system", "content": "Responde siempre con JSON válido."}, {"role": "user", "content": prompt}],
        "temperature": 0.7
    }).encode()
    
    req = urllib.request.Request(DEEPSEEK_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {DEEPSEEK_API_KEY}")
    
    try:
        resp = urllib.request.urlopen(req, timeout=45)
        data = json.loads(resp.read())
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if text:
            return json.loads(text)
    except Exception as e:
        log(f"Error DeepSeek: {e}", "ERROR")
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
    
    req = urllib.request.Request(DEEPSEEK_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {DEEPSEEK_API_KEY}")
    
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
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
    
    req = urllib.request.Request(DEEPSEEK_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {DEEPSEEK_API_KEY}")
    
    try:
        resp = urllib.request.urlopen(req, timeout=45)
        data = json.loads(resp.read())
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if text:
            return json.loads(text)
    except Exception as e:
        log(f"Error DeepSeek: {e}", "ERROR")
    return None

def leer_leads_nuevos():
    """Lee leads con status 'new' de Firebase para crear contenido personalizado."""
    try:
        resp = urllib.request.urlopen(FIREBASE_LEADS_URL, timeout=10)
        data = json.loads(resp.read())
        if isinstance(data, dict):
            nuevos = {k: v for k, v in data.items() if v.get("status") == "new"}
            log(f"📥 Leads nuevos para contenido: {len(nuevos)}")
            return nuevos
        return {}
    except Exception as e:
        log(f"Error leyendo leads nuevos: {e}", "WARN")
        return {}

def guardar_propuesta_fb(key, propuesta):
    url = f"https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile/leads/{key.replace('@','').replace('.','')}.json"
    payload = json.dumps({"mensaje_contenido": propuesta, "status": "new", "generated_at": datetime.now().isoformat()}).encode()
    req = urllib.request.Request(url, data=payload, method="PATCH")
    req.add_header("Content-Type", "application/json")
    try:
        urllib.request.urlopen(req, timeout=15)
        log(f"   💾 Propuesta guardada en Firebase para {key}")
    except Exception as e:
        log(f"   ⚠ Error guardando propuesta en FB: {e}", "WARN")

def generar_contenido_para_nuevo(lead):
    """Genera contenido personalizado para un lead nuevo (preparación rápida, no DM)."""
    handle = lead.get("handle", "")
    estilo = lead.get("dance_style", "baile")
    eventos = lead.get("event_posts_count", 0)
    score = lead.get("score", 0)
    caption = lead.get("sample_caption", "")[:120]
    prompt = f"Crea una propuesta breve (máx 2 líneas) para invitar a @{handle} a publicar en Sale Baile. Estilo: {estilo}. Eventos detectados: {eventos}. Score: {score}. Responde con JSON: {{'propuesta': '...'}}"
    payload = json.dumps({"model":"deepseek-chat","messages":[{"role":"system","content":"Responde con JSON."},{"role":"user","content":prompt}],"temperature":0.6}).encode()
    req = urllib.request.Request(DEEPSEEK_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {DEEPSEEK_API_KEY}")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        text = json.loads(resp.read()).get("choices", [{}])[0].get("message", {}).get("content", "")
        if text:
            return json.loads(text)
    except:
        pass
    return None

def run_agente(tipo="todos", evento_nombre="auto"):
    log("=" * 60)
    log("📢 AGENTE CONTENIDO — SALE BAILE")
    log("=" * 60)
    
    # Leer nuevos leads para contenido personalizado
    nuevos_leads = leer_leads_nuevos() if tipo in ("redes", "todos") else {}
    if nuevos_leads:
        log(f"📥 Nuevos leads para contenido: {len(nuevos_leads)}")
    
    # Leer eventos de Firebase (solo futuros)
    eventos = []
    if tipo in ("redes", "descripcion", "todos") and evento_nombre == "auto":
        log("📡 Leyendo eventos futuros de Firebase...")
        eventos = leer_eventos_firebase()
        log(f"   → {len(eventos)} evento(s) futuro(s)")
    
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
    
    # Generar contenido para nuevos leads (prioritario sobre eventos viejos)
    if nuevos_leads:
        log(f"\n📢 Generando contenido para {len(nuevos_leads)} nuevos leads...")
        for key, lead in list(nuevos_leads.items())[:5]:  # limitar a 5 para no exceder rate
            resultado = generar_contenido_para_nuevo(lead)
            if resultado:
                propuesta = resultado.get("propuesta", "")
                log(f"   ✅ {lead.get('handle', '')}: {propuesta[:100]}...")
                resultados.setdefault("nuevos_leads", []).append({"handle": lead.get("handle", ""), "propuesta": propuesta})
                guardar_propuesta_fb(key, propuesta)
            time.sleep(1)
    
    # Generar contenido de atracción para organizadores
    log(f"\n🎯 Generando contenido de atracción para organizadores...")
    atraccion = generar_contenido_atraccion()
    if atraccion:
        resultados["atraccion_organizadores"] = atraccion
        guardar_contenido_atraccion_fb(atraccion)
    else:
        log("   ⚠ No se pudo generar contenido de atracción", "WARN")
    
    # Guardar reporte
    reporte_path = os.path.expanduser("~/sale-baile/reporte_contenido.json")
    with open(reporte_path, "w", encoding="utf-8") as f:
        json.dump({"fecha": datetime.now().isoformat(), "resultados": resultados}, f, ensure_ascii=False, indent=2)
    log(f"\n💾 Reporte guardado: {reporte_path}")
    log("=" * 60)

def generar_contenido_atraccion():
    """Contenido que atrae a organizadores a seguirnos y meterse en nuestra página."""
    prompt = """Eres el community manager de Sale Baile (salebaile.web.app). Crea 3 posts para atraer organizadores de baile en Buenos Aires a seguir nuestra página y publicar sus eventos con nosotros. Tono cercano, argentino (vos), energía sin gritar, máximo 2 emojis. Incluí llamada clara: 'seguinos' y 'publicá en salebaile.web.app'. Respondé con JSON: {"posts": [{"texto": "...", "hashtags": ["..."]}]}"""
    payload = json.dumps({"model":"deepseek-chat","messages":[{"role":"system","content":"Responde con JSON."},{"role":"user","content":prompt}],"temperature":0.7}).encode()
    req = urllib.request.Request(DEEPSEEK_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Bearer {DEEPSEEK_API_KEY}")
    try:
        resp = urllib.request.urlopen(req, timeout=45)
        text = json.loads(resp.read()).get("choices", [{}])[0].get("message", {}).get("content", "")
        if text:
            return json.loads(text)
    except Exception as e:
        log(f"Error generando atracción: {e}", "WARN")
    return None

def guardar_contenido_atraccion_fb(resultado):
    url = "https://openclaw-nyj-ia-web-ddb56-default-rtdb.firebaseio.com/sale_baile/contenido_atraccion.json"
    payload = json.dumps({"fecha": datetime.now().isoformat(), "tipo": "atraccion_organizadores", "posts": resultado.get("posts", [])}).encode()
    req = urllib.request.Request(url, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")
    try:
        urllib.request.urlopen(req, timeout=15)
        log("✅ Contenido de atracción guardado en Firebase")
    except Exception as e:
        log(f"Error guardando en FB: {e}", "WARN")

if __name__ == "__main__":
    import sys
    tipo = sys.argv[1] if len(sys.argv) > 1 else "todos"
    evento = sys.argv[2] if len(sys.argv) > 2 else "auto"
    run_agente(tipo, evento)
