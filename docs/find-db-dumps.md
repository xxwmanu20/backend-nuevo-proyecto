# Encontrar archivos dump / backups localmente

Este documento describe cómo usar `scripts/find-db-dumps.ps1` para localizar archivos de respaldo y dumps en tu máquina local (ej.: `.bak, .dump, .sql.gz, .tgz`).

## Uso básico

Ejecuta desde PowerShell:

```powershell
# Escanear carpeta del usuario para archivos recientes, >0MB y exportar a CSV
.\scripts\find-db-dumps.ps1 -Path $env:USERPROFILE -MinSizeMB 0 -Days 365 -ExportPath "$env:TEMP\db-dump-search-results.csv"
```

## Recomendaciones
- Evita versionar en git archivos de dump o backups.
- Añade `*.bak` y `*.dump` a `.gitignore` (ya incluido en este repo).
- Si encuentras dumps comprometidos en el historial, usa BFG o `git filter-repo` y rota secretos si es necesario.
- No ignores `*.sql` globalmente: las migraciones de Prisma usan `.sql` y son necesarias para el proyecto.

## Scripts de repo
- `scripts/check-repo-dumps.sh`: script de comprobación para ejecutar en CI o local para validar que no hay archivos dump versionados.
- `.github/workflows/check-dumps.yml`: workflow que ejecutará la comprobación en PRs/pushes.
