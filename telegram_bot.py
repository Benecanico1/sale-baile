#!/usr/bin/env python3
import os, json, urllib.request, urllib.error, time

env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_file):
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ[key.strip()] = value.strip().strip("'").strip('"')

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
DASHBOARD = os.environ.get("DASHBOARD_URL", "http://localhost:8585")
OFFSET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tg_offset.txt")

def load_offset():
    try:
        with open(OFFSET_FILE, "r") as f:
            return int(f.read().strip())
    except:
        return 0

def save_offset(offset):
    with open(OFFSET_FILE, "w") as f:
        f.write(str(offset))

def api(method, **kwargs):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    data = json.dumps(kwargs).encode() if kwargs else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"ok": False, "error": str(e)}

def send(chat_id, text):
    return api("sendMessage", chat_id=chat_id, text=text, parse_mode="HTML")

def get_status():
    try:
        req = urllib.request.Request(f"{DASHBOARD}/api/sequence/status")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def seq_start():
    try:
        req = urllib.request.Request(f"{DASHBOARD}/api/sequence/start", data=b"", method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def seq_stop():
    try:
        req = urllib.request.Request(f"{DASHBOARD}/api/sequence/stop", data=b"", method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e)}

def main():
    if not TOKEN:
        print("ERROR: TELEGRAM_BOT_TOKEN no definida")
        return
    print(f"Bot iniciado. Token: {TOKEN[:10]}... Escuchando...")
    offset = load_offset()
    while True:
        try:
            resp = api("getUpdates", offset=offset, timeout=30)
            if not resp.get("ok"):
                time.sleep(5)
                continue
            for update in resp.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message")
                if not msg or not msg.get("text"):
                    continue
                chat_id = msg["chat"]["id"]
                text = msg["text"].strip()
                if text in ("/iniciar", "inicio"):
                    seq_start()
                    send(chat_id, "Inicie la secuencia. Usá /estado para ver progreso.")
                elif text in ("/detener", "parar"):
                    seq_stop()
                    send(chat_id, "Detuve la secuencia.")
                elif text in ("/estado", "estado"):
                    s = get_status()
                    if s.get("running"):
                        done = len(s.get("completed", []))
                        step = s.get("current_step", "?")
                        send(chat_id, f"Corriendo: {step} | Listos: {done}")
                    elif s.get("finished_at"):
                        done = len(s.get("completed", []))
                        send(chat_id, f"Secuencia terminada: {done}/10 bots")
                    else:
                        send(chat_id, "Sin ejecucion activa.")
                elif text in ("/help", "ayuda"):
                    send(chat_id, "Comandos: /iniciar /detener /estado /help")
                else:
                    send(chat_id, "Comando no reconocido. Usá /help")
            save_offset(offset)
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()