$ProjectRoot = $PSScriptRoot

Write-Host "Iniciando Backend (FastAPI)..."
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-NoExit", "-Command", "cd nova\backend; .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "Iniciando Frontend (Vite)..."
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-NoExit", "-Command", "cd nova\frontend; npm run dev"

Write-Host "Iniciando Tunel 1 de Cloudflare..."
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-NoExit", "-Command", ".\cloudflared.exe tunnel run --token eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiODU1YWMwOTAtNTkwZi00YTFhLWE1ODgtYjExZDY2OTY0MTIwIiwicyI6Ik9UWTFZVGRqWkRJdFpUazNZeTAwTURnM0xXSTNaR1V0TlRreVpERXpNREEyTURReiJ9"

Write-Host "Iniciando Tunel 2 de Cloudflare (Bravo)..."
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-NoExit", "-Command", ".\cloudflared.exe tunnel run --token eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiMTJlYWRkYzgtMzBhNy00YjIwLTkwMTEtYmM3ZmE3NDQ0YjNjIiwicyI6Ik4ySTFZMlZpTVdNdE16TTFOeTAwWmpnM0xXSmhOVEV0WkRSbU1UTmhOVGMwT0RSaVlqSTFZbVF3WmpZdFlXTTRNeTAwWlROaUxUZzBZVEl0WWpkbU9EUTFOMlZtTnpneCJ9"


