# Cómo conectar @salebaile (Instagram profesional) con Apify

Este archivo explica cómo configurar las cookies de Instagram para que los bots de Sale Baile puedan leer datos y enviar DMs desde la cuenta oficial.

## Paso 1: Obtener cookies de Instagram

1. Entrá a instagram.com con tu cuenta `@salebaile` en Chrome/Firefox
2. Abre las Herramientas de Desarrollo (F12) → pestaña "Application" (o "Storage")
3. Buscá "Cookies" → seleccioná instagram.com
4. Copiá estas cookies:
   - `sessionid`
   - `csrftoken`
   - `ds_user_id`

## Paso 2: Configurar en .env.instagram

Editá el archivo `.env.instagram` (en esta carpeta) con:

```
INSTAGRAM_SESSION_ID=tu_sessionid_aqui
INSTAGRAM_SESSION_DATA=tu_session_data_completo
INSTAGRAM_USERNAME=salebaile
```

⚠️ **NUNCA** subas `.env.instagram` a GitHub. El archivo `.gitignore` ya lo excluye.

## Paso 3: Actualizar los scripts

Una vez configurado `.env.instagram`, los siguientes scripts leerán las cookies automáticamente:

- `scripts/agente_radar.py` — scanea `@salebaile` y publica eventos
- `scripts/agente_cazador.py` — busca organizadores nuevos
- `scripts/agente_autodeteccion.py` — detecta flyers nuevos
- `scripts/agente_outreach.py` — envía DMs desde `@salebaile` (una vez que las cookies funcionen)

## Estado actual

- ✅ `agente_radar.py`: `@salebaile` agregada a `MONITORED_ACCOUNTS`
- ✅ `agente_contenido.py`: `@salebaile` como cuenta oficial
- ❌ Envío real de DMs: bloqueado (Apify `instagram-scraper` no acepta `resultsType: "messages"`)
- 🔧 Solución pendiente: configurar cookies y probar con `python scripts/agente_outreach.py --send`
