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
if ((Test-Path $VenvPython) -and (Test-Path $VenvUvicorn)) {
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

# 4. Tuneles Cloudflare (obtenidos de forma segura desde .env)
$Tunnel1Token = $env:CLOUDFLARE_TUNNEL_TOKEN_NOVA
$Tunnel2Token = $env:CLOUDFLARE_TUNNEL_TOKEN_BRAVO

$CloudflaredPath = Join-Path $ProjectRoot "cloudflared.exe"
if (Test-Path $CloudflaredPath) {
    # Cerrar instancias previas huérfanas de cloudflared para evitar conflictos y error 1033
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    if ($Tunnel1Token) {
        Write-Host "3. Iniciando Tunel 1 de Cloudflare (Nova)..." -ForegroundColor Green
        $Tunnel1Cmd = "`$host.ui.RawUI.WindowTitle = '[NOVA] Tunel Cloudflare (Nova)'; Set-Location '$ProjectRoot'; & '$CloudflaredPath' tunnel run --token $Tunnel1Token"
        Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$Tunnel1Cmd"
    } else {
        Write-Host "Aviso: CLOUDFLARE_TUNNEL_TOKEN_NOVA no definido en .env. Tunel 1 omitido." -ForegroundColor DarkYellow
    }

    if ($Tunnel2Token) {
        Write-Host "4. Iniciando Tunel 2 de Cloudflare (Bravo)..." -ForegroundColor Green
        $Tunnel2Cmd = "`$host.ui.RawUI.WindowTitle = '[NOVA] Tunel Cloudflare (Bravo)'; Set-Location '$ProjectRoot'; & '$CloudflaredPath' tunnel run --token $Tunnel2Token"
        Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$Tunnel2Cmd"
    } else {
        Write-Host "Aviso: CLOUDFLARE_TUNNEL_TOKEN_BRAVO no definido en .env. Tunel 2 omitido." -ForegroundColor DarkYellow
    }
} else {
    Write-Host "Aviso: cloudflared.exe no encontrado en la raiz del proyecto." -ForegroundColor DarkYellow
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Todos los servicios han sido lanzados exitosamente.  " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
