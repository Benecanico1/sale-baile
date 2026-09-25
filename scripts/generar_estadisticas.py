#!/usr/bin/env python3
"""Genera reporte de estadísticas para el widget de bots."""
import json, os
from datetime import datetime

# Ejemplo simulado con los datos que produciría agente_outreach
reporte = {
    "fecha": datetime.now().strftime("%Y-%m-%d %H:%M"),
    "leads_nuevos": 28,
    "mensajes_creados": 27,
    "enviados": 24,
    "fallidos": 3,
    "saltados_por_dedup": 1,
    "mensaje_fallback_usado": 2
}
with open("reporte_outreach.json", "w") as f:
    json.dump(reporte, f, indent=2)
print("reporte_outreach.json generado")
