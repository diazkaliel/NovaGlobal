$ProjectRoot = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Iniciando Backend, Frontend y Tuneles Cloudflare...  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Definir rutas del sistema para NodeJS y Python
$PythonDir = "C:\Users\Kalielsinho\AppData\Local\Python\pythoncore-3.14-64"
$NodeDir = "C:\Program Files\nodejs"
$CommonPath = "$NodeDir;$PythonDir;$PythonDir\Scripts;"

# Cargar variables de entorno si existen en nova/backend/.env
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

# 1. Backend FastAPI
Write-Host "1. Iniciando Backend (FastAPI)..." -ForegroundColor Green
$BackendCmd = "`$env:Path = '$CommonPath' + `$env:Path; Set-Location '$ProjectRoot\nova\backend'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$BackendCmd"

# 2. Frontend Vite
Write-Host "2. Iniciando Frontend (Vite)..." -ForegroundColor Green
$FrontendCmd = "`$env:Path = '$CommonPath' + `$env:Path; Set-Location '$ProjectRoot\nova\frontend'; npm run dev"
Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "$FrontendCmd"

# 3. Tuneles Cloudflare (con tokens de respaldo por defecto)
$DefaultTokenNova = "eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiODU1YWMwOTAtNTkwZi00YTFhLWE1ODgtYjExZDY2OTY0MTIwIiwicyI6Ik9UWTFZVGRqWkRJdFpUazNZeTAwTURnM0xXSTNaR1V0TlRreVpERXpNREEyTURReiJ9"
$DefaultTokenBravo = "eyJhIjoiYzE5ODY2ZmNiZTRhMDZiOTc1ZjZjMGM2YjA1YWEzYjIiLCJ0IjoiMTJlYWRkYzgtMzBhNy00YjIwLTkwMTEtYmM3ZmE3NDQ0YjNjIiwicyI6Ik4ySTFZMlZpTVdNdE16TTFOeTAwWmpnM0xXSmhOVEV0WkRSbU1UTmhOVGMwT0RSaVlqSTFZbVF3WmpZdFlXTTRNeTAwWlROaUxUZzBZVEl0WWpkbU9EUTFOMlZtTnpneCJ9"

$Tunnel1Token = if ($env:CLOUDFLARE_TUNNEL_TOKEN_NOVA) { $env:CLOUDFLARE_TUNNEL_TOKEN_NOVA } else { $DefaultTokenNova }
$Tunnel2Token = if ($env:CLOUDFLARE_TUNNEL_TOKEN_BRAVO) { $env:CLOUDFLARE_TUNNEL_TOKEN_BRAVO } else { $DefaultTokenBravo }

if (Test-Path (Join-Path $ProjectRoot "cloudflared.exe")) {
    Write-Host "3. Iniciando Tunel 1 de Cloudflare (Nova)..." -ForegroundColor Green
    Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot'; .\cloudflared.exe tunnel run --token $Tunnel1Token"

    Write-Host "4. Iniciando Tunel 2 de Cloudflare (Bravo)..." -ForegroundColor Green
    Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot'; .\cloudflared.exe tunnel run --token $Tunnel2Token"
} else {
    Write-Host "Aviso: cloudflared.exe no encontrado en la raiz del proyecto." -ForegroundColor DarkYellow
}

Write-Host "Todos los servicios han sido lanzados exitosamente." -ForegroundColor Yellow
