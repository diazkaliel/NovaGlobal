$ProjectRoot = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Iniciando Backend, Frontend y Tuneles Cloudflare...  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "1. Iniciando Backend (FastAPI)..." -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot\nova\backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "2. Iniciando Frontend (Vite)..." -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot\nova\frontend'; npm run dev"

Write-Host "3. Iniciando Tunel 1 de Cloudflare..." -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot'; .\cloudflared.exe tunnel run --token eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiODU1YWMwOTAtNTkwZi00YTFhLWE1ODgtYjExZDY2OTY0MTIwIiwicyI6Ik9UWTFZVGRqWkRJdFpUazNZeTAwTURnM0xXSTNaR1V0TlRreVpERXpNREEyTURReiJ9"

Write-Host "4. Iniciando Tunel 2 de Cloudflare (Bravo)..." -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot'; .\cloudflared.exe tunnel run --token eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiMTJlYWRkYzgtMzBhNy00YjIwLTkwMTEtYmM3ZmE3NDQ0YjNjIiwicyI6Ik4ySTFZMlZpTVdNdE16TTFOeTAwWmpnM0xXSmhOVEV0WkRSbU1UTmhOVGMwT0RSaVlqSTFZbVF3WmpZdFlXTTRNeTAwWlROaUxUZzBZVEl0WWpkbU9EUTFOMlZtTnpneCJ9"

Write-Host "Todos los servicios han sido lanzados exitosamente." -ForegroundColor Yellow


