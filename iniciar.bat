@echo off
title Iniciando NovaGlobal y Tuneles Cloudflare
cd /d "%~dp0"
echo ========================================================
echo   Iniciando Backend, Frontend y Tuneles Cloudflare...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
