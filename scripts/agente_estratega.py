#!/usr/bin/env python3
"""
Agente Estratega — Ingeniería JH
Analiza mercado, competencia y oportunidades para los proyectos.
Especializado en el mercado de eventos de baile en Buenos Aires.

Uso: python scripts/agente_estratega.py [tipo]
  tipo: competencia | mercado | oportunidades | todos (default: todos)
"""

import json
import time
import os
import urllib.request
from datetime import datetime

GEMINI_KEY = ""
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_KEY}"

PROYECTOS = {
    "sale-baile": {
        "descripcion": "Plataforma de eventos de baile en Buenos Aires (Bachata, Salsa, Tango). Radar IA, bot de Instagram, Gemini Vision, Firebase.",
        "monetizacion": "Comisión por entrada vendida, destacados premium, promotores",
        "usuarios": "Bailarines, organizadores, academias, venues en CABA y GBA",
    },
    "quinela-master-pro": {
        "descripcion": "Motor predictivo IA para Quiniela con 3 motores (ML, Tendencia, Estadístico). OCR, Firebase, APK Android.",
        "monetizacion": "Suscripción VIP, acceso premium a 5 pronósticos",
        "usuarios": "Jugadores de quiniela en Argentina",
    },
    "dynotech-power": {
        "descripcion": "Sistema de agenda y BI financiero para talleres automotrices con agentes IA.",
        "monetizacion": "SaaS mensual, comisión por transacción",
        "usuarios": "Talleres automotrices en Buenos Aires",
    },
    "openclaw-lead-hunter": {
        "descripcion": "Bots cazadores de clientes B2B, extracción masiva de leads comerciales.",
        "monetizacion": "Por lead, suscripción mensual",
        "usuarios": "Empresas B2B en Argentina",
    },
}

TIPOS_ANALISIS = {
    "competencia": "Analiza los competidores directos e indirectos de cada proyecto. Quién compite, qué features tienen, qué les falta, cómo diferenciarse.",
    "mercado": "Analiza el tamaño del mercado, estacionalidad, precios típicos, segmentos de usuarios y tendencias en Argentina.",
    "oportunidades": "Identifica oportunidades de negocio, partnerships, nichos sin explotar y features que podrían generar más ingresos.",
}

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def analizar_con_gemini(tipo_analisis, proyectos):
    """Analiza el mercado/competencia con Gemini."""
    
    proyectos_desc = "\n".join([
        f"- {nombre}: {p['descripcion']} | Monetización: {p['monetizacion']} | Usuarios: {p['usuarios']}"
        for nombre, p in proyectos.items()
    ])
    
    prompt = f"""Eres un analista estratégico de negocios experto en tecnología y mercado argentino. 

Proyectos a analizar:
{proyectos_desc}

Tipo de análisis: {TIPOS_ANALISIS.get(tipo_analisis, tipo_analisis)}

Para cada proyecto, responde en español con un JSON:
{{
  "proyectos": {{
    "nombre_proyecto": {{
      "analisis": "...",
      "competidores": [{{"nombre": "...", "features": "...", "debilidad": "..."}}],
      "tamano_mercado": "...",
      "precios_tipicos": "...",
      "oportunidades": ["..."],
      "amenazas": ["..."],
      "recomendacion": "..."
    }}
  }}
}}"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.3}
    }).encode()
    
    req = urllib.request.Request(GEMINI_URL, data=payload, method="POST")
    req.add_header("Content-Type", "application/json")
    
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=45)
            data = json.loads(resp.read())
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if text:
                return json.loads(text)
        except Exception as e:
            if attempt < 2:
                log(f"Error Gemini, reintentando... ({e})", "WARN")
                time.sleep(5)
            else:
                log(f"Error Gemini: {e}", "ERROR")
    return None

def run_agente(tipo="todos"):
    log("=" * 60)
    log("📊 AGENTE ESTRATEGA — INGENIERÍA JH")
    log("=" * 60)
    
    tipos = list(TIPOS_ANALISIS.keys()) if tipo == "todos" else [tipo]
    
    resultados = {}
    
    for t in tipos:
        log(f"\n📊 Analizando: {TIPOS_ANALISIS.get(t, t)}")
        
        resultado = analizar_con_gemini(t, PROYECTOS)
        if resultado:
            log(f"   ✅ Análisis completado")
            proyectos_res = resultado.get("proyectos", {})
            
            for nombre, analisis in proyectos_res.items():
                log(f"\n   📦 {nombre}:")
                log(f"      📝 {analisis.get('analisis', 'N/A')[:200]}")
                
                competidores = analisis.get("competidores", [])
                if competidores:
                    log(f"      🏢 Competidores ({len(competidores)}):")
                    for c in competidores[:3]:
                        log(f"         - {c.get('nombre', 'N/A')}: {c.get('features', 'N/A')[:80]}")
                
                oportunidades = analisis.get("oportunidades", [])
                if oportunidades:
                    log(f"      💡 Oportunidades ({len(oportunidades)}):")
                    for o in oportunidades[:3]:
                        log(f"         - {o}")
                
                recomendacion = analisis.get("recomendacion", "")
                if recomendacion:
                    log(f"      🎯 Recomendación: {recomendacion[:200]}")
            
            resultados[t] = resultado
        else:
            log(f"   ❌ No se pudo completar el análisis", "ERROR")
        
        time.sleep(2)
    
    # Guardar reporte
    reporte_path = os.path.expanduser("~/sale-baile/reporte_estrategia.json")
    with open(reporte_path, "w", encoding="utf-8") as f:
        json.dump({"fecha": datetime.now().isoformat(), "resultados": resultados}, f, ensure_ascii=False, indent=2)
    log(f"\n💾 Reporte guardado: {reporte_path}")
    log("=" * 60)

if __name__ == "__main__":
    import sys
    tipo = sys.argv[1] if len(sys.argv) > 1 else "todos"
    run_agente(tipo)
