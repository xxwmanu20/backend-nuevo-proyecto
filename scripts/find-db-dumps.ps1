<#
Find-db-dumps.ps1
Busca archivos de dump/backups en un path local y exporta un CSV con los resultados.
Usage: .\find-db-dumps.ps1 -Path C:\Users\xxwma -MinSizeMB 0 -Days 365 -ExportPath C:\Temp\find_db_dumps.csv
#>

param(
    [string]$Path = "$env:USERPROFILE",
    [int]$MinSizeMB = 0,
    [int]$Days = 365,
    [string]$ExportPath = "$env:TEMP\db-dump-search-results.csv",
    [switch]$VerboseMode
)

if ($VerboseMode) { Write-Host "Scanning path: $Path" }

$minSizeBytes = $MinSizeMB * 1MB

# Pattern: extensions and words in filename
$pattern = '(?i)db[_-]?dump|dump|backup|\.(bak|dump|sql|gz|tgz|zip)$'

Try {
    $items = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            ($_.Length -ge $minSizeBytes) -and
            ($_.LastWriteTime -ge (Get-Date).AddDays(-$Days)) -and
            ($_.Name -match $pattern)
        } |
        Select-Object FullName, Name, Length, @{Name='MB';Expression={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime

    if ($items -and $items.Count -gt 0) {
        $items | Sort-Object LastWriteTime -Descending | Export-Csv -Path $ExportPath -NoTypeInformation -Encoding UTF8
        Write-Host "FOUND:$($items.Count) results. CSV: $ExportPath"
        $items | Format-Table -AutoSize
    }
    else {
        Write-Host "FOUND_NONE"
    }
}
Catch {
    Write-Error "Error scanning files: $_"
}

Exit 0
