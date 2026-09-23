
SALE BAILE — Estado final verificado (f6bac6b -> e5d0196 -> 66c9783 -> efb6e21 -> 879bc46 -> f5fa876 -> 6849277 -> c9dfe8b)
- VPS: Oracle Linux 9.8, SSH opc@129.146.75.135:22, key vps-oracle.key
- Dashboard: systemd active en puerto 8585, CORS habilitado, HTTPS con nginx + LetsEncrypt (salebaile.duckdns.org)
- Cron: cazador 3AM, radar 6AM, autodeteccion 6h, reportes lunes 9AM
- Bots: 10 (radar, cazador, outreach+send, reportes, autodeteccion, contenido, estratega, investigador, revisor, whatsapp)
- Firebase: leads(39), events(3), weekly_reports(2), auto_drafts(0)
- Admin: panel rediseñado minimalista (zinc/slate), tabs con underline
- BotsPanel: fila horizontal + boton Cancelar + Copiar DM + trazabilidad
- BotResults: leads con DM visible + estado (enviado/generado/fallo) + fecha
- DM Instagram: BLOQUEADO REAL (Apify instagram-scraper no envía mensajes, solo lee datos). Mensaje actualizado en admin.
- .env.instagram: creado para cookies/session de @salebaile (excluido de .gitignore)
- .gitignore actualizado: .env.instagram, .env.whatsapp, .env
- INSTAGRAM_SETUP.md creado con instrucciones paso a paso
- @salebaile conectada como cuenta oficial en radar.py y contenido.py
- COMMIT FINAL: 66c9783 (deployado a Firebase)
- PENDIENTE: configurar cookies/session en .env.instagram para que los bots funcionen como profesional (usuario confirmó tener acceso a la cuenta @salebaile)
