[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [switch]$NoBuild,
    [switch]$Stop,
    [ValidateRange(30, 900)]
    [int]$StartupTimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Docker {
    param([string[]]$Arguments)
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed. Check the message above."
    }
}

try {
    Write-Host "Intelligent IT Support - Windows launcher" -ForegroundColor Cyan
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Install Docker Desktop first: https://docs.docker.com/desktop/setup/install/windows-install/"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "docker-compose.yml"))) {
        throw "Extract the entire project ZIP. Keep this launcher in the project folder."
    }
    try {
        $dockerMode = & docker info --format '{{.OSType}}' 2>$null
        if ($LASTEXITCODE -ne 0) { throw "Docker unavailable" }
    } catch {
        throw "Start Docker Desktop and wait until its engine is running, then try again."
    }
    Invoke-Docker -Arguments @("compose", "version")
    if ($Stop) {
        Invoke-Docker -Arguments @("compose", "down")
        Write-Host "Stopped. Your database and AI model data are kept." -ForegroundColor Green
        exit 0
    }
    if ($dockerMode -ne "linux") {
        throw "Switch Docker Desktop to Linux containers, then try again."
    }
    Write-Host "Starting the app. The first build can take several minutes..." -ForegroundColor Cyan
    if ($NoBuild) {
        Invoke-Docker -Arguments @("compose", "up", "-d", "--no-build")
    } else {
        Invoke-Docker -Arguments @("compose", "up", "-d", "--build")
    }
    Write-Host "Waiting for the API and login page..." -ForegroundColor Cyan
    $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
            $page = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 5
            if ($health.status -eq "ok" -and $page.StatusCode -eq 200) {
                $ready = $true
                break
            }
        } catch {
            # Services may still be applying migrations or starting.
        }
        Start-Sleep -Seconds 3
    }
    if (-not $ready) {
        & docker compose logs --tail 40 backend frontend
        throw "Startup timed out after $StartupTimeoutSeconds seconds. Check the logs above. Use stop-windows.bat to stop the containers."
    }
    Write-Host "App ready: http://localhost:8080" -ForegroundColor Green
    Write-Host "Admin login: admin@example.com / admin123"
    Write-Host "API docs: http://localhost:8000/docs"
    Write-Host "To stop: double-click stop-windows.bat"
    Write-Host "Closing this window leaves the app running."
    if (-not $NoBrowser) {
        try { Start-Process "http://localhost:8080" }
        catch { Write-Warning "Open http://localhost:8080 manually in your browser." }
    }
    exit 0
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
