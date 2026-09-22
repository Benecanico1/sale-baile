#!/usr/bin/env python3
"""
Sale Baile — Dashboard Web Local
Panel de control visual para ejecutar los bots desde el navegador.

Abre un servidor local en http://localhost:8585 con botones para
cada bot. Hacés clic y el bot se ejecuta, mostrando el resultado
en pantalla.

Uso:
  python scripts/dashboard.py
  Luego abrí http://localhost:8585 en tu navegador
"""

import os
import sys
import json
import subprocess
import threading
import urllib.request
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

# ============================================================
# CONFIGURACIÓN
# ============================================================

PORT = 8585
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Cargar .env si existe
ENV_FILE = os.path.join(PROJECT_ROOT, ".env")
if os.path.exists(ENV_FILE):
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ[key.strip()] = value.strip().strip("'").strip('"')

# Lista de bots
BOTS = [
    {
        "id": "radar",
        "name": "Radar",
        "emoji": "📊",
        "desc": "Scrapear Instagram y publicar eventos",
        "script": "agente_radar.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "cazador",
        "name": "Cazador",
        "emoji": "🎯",
        "desc": "Buscar organizadores nuevos por hashtags",
        "script": "agente_cazador.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "outreach",
        "name": "Outreach (Generar)",
        "emoji": "📨",
        "desc": "Generar DMs sin enviar (modo seguro)",
        "script": "agente_outreach.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "outreach_send",
        "name": "Outreach (Enviar)",
        "emoji": "📤",
        "desc": "Enviar DMs REALES por Instagram",
        "script": "agente_outreach.py",
        "args": ["--send", "--limit", "3"],
        "confirm": True,
    },
    {
        "id": "reportes",
        "name": "Reportes Semanales",
        "emoji": "📅",
        "desc": "Métricas + sugerencias de mejora con IA",
        "script": "agente_reportes.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "autodeteccion",
        "name": "Auto-Detección",
        "emoji": "🔍",
        "desc": "Detectar flyers nuevos y crear borradores",
        "script": "agente_autodeteccion.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "contenido",
        "name": "Contenido",
        "emoji": "✍️",
        "desc": "Generar posts de redes sociales",
        "script": "agente_contenido.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "estratega",
        "name": "Estratega",
        "emoji": "📈",
        "desc": "Analizar mercado y competencia",
        "script": "agente_estratega.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "investigador",
        "name": "Investigador",
        "emoji": "🔬",
        "desc": "Buscar tecnologías nuevas",
        "script": "agente_investigador.py",
        "args": [],
        "confirm": False,
    },
    {
        "id": "revisor",
        "name": "Revisor",
        "emoji": "🐛",
        "desc": "Revisar código del proyecto",
        "script": "agente_revisor.py",
        "args": ["sale-baile"],
        "confirm": False,
    },
]

# Estado de ejecución
execution_state = {"running": False, "bot_id": None, "output": "", "error": False}


# ============================================================
# HTML DEL DASHBOARD
# ============================================================

def get_html():
    bots_json = json.dumps(BOTS)
    # Usar string template para evitar conflictos con llaves del CSS/JS
    template = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sale Baile — Panel de Bots</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #141316;
  color: #ffffff;
  min-height: 100vh;
  padding: 20px;
}
.header { text-align: center; padding: 20px 0 30px; }
.header h1 {
  font-size: 28px;
  background: linear-gradient(135deg, #FF0000, #F9B637);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}
.header p { color: #888; font-size: 14px; margin-top: 8px; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}
.card {
  background: #1e1e22;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 20px;
  transition: all 0.2s;
  cursor: pointer;
}
.card:hover { border-color: #FF0000; background: #252529; transform: translateY(-2px); }
.card.running { border-color: #F9B637; background: #2a2a30; }
.card .emoji { font-size: 32px; margin-bottom: 10px; }
.card .name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.card .desc { font-size: 13px; color: #888; }
.card .confirm-badge {
  display: inline-block; background: #FF0000; color: #fff;
  font-size: 10px; padding: 2px 8px; border-radius: 4px;
  margin-top: 8px; font-weight: 700;
}
.card .status { margin-top: 10px; font-size: 12px; color: #F9B637; display: none; }
.card.running .status { display: block; }
.output {
  max-width: 1200px; margin: 30px auto 0;
  background: #0d0d10; border: 1px solid #333; border-radius: 16px;
  padding: 20px; min-height: 200px;
  font-family: 'Courier New', monospace; font-size: 13px;
  white-space: pre-wrap; overflow-x: auto; max-height: 500px; overflow-y: auto;
}
.output .line { margin-bottom: 2px; }
.output .error { color: #FF0000; }
.output .success { color: #F9B637; }
.output .info { color: #aaa; }
.footer { text-align: center; padding: 30px 0 10px; color: #555; font-size: 12px; }
</style>
</head>
<body>
<div class="header">
  <h1>🔥 Sale Baile — Panel de Bots</h1>
  <p>Ejecutá los bots con un clic — la plataforma #1 de eventos de baile en Buenos Aires</p>
</div>
<div class="grid" id="grid"></div>
<div class="output" id="output">
  <div class="line info">Seleccioná un bot arriba para empezar. El output aparecerá acá.</div>
</div>
<div class="footer">Sale Baile • salebaile.web.app • ©2026 Ingeniería JH</div>
<script>
const BOTS = __BOTS_JSON__;
const grid = document.getElementById('grid');
const output = document.getElementById('output');

BOTS.forEach(bot => {
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'card-' + bot.id;
  card.innerHTML = '<div class="emoji">' + bot.emoji + '</div>'
    + '<div class="name">' + bot.name + '</div>'
    + '<div class="desc">' + bot.desc + '</div>'
    + (bot.confirm ? '<div class="confirm-badge">⚠️ Envío real</div>' : '')
    + '<div class="status">Ejecutando...</div>';
  card.onclick = function() { runBot(bot); };
  grid.appendChild(card);
});

function runBot(bot) {
  if (bot.confirm) {
    if (!confirm('⚠️ "' + bot.name + '" envía mensajes reales. ¿Continuar?')) return;
  }
  document.querySelectorAll('.card').forEach(function(c) { c.classList.remove('running'); });
  var card = document.getElementById('card-' + bot.id);
  card.classList.add('running');
  output.innerHTML = '<div class="line info">▶ Ejecutando: ' + bot.name + '...</div>';

  fetch('/run?id=' + bot.id)
    .then(function(r) { return r.json(); })
    .then(function(data) { displayOutput(data.output || '', data.error || false); })
    .catch(function(e) { displayOutput('Error: ' + e.message, true); })
    .then(function() { card.classList.remove('running'); });
}

function displayOutput(text, isError) {
  var lines = text.split('\\n');
  output.innerHTML = lines.map(function(l) {
    var cls = 'line';
    if (l.indexOf('ERROR') >= 0 || l.indexOf('❌') >= 0) cls = 'line error';
    else if (l.indexOf('✅') >= 0 || l.indexOf('✓') >= 0) cls = 'line success';
    else if (l.charAt(0) === '[') cls = 'line info';
    return '<div class="' + cls + '">' + escapeHtml(l) + '</div>';
  }).join('');
  output.scrollTop = output.scrollHeight;
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
</script>
</body>
</html>'''
    return template.replace("__BOTS_JSON__", bots_json)


# ============================================================
# EJECUTAR BOTS
# ============================================================

def run_bot(bot_id):
    """Ejecuta un bot y captura su output."""
    bot = next((b for b in BOTS if b["id"] == bot_id), None)
    if not bot:
        return "Bot no encontrado", True

    script_path = os.path.join(PROJECT_ROOT, "scripts", bot["script"])
    if not os.path.exists(script_path):
        return f"Error: no se encuentra {script_path}", True

    cmd = [sys.executable, script_path] + bot.get("args", [])
    output_lines = []

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=PROJECT_ROOT,
            env=os.environ,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        for line in proc.stdout:
            output_lines.append(line.rstrip())
            if len(output_lines) > 500:
                output_lines.append("... (output truncado)")
                break
        proc.wait(timeout=600)
        return "\n".join(output_lines), False
    except subprocess.TimeoutExpired:
        proc.kill()
        return "\n".join(output_lines) + "\n\n⏱️ Timeout: el bot tardó demasiado.", True
    except Exception as e:
        return f"Error ejecutando {bot['name']}: {e}", True


# ============================================================
# SERVIDOR HTTP
# ============================================================

class DashboardHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _send_cors_headers(self):
        """Envía headers CORS para permitir peticiones desde salebaile.web.app."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        """Responde a peticiones preflight OPTIONS de CORS."""
        self.send_response(204)
        self._send_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            body = get_html().encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        elif self.path.startswith("/run?id="):
            bot_id = self.path.split("id=")[1].split("&")[0]
            output, error = run_bot(bot_id)
            body = json.dumps({"output": output, "error": error}).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == "/api/bots":
            body = json.dumps(BOTS).encode("utf-8")
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        else:
            body = b'{"error": "not found"}'
            self.send_response(404)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # Silenciar logs del servidor


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 50)
    print("  SALE BAILE — DASHBOARD WEB LOCAL")
    print("=" * 50)
    print(f"  Abriendo http://localhost:{PORT} ...")
    print(f"  Cerrá esta ventana cuando termines.")
    print("=" * 50)

    # Abrir navegador automáticamente
    import webbrowser
    webbrowser.open(f"http://localhost:{PORT}")

    server = HTTPServer(("0.0.0.0", PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDashboard cerrado. ¡Baila, no te quedes quieto!")
        server.shutdown()


if __name__ == "__main__":
    main()
