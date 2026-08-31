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

# 3. Tuneles Cloudflare (usando variables de entorno si están configuradas)
$Tunnel1Token = $env:CLOUDFLARE_TUNNEL_TOKEN_NOVA
$Tunnel2Token = $env:CLOUDFLARE_TUNNEL_TOKEN_BRAVO

if ($Tunnel1Token) {
    Write-Host "3. Iniciando Tunel 1 de Cloudflare (Nova)..." -ForegroundColor Green
    Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot'; .\cloudflared.exe tunnel run --token $Tunnel1Token"
} else {
    Write-Host "3. Aviso: CLOUDFLARE_TUNNEL_TOKEN_NOVA no definido en .env, omitiendo túnel 1." -ForegroundColor DarkYellow
}

if ($Tunnel2Token) {
    Write-Host "4. Iniciando Tunel 2 de Cloudflare (Bravo)..." -ForegroundColor Green
    Start-Process powershell.exe -WorkingDirectory "$ProjectRoot" -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$ProjectRoot'; .\cloudflared.exe tunnel run --token $Tunnel2Token"
} else {
    Write-Host "4. Aviso: CLOUDFLARE_TUNNEL_TOKEN_BRAVO no definido en .env, omitiendo túnel 2." -ForegroundColor DarkYellow
}

Write-Host "Todos los servicios han sido lanzados exitosamente." -ForegroundColor Yellow
