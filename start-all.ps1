$ProjectRoot = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Iniciando Backend, Frontend y Tuneles Cloudflare...  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Cargar variables de entorno si existen en nova/backend/.env
$EnvFile = Join-Path $ProjectRoot "nova\backend\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

# 2. Detectar entorno de Python (preferir .venv local del backend)
$BackendDir = Join-Path $ProjectRoot "nova\backend"
$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$VenvUvicorn = Join-Path $BackendDir ".venv\Scripts\uvicorn.exe"

$BackendCommand = ""
if (Test-Path $VenvPython) {
    $BackendCommand = "`$host.ui.RawUI.WindowTitle = '[NOVA] Backend FastAPI (Puerto 8000)'; Set-Location '$BackendDir'; & '$VenvPython' -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $BackendCommand = "`$host.ui.RawUI.WindowTitle = '[NOVA] Backend FastAPI (Puerto 8000)'; Set-Location '$BackendDir'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $BackendCommand = "`$host.ui.RawUI.WindowTitle = '[NOVA] Backend FastAPI (Puerto 8000)'; Set-Location '$BackendDir'; py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
} else {
    Write-Host "ADVERTENCIA: No se encontró Python ni el entorno .venv en nova\backend" -ForegroundColor Red
    $BackendCommand = "`$host.ui.RawUI.WindowTitle = '[NOVA] Backend FastAPI'; Set-Location '$BackendDir'; Write-Host 'Error: Python no encontrado.' -ForegroundColor Red; Read-Host 'Presiona Enter para cerrar...'"
}

# Iniciar Backend
Write-Host "1. Iniciando Backend (FastAPI en puerto 8000)..." -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory "$BackendDir" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$BackendCommand"

# 3. Iniciar Frontend
$FrontendDir = Join-Path $ProjectRoot "nova\frontend"
Write-Host "2. Iniciando Frontend (Vite)..." -ForegroundColor Green
$FrontendCommand = "`$host.ui.RawUI.WindowTitle = '[NOVA] Frontend Vite (Puerto 5173)'; Set-Location '$FrontendDir'; if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { npm.cmd run dev } else { npm run dev }"
Start-Process powershell.exe -WorkingDirectory "$FrontendDir" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$FrontendCommand"

# 4. Tuneles Cloudflare (con tokens de respaldo por defecto)
$DefaultTokenNova = "eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiODU1YWMwOTAtNTkwZi00YTFhLWE1ODgtYjExZDY2OTY0MTIwIiwicyI6Ik9UWTFZVGRqWkRJdFpUazNZeTAwTURnM0xXSTNaR1V0TlRreVpERXpNREEyTURReiJ9"
$DefaultTokenBravo = "eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiMTJlYWRkYzgtMzBhNy00YjIwLTkwMTEtYmM3ZmE3NDQ0YjNjIiwicyI6Ik4ySTFZMlZpTVdNdE16TTFOeTAwWmpnM0xXSmhOVEV0WkRSbU1UTmhOVGMwT0RSaVlqSTFZbVF3WmpZdFlXTTRNeTAwWlROaUxUZzBZVEl0WWpkbU9EUTFOMlZtTnpneCJ9"

$Tunnel1Token = if ($env:CLOUDFLARE_TUNNEL_TOKEN_NOVA) { $env:CLOUDFLARE_TUNNEL_TOKEN_NOVA } else { $DefaultTokenNova }
$Tunnel2Token = if ($env:CLOUDFLARE_TUNNEL_TOKEN_BRAVO) { $env:CLOUDFLARE_TUNNEL_TOKEN_BRAVO } else { $DefaultTokenBravo }

$CloudflaredPath = Join-Path $ProjectRoot "cloudflared.exe"
if (Test-Path $CloudflaredPath) {
    # Cerrar instancias previas huérfanas de cloudflared para evitar conflictos y error 1033
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    Write-Host "3. Iniciando Tunel 1 de Cloudflare (Nova)..." -ForegroundColor Green
    $Tunnel1Cmd = "`$host.ui.RawUI.WindowTitle = '[NOVA] Tunel Cloudflare (Nova)'; Set-Location '$ProjectRoot'; & '$CloudflaredPath' tunnel run --token $Tunnel1Token"
    Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$Tunnel1Cmd"

    Write-Host "4. Iniciando Tunel 2 de Cloudflare (Bravo)..." -ForegroundColor Green
    $Tunnel2Cmd = "`$host.ui.RawUI.WindowTitle = '[NOVA] Tunel Cloudflare (Bravo)'; Set-Location '$ProjectRoot'; & '$CloudflaredPath' tunnel run --token $Tunnel2Token"
    Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$Tunnel2Cmd"
} else {
    Write-Host "Aviso: cloudflared.exe no encontrado en la raiz del proyecto." -ForegroundColor DarkYellow
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Todos los servicios han sido lanzados exitosamente.  " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
