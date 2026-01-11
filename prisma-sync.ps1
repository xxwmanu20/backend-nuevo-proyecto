# ==========================================
# prisma-sync.ps1
# ==========================================

# 1️⃣ Mensaje inicial
Write-Host "Iniciando sincronización de Prisma..." -ForegroundColor Cyan

# 2️⃣ Cargar variables de entorno desde .env
Write-Host "Cargando .env..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -match "=") {
            $parts = $_ -split "=", 2
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
} else {
    Write-Host "No se encontró el archivo .env" -ForegroundColor Red
    exit 1
}

# 3️⃣ Aplicar migración
Write-Host "Ejecutando migración: npx prisma migrate dev --name init" -ForegroundColor Yellow
npx prisma migrate dev --name init

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al aplicar la migración." -ForegroundColor Red
    exit 1
}

# 4️⃣ Generar Prisma Client
Write-Host "Generando Prisma Client: npx prisma generate" -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al generar Prisma Client." -ForegroundColor Red
    exit 1
}

# 5️⃣ Abrir Prisma Studio (opcional)
Write-Host "Abriendo Prisma Studio..." -ForegroundColor Yellow
Start-Process "npx" -ArgumentList "prisma studio"

# 6️⃣ Mensaje final
Write-Host "Prisma sincronizado con éxito." -ForegroundColor Green
