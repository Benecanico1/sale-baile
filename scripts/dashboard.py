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

# ============================================================
# SECUENCIA DE BOTS (orden lógico de ejecución)
# ============================================================

SEQUENCE = [
    {"id": "radar", "label": "Radar"},
    {"id": "cazador", "label": "Cazador"},
    {"id": "autodeteccion", "label": "Auto-Detección"},
    {"id": "contenido", "label": "Contenido"},
    {"id": "estratega", "label": "Estratega"},
    {"id": "investigador", "label": "Investigador"},
    {"id": "outreach", "label": "Outreach (Generar)"},
    {"id": "outreach_send", "label": "Outreach (Enviar)"},
    {"id": "reportes", "label": "Reportes"},
    {"id": "revisor", "label": "Revisor"},
]

SEQUENCE_STATE_FILE = os.path.join(PROJECT_ROOT, "sequence.json")
_sequence_stop_flag = threading.Event()
_sequence_thread = None

def load_sequence_state():
    try:
        if os.path.exists(SEQUENCE_STATE_FILE):
            with open(SEQUENCE_STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {"running": False, "current_step": None, "completed": [], "failed": [], "started_at": None, "finished_at": None}

def save_sequence_state(state):
    try:
        with open(SEQUENCE_STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def execute_sequence():
    global _sequence_thread
    state = load_sequence_state()
    state["running"] = True
    state["current_step"] = None
    state["completed"] = []
    state["failed"] = []
    state["started_at"] = datetime.now().isoformat()
    state["finished_at"] = None
    save_sequence_state(state)
    for step in SEQUENCE:
        if _sequence_stop_flag.is_set():
            state["running"] = False
            state["current_step"] = "cancelado"
            state["finished_at"] = datetime.now().isoformat()
            save_sequence_state(state)
            return
        bot_id = step["id"]
        state["current_step"] = bot_id
        save_sequence_state(state)
        output, error = run_bot(bot_id)
        if error:
            state["failed"].append(bot_id)
        else:
            state["completed"].append(bot_id)
        save_sequence_state(state)
    state["running"] = False
    state["current_step"] = None
    state["finished_at"] = datetime.now().isoformat()
    save_sequence_state(state)


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
.card.completed { border-color: #00C851; background: #1a2e1a; }
.card.failed { border-color: #FF4444; background: #2e1a1a; }
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
/* Secuencia */
.seq-panel { max-width:1200px; margin:30px auto 0; background:#1e1e22; border:1px solid #F9B637; border-radius:16px; padding:24px; }
.seq-panel h2 { color:#F9B637; font-size:20px; margin-bottom:16px; }
.seq-ctrl { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.btn { padding:10px 24px; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; transition:all .2s; }
.btn-start { background:#00C851; color:#000; }
.btn-start:hover { background:#00a844; }
.btn-stop { background:#FF0000; color:#fff; }
.btn-stop:hover { background:#cc0000; }
.btn:disabled { opacity:.4; cursor:not-allowed; }
.seq-progress { flex:1; min-width:200px; height:8px; background:#333; border-radius:4px; overflow:hidden; }
.seq-progress-bar { height:100%; background:linear-gradient(90deg,#FF0000,#F9B637); border-radius:4px; transition:width .3s; width:0%; }
.seq-steps { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
.chip { padding:6px 12px; border-radius:8px; font-size:12px; background:#2a2a30; border:1px solid #333; display:flex; align-items:center; gap:6px; }
.chip.cur { border-color:#F9B637; }
.chip.done { border-color:#00C851; background:#1a2e1a; }
.chip.fail { border-color:#FF4444; background:#2e1a1a; }
.footer { text-align: center; padding: 30px 0 10px; color: #555; font-size: 12px; }
</style>
</head>
<body>
<div class="header">
  <h1>🔥 Sale Baile — Panel de Bots</h1>
  <p>Ejecutá los bots con un clic — la plataforma #1 de eventos de baile en Buenos Aires</p>
</div>
<!-- PANEL DE SECUENCIA -->
<div class="sequence-panel">
  <h2>⚡ Secuencia Completa</h2>
  <div class="sequence-controls">
    <button class="btn btn-start" id="btn-start-seq" onclick="startSequence()">▶ Iniciar Secuencia</button>
    <button class="btn btn-stop" id="btn-stop-seq" onclick="stopSequence()" disabled>⏹ Detener</button>
    <div class="sequence-progress"><div class="sequence-progress-bar" id="seq-progress"></div></div>
    <span id="seq-status" style="font-size:13px;color:#888">Listo</span>
  </div>
  <div class="sequence-steps" id="seq-steps"></div>
</div>

<div class="grid" id="grid"></div>
<div class="output" id="output">
  <div class="line info">Seleccioná un bot arriba para empezar. El output aparecerá acá.</div>
</div>
<div class="footer">Sale Baile • salebaile.web.app • ©2026 Ingeniería JH</div>
<script>
const BOTS = __BOTS_JSON__;
const SEQUENCE = __SEQUENCE_JSON__;
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

// Secuencia
function renderSteps() {
  const c = document.getElementById('seq-steps');
  c.innerHTML = '';
  SEQUENCE.forEach(step => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.id = 'step-' + step.id;
    chip.innerHTML = '⏳ ' + step.label;
    c.appendChild(chip);
  });
}
renderSteps();

function refreshSequenceUI() {
  fetch('/api/sequence/status').then(r => r.json()).then(state => {
    const bs = document.getElementById('btn-start-seq');
    const bt = document.getElementById('btn-stop-seq');
    const pr = document.getElementById('seq-progress');
    const st = document.getElementById('seq-status');
    if (state.running) { bs.disabled = true; bt.disabled = false; st.textContent = 'Ejecutando...'; st.style.color = '#F9B637'; }
    else { bs.disabled = false; bt.disabled = true; st.textContent = state.finished_at ? 'Finalizado' : 'Listo'; st.style.color = state.finished_at ? '#00C851' : '#888'; }
    const total = SEQUENCE.length;
    const done = state.completed.length;
    const fail = state.failed.length;
    const pct = total > 0 ? Math.round(((done + fail) / total) * 100) : 0;
    pr.style.width = pct + '%';
    SEQUENCE.forEach(step => {
      const chip = document.getElementById('step-' + step.id);
      if (!chip) return;
      chip.className = 'chip';
      if (state.current_step === step.id && state.running) { chip.classList.add('cur'); chip.innerHTML = '⏳ ' + step.label; }
      else if (state.completed.includes(step.id)) { chip.classList.add('done'); chip.innerHTML = '✅ ' + step.label; }
      else if (state.failed.includes(step.id)) { chip.classList.add('fail'); chip.innerHTML = '❌ ' + step.label; }
      else { chip.innerHTML = '⏳ ' + step.label; }
    });
  });
}

function startSequence() { fetch('/api/sequence/start', {method:'POST'}).then(r => r.json()).then(data => { if (data.ok) pollSequence(); }); }
function stopSequence() { fetch('/api/sequence/stop', {method:'POST'}).then(r => r.json()).then(data => { if (data.ok) refreshSequenceUI(); }); }
function pollSequence() { refreshSequenceUI(); if (document.getElementById('btn-stop-seq').disabled === false) { setTimeout(pollSequence, 2000); } else { refreshSequenceUI(); } }
setInterval(function() { fetch('/api/sequence/status').then(r => r.json()).then(state => { if (state.running) refreshSequenceUI(); }); }, 3000);

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
    return template.replace("__BOTS_JSON__", bots_json).replace("__SEQUENCE_JSON__", json.dumps(SEQUENCE))


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

        elif self.path == "/api/sequence/status":
            state = load_sequence_state()
            body = json.dumps(state).encode("utf-8")
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

    def do_POST(self):
        cl = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(cl).decode("utf-8") if cl else "{}"
        if self.path == "/api/sequence/start":
            global _sequence_thread, _sequence_stop_flag
            state = load_sequence_state()
            if state["running"]:
                resp = json.dumps({"ok": False, "error": "Secuencia ya en ejecución"}).encode("utf-8")
                self.send_response(200); self._send_cors_headers()
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp)))
                self.end_headers(); self.wfile.write(resp); return
            _sequence_stop_flag.clear()
            _sequence_thread = threading.Thread(target=execute_sequence, daemon=True)
            _sequence_thread.start()
            resp = json.dumps({"ok": True}).encode("utf-8")
            self.send_response(200); self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers(); self.wfile.write(resp)
        elif self.path == "/api/sequence/stop":
            _sequence_stop_flag.set()
            resp = json.dumps({"ok": True}).encode("utf-8")
            self.send_response(200); self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers(); self.wfile.write(resp)
        else:
            resp = b'{"error": "not found"}'
            self.send_response(404); self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(resp)))
            self.end_headers(); self.wfile.write(resp)

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
