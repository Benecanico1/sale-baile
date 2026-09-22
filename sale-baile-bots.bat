@echo off
chcp 65001 >nul 2>&1
title Sale Baile - Panel de Control de Bots
color 0F

:MENU
cls
echo.
echo  ================================================================
echo                    SALE BAILE - PANEL DE BOTS
echo  ================================================================
echo.
echo   1.  Radar         - Scrapear Instagram y publicar eventos
echo   2.  Cazador        - Buscar organizadores nuevos por hashtags
echo   3.  Outreach       - Generar DMs (sin enviar)
echo   4.  Outreach SEND  - Enviar DMs reales por Instagram
echo   5.  Reportes       - Reportes semanales con metricas
echo   6.  Auto-Deteccion - Detectar flyers nuevos y crear borradores
echo   7.  Contenido      - Generar posts de redes sociales
echo   8.  Estratega      - Analizar mercado y competencia
echo   9.  Investigador   - Buscar tecnologias nuevas
echo  10.  Revisor         - Revisar codigo del proyecto
echo  11.  WhatsApp        - Iniciar bot de WhatsApp (necesita Flask)
echo  12.  Dashboard Web   - Abrir panel visual en el navegador
echo.
echo   0.  Salir
echo.
echo  ================================================================
set /p op="Elegi una opcion (0-12): "

if "%op%"=="0" goto EXIT
if "%op%"=="1" goto RADAR
if "%op%"=="2" goto CAZADOR
if "%op%"=="3" goto OUTREACH
if "%op%"=="4" goto OUTREACH_SEND
if "%op%"=="5" goto REPORTES
if "%op%"=="6" goto AUTODETECCION
if "%op%"=="7" goto CONTENIDO
if "%op%"=="8" goto ESTRATEGA
if "%op%"=="9" goto INVESTIGADOR
if "%op%"=="10" goto REVISOR
if "%op%"=="11" goto WHATSAPP
if "%op%"=="12" goto DASHBOARD
goto MENU

:RADAR
cls
echo  --- RADAR: Scrapear Instagram y publicar eventos ---
echo.
python scripts/agente_radar.py
echo.
pause
goto MENU

:CAZADOR
cls
echo  --- CAZADOR: Buscar organizadores nuevos ---
echo.
python scripts/agente_cazador.py
echo.
pause
goto MENU

:OUTREACH
cls
echo  --- OUTREACH: Generar DMs (sin enviar) ---
echo.
python scripts/agente_outreach.py
echo.
pause
goto MENU

:OUTREACH_SEND
cls
echo  --- OUTREACH: Enviar DMs reales por Instagram ---
echo  ATENCION: Esto enviara mensajes reales a los organizadores.
echo  Los DMs se enviaran por Instagram usando Apify.
echo.
set /p confirm="Seguro que queres enviar? (s/N): "
if /i "%confirm%"=="s" (
    python scripts/agente_outreach.py --send
) else (
    echo  Operacion cancelada.
)
echo.
pause
goto MENU

:REPORTES
cls
echo  --- REPORTES: Reportes semanales ---
echo.
python scripts/agente_reportes.py
echo.
pause
goto MENU

:AUTODETECCION
cls
echo  --- AUTO-DETECCION: Detectar flyers nuevos ---
echo.
python scripts/agente_autodeteccion.py
echo.
pause
goto MENU

:CONTENIDO
cls
echo  --- CONTENIDO: Generar posts de redes ---
echo.
echo  Tipos disponibles:
echo   1. Todos (redes + descripcion + campana)
echo   2. Solo redes (posts de Instagram)
echo   3. Solo descripcion
echo   4. Solo campana de marketing
echo.
set /p ct="Elegi tipo (1-4, default 1): "
if "%ct%"=="2" python scripts/agente_contenido.py redes
if "%ct%"=="3" python scripts/agente_contenido.py descripcion
if "%ct%"=="4" python scripts/agente_contenido.py campana
if "%ct%"=="1" python scripts/agente_contenido.py
if "%ct%"=="" python scripts/agente_contenido.py
echo.
pause
goto MENU

:ESTRATEGA
cls
echo  --- ESTRATEGA: Analizar mercado ---
echo.
echo  Tipos: 1.competencia  2.mercado  3.oportunidades  4.todos
echo.
set /p st="Elegi tipo (1-4, default 4): "
if "%st%"=="1" python scripts/agente_estratega.py competencia
if "%st%"=="2" python scripts/agente_estratega.py mercado
if "%st%"=="3" python scripts/agente_estratega.py oportunidades
if "%st%"=="4" python scripts/agente_estratega.py
if "%st%"=="" python scripts/agente_estratega.py
echo.
pause
goto MENU

:INVESTIGADOR
cls
echo  --- INVESTIGADOR: Buscar tecnologias ---
echo.
echo  Temas: 1.ia  2.web  3.mobile  4.firebase  5.todos
echo.
set /p it="Elegi tema (1-5, default 5): "
if "%it%"=="1" python scripts/agente_investigador.py ia
if "%it%"=="2" python scripts/agente_investigador.py web
if "%it%"=="3" python scripts/agente_investigador.py mobile
if "%it%"=="4" python scripts/agente_investigador.py firebase
if "%it%"=="5" python scripts/agente_investigador.py
if "%it%"=="" python scripts/agente_investigador.py
echo.
pause
goto MENU

:REVISOR
cls
echo  --- REVISOR: Revisar codigo ---
echo.
echo  Proyectos: 1.sale-baile  2.quinela-master-pro  3.todos
echo.
set /p rv="Elegi proyecto (1-3, default 1): "
if "%rv%"=="2" python scripts/agente_revisor.py quinela-master-pro
if "%rv%"=="3" python scripts/agente_revisor.py todos
if "%rv%"=="1" python scripts/agente_revisor.py sale-baile
if "%rv%"=="" python scripts/agente_revisor.py sale-baile
echo.
pause
goto MENU

:WHATSAPP
cls
echo  --- WHATSAPP: Bot de WhatsApp ---
echo  ATENCION: Necesitas Flask instalado y las variables de Meta Business.
echo  Si no tenes Flask: pip install flask
echo.
set /p confirm="Iniciar el bot de WhatsApp? (s/N): "
if /i "%confirm%"=="s" (
    python scripts/agente_whatsapp.py
) else (
    echo  Operacion cancelada.
)
echo.
pause
goto MENU

:DASHBOARD
cls
echo  --- DASHBOARD WEB: Panel visual ---
echo  Abriendo el dashboard en tu navegador...
echo  Cierra esta ventana cuando termines.
echo.
python scripts/dashboard.py
pause
goto MENU

:EXIT
cls
echo.
echo  Gracias por usar Sale Baile! Baila, no te quedes quieto.
echo.
timeout /t 3 >nul
exit
