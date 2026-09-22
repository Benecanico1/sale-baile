#!/usr/bin/env python3
"""
Agente Investigador — Ingeniería JH
Busca tecnologías, librerías y herramientas nuevas para mejorar los proyectos.
Investiga tendencias en IA, automatización, web y mobile.

Uso: python scripts/agente_investigador.py [tema]
  tema: ia | web | mobile | firebase | todos (default: todos)
"""

import json
import time
import urllib.request
import urllib.parse
from datetime import datetime

GEMINI_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_KEY}"

# Stack actual de los proyectos
STACK_ACTUAL = {
    "frontend": ["React", "Vite", "TypeScript", "Tailwind CSS"],
    "backend": ["Python", "FastAPI", "Node.js"],
    "database": ["Firebase Realtime DB", "Supabase"],
    "ia": ["Google Gemini 2.0 Flash", "Apify Instagram Scraper", "Tesseract.js OCR"],
    "hosting": ["Firebase Hosting", "Vercel"],
    "mobile": ["Capacitor", "Android APK"],
    "payments": ["MercadoPago"],
    "maps": ["Leaflet", "Mapbox", "OpenStreetMap Nominatim"],
    "auth": ["Google OAuth", "Firebase Auth"],
}

TEMAS = {
    "ia": "Inteligencia Artificial, Machine Learning y automatización",
    "web": "Desarrollo web (React, Vite, TypeScript, Tailwind)",
    "mobile": "Desarrollo mobile (Capacitor, PWA, Android)",
    "firebase": "Firebase, Supabase y backend-as-a-service",
}

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

def buscar_web(tema):
    """Busca en la web tecnologías y herramientas nuevas."""
    queries = {
        "ia": "best AI APIs 2025 2026 vision OCR scraping automation tools",
        "web": "React Vite new libraries 2025 2026 performance optimization",
        "mobile": "Capacitor vs React Native 2025 2026 PWA Android best practices",
        "firebase": "Firebase vs Supabase 2025 2026 alternatives comparison",
    }
    
    q = queries.get(tema, f"new tools and technologies for {tema} 2025 2026")
    
    # Usar Gemini para generar recomendaciones basadas en el stack actual
    prompt = f"""Eres un investigador de tecnología experto. Analiza el stack actual de una empresa y recomienda herramientas/librerías nuevas que podrían mejorar sus proyectos.

Stack actual:
- Frontend: {', '.join(STACK_ACTUAL['frontend'])}
- Backend: {', '.join(STACK_ACTUAL['backend'])}
- Database: {', '.join(STACK_ACTUAL['database'])}
- IA: {', '.join(STACK_ACTUAL['ia'])}
- Hosting: {', '.join(STACK_ACTUAL['hosting'])}
- Mobile: {', '.join(STACK_ACTUAL['mobile'])}
- Payments: {', '.join(STACK_ACTUAL['payments'])}
- Maps: {', '.join(STACK_ACTUAL['maps'])}
- Auth: {', '.join(STACK_ACTUAL['auth'])}

Tema de investigación: {TEMAS.get(tema, tema)}

Recomienda 5-8 herramientas o tecnologías nuevas que:
1. Sean relevantes para el stack actual
2. Mejoren performance, seguridad o experiencia de usuario
3. Sean estables y mantenidas (no experimentales)
4. Tengan buena documentación en español o inglés

Responde en español con un JSON: {{"recomendaciones": [{{"nombre": "...", "categoria": "...", "descripcion": "...", "beneficio": "...", "url": "...", "prioridad": "alta|media|baja"}}]}}"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.3}
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

def run_agente(tema="todos"):
    log("=" * 60)
    log("🔬 AGENTE INVESTIGADOR — INGENIERÍA JH")
    log("=" * 60)
    
    temas_a_investigar = list(TEMAS.keys()) if tema == "todos" else [tema]
    
    resultados = {}
    
    for t in temas_a_investigar:
        log(f"\n🔬 Investigando: {TEMAS.get(t, t)}")
        log(f"   Stack actual: {', '.join(STACK_ACTUAL.get(t.split('_')[0], STACK_ACTUAL['frontend']))}")
        
        resultado = buscar_web(t)
        if resultado:
            recomendaciones = resultado.get("recomendaciones", [])
            log(f"   ✅ {len(recomendaciones)} recomendación(es)")
            
            for rec in recomendaciones:
                prioridad = rec.get("prioridad", "media")
                emoji = "🔴" if prioridad == "alta" else "🟡" if prioridad == "media" else "🟢"
                log(f"\n   {emoji} {rec.get('nombre', 'N/A')} ({rec.get('categoria', 'N/A')})")
                log(f"      📝 {rec.get('descripcion', 'N/A')}")
                log(f"      ✨ Beneficio: {rec.get('beneficio', 'N/A')}")
                log(f"      🔗 {rec.get('url', 'N/A')}")
            
            resultados[t] = resultado
        else:
            log(f"   ❌ No se pudo investigar", "ERROR")
        
        time.sleep(2)
    
    # Guardar reporte
    reporte_path = os.path.expanduser("~/sale-baile/reporte_investigacion.json")
    import os
    with open(reporte_path, "w", encoding="utf-8") as f:
        json.dump({"fecha": datetime.now().isoformat(), "resultados": resultados}, f, ensure_ascii=False, indent=2)
    log(f"\n💾 Reporte guardado: {reporte_path}")
    log("=" * 60)

if __name__ == "__main__":
    import os
    tema = sys.argv[1] if len(sys.argv) > 1 else "todos"
    run_agente(tema)
