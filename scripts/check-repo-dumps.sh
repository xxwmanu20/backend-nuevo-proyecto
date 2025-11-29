#!/usr/bin/env bash
set -euo pipefail

# check-repo-dumps.sh
# Busca en archivos versionados en git patrones de dump/backups y devuelve error (exit non-zero) si encuentra coincidencias

PATTERN='(\.bak$|\.dump$|db[_-]?dump|dump|backup)'

echo "Scanning tracked files for backup/dump patterns..."
found=$(git ls-files | grep -E -i "$PATTERN" || true)
if [[ -n "${found}" ]]; then
  echo "ERROR: Tracked files matching dump/backup patterns were found:" >&2
  echo "$found" >&2
  exit 1
fi

echo "No tracked dump/backup files found in the repository."

# Optional: detect large files in HEAD (tune size threshold, e.g., 10MB)
THRESHOLD_BYTES=$((10 * 1024 * 1024))
echo "Checking for large files (>10 MiB) in HEAD..."
git ls-tree -r -l HEAD | awk -v threshold=${THRESHOLD_BYTES} '($4 ~ /\./) { if ($4 ~ /[0-9]+/) { size=$4 } else { size=$3 } if (size >= threshold) { print }}' | while read -r line; do
  echo "Large file detected in HEAD: $line" >&2
  exit 2
done

echo "No large files detected." 
exit 0
