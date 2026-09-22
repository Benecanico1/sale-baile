#!/usr/bin/env python3
"""
Agente Revisor — Sale Baile / Ingeniería JH
Revisa el código de las aplicaciones buscando bugs, errores de seguridad,
mejoras de performance y problemas de calidad.

Uso: python scripts/agente_revisor.py [proyecto]
  proyecto: sale-baile | quinela-master-pro | todos (default: todos)
"""

import os
import sys
import json
import time
import urllib.request
from datetime import datetime

# ============================================================
# CONFIGURACIÓN
# ============================================================

GEMINI_KEY = os.environ.get("VITE_GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_KEY}"

PROYECTOS = {
    "sale-baile": {
        "path": os.path.expanduser("~/sale-baile/src"),
        "tipo": "React + TypeScript + Firebase",
        "archivos_clave": [
            "src/lib/radarBot.ts",
            "src/lib/mockData.ts",
            "src/lib/cloudRequests.ts",
            "src/lib/supabase.ts",
            "src/App.tsx",
        ],
    },
}

# ============================================================
# LOG
# ============================================================

def log(msg, level="INFO"):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")

# ============================================================
# LEER ARCHIVOS DEL PROYECTO
# ============================================================

def leer_archivo(path):
    """Lee un archivo y devuelve su contenido."""
    try:
        full_path = os.path.expanduser(path)
        if not os.path.exists(full_path):
            return None
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception as e:
        log(f"Error leyendo {path}: {e}", "ERROR")
        return None

def buscar_patrones_peligrosos(contenido, archivo):
    """Busca patrones peligrosos en el código."""
    problemas = []
    
    # API keys hardcodeadas
    import re
    api_keys = re.findall(r'(?:api_key|apikey|api-key|apiKey)\s*[=:]\s*["\']([A-Za-z0-9_\-]{20,})["\']', contenido, re.IGNORECASE)
    if api_keys:
        problemas.append(f"⚠️ Posible API key hardcodeada: {len(api_keys)} encontrada(s)")
    
    # Contraseñas hardcodeadas
    passwords = re.findall(r'(?:password|passwd|pwd)\s*[=:]\s*["\']([^"\']+)["\']', contenido, re.IGNORECASE)
    if passwords:
        problemas.append(f"⚠️ Posible contraseña hardcodeada: {len(passwords)} encontrada(s)")
    
    # console.log olvidados
    console_logs = contenido.count("console.log(")
    if console_logs > 10:
        problemas.append(f"ℹ️ {console_logs} console.log() — considerar limpiar en producción")
    
    # TODO/FIXME/HACK
    todos = len(re.findall(r'\b(TODO|FIXME|HACK|XXX)\b', contenido, re.IGNORECASE))
    if todos > 0:
        problemas.append(f"📝 {todos} TODO/FIXME/HACK pendiente(s)")
    
    # eval() peligroso
    evals = contenido.count("eval(")
    if evals > 0:
        problemas.append(f"🔴 {evals} eval() — peligro de seguridad")
    
    # innerHTML sin sanitizar
    innerhtml = contenido.count("innerHTML")
    if innerhtml > 0:
        problemas.append(f"⚠️ {innerhtml} innerHTML — posible XSS")
    
    # fetch sin manejo de errores
    fetches = contenido.count("fetch(")
    try_catch = contenido.count("try {") + contenido.count("try{")
    if fetches > 5 and try_catch < fetches * 0.5:
        problemas.append(f"⚠️ {fetches} fetch() pero solo {try_catch} try/catch — posible falta de manejo de errores")
    
    return problemas

def analizar_con_gemini(contenido, archivo):
    """Envía el código a Gemini para análisis de calidad."""
    if len(contenido) > 50000:
        contenido = contenido[:50000] + "\n... (truncado)"
    
    prompt = f"""Eres un revisor de código experto. Analiza este archivo TypeScript/JavaScript de una app web y encuentra:
1. Bugs potenciales o errores lógicos
2. Problemas de seguridad
3. Mejoras de performance
4. Mejores prácticas que no se están siguiendo
5. Código duplicado o innecesario

Responde en español con un JSON: {{"bugs": ["..."], "seguridad": ["..."], "performance": ["..."], "mejoras": ["..."], "puntuacion": 0-100}}

Archivo: {archivo}

Código:
{contenido}"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
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

# ============================================================
# AGENTE PRINCIPAL
# ============================================================

def run_agente(proyecto="todos"):
    log("=" * 60)
    log("🔍 AGENTE REVISOR — INGENIERÍA JH")
    log("=" * 60)
    
    proyectos_a_revisar = list(PROYECTOS.keys()) if proyecto == "todos" else [proyecto]
    
    reporte_total = {}
    
    for proj_name in proyectos_a_revisar:
        proj = PROYECTOS.get(proj_name)
        if not proj:
            log(f"Proyecto '{proj_name}' no encontrado", "ERROR")
            continue
        
        log(f"\n📦 Revisando: {proj_name} ({proj['tipo']})")
        base_path = os.path.expanduser(f"~/{proj_name}")
        
        # 1. Revisión estática (patrones peligrosos)
        log(f"  🔍 Revisión estática...")
        problemas_estaticos = {}
        
        for archivo in proj["archivos_clave"]:
            full_path = os.path.join(base_path, archivo)
            contenido = leer_archivo(full_path)
            if contenido:
                problemas = buscar_patrones_peligrosos(contenido, archivo)
                if problemas:
                    problemas_estaticos[archivo] = problemas
                    for p in problemas:
                        log(f"    {p}")
        
        # 2. Revisión con IA (Gemini)
        log(f"  🤖 Análisis con IA...")
        resultados_ia = {}
        
        for archivo in proj["archivos_clave"][:3]:  # Máximo 3 archivos por proyecto
            full_path = os.path.join(base_path, archivo)
            contenido = leer_archivo(full_path)
            if contenido and len(contenido) > 100:
                log(f"    📄 Analizando {archivo}...")
                resultado = analizar_con_gemini(contenido, archivo)
                if resultado:
                    resultados_ia[archivo] = resultado
                    puntuacion = resultado.get("puntuacion", "N/A")
                    bugs = resultado.get("bugs", [])
                    seguridad = resultado.get("seguridad", [])
                    log(f"    → Puntuación: {puntuacion}/100 | Bugs: {len(bugs)} | Seguridad: {len(seguridad)}")
                    for b in bugs[:3]:
                        log(f"      🐛 {b}")
                    for s in seguridad[:3]:
                        log(f"      🔒 {s}")
                time.sleep(2)
        
        reporte_total[proj_name] = {
            "problemas_estaticos": problemas_estaticos,
            "analisis_ia": resultados_ia,
            "fecha": datetime.now().isoformat(),
        }
    
    # Resumen
    log(f"\n{'=' * 60}")
    log("📊 RESUMEN DE REVISIÓN")
    log("=" * 60)
    
    for proj_name, reporte in reporte_total.items():
        log(f"\n📦 {proj_name}:")
        log(f"  Problemas estáticos: {sum(len(p) for p in reporte['problemas_estaticos'].values())}")
        log(f"  Archivos analizados con IA: {len(reporte['analisis_ia'])}")
        for archivo, ai in reporte["analisis_ia"].items():
            log(f"    {archivo}: {ai.get('puntuacion', 'N/A')}/100")
    
    # Guardar reporte
    reporte_path = os.path.expanduser("~/sale-baile/reporte_revision.json")
    with open(reporte_path, "w", encoding="utf-8") as f:
        json.dump(reporte_total, f, ensure_ascii=False, indent=2)
    log(f"\n💾 Reporte guardado: {reporte_path}")
    log("=" * 60)


if __name__ == "__main__":
    proyecto = sys.argv[1] if len(sys.argv) > 1 else "todos"
    run_agente(proyecto)
