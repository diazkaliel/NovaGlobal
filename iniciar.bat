@echo off
title Iniciando NovaGlobal y Tuneles Cloudflare
echo ========================================================
echo   Iniciando Backend, Frontend y Tuneles Cloudflare...
echo ========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
