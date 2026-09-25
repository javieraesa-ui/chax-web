#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

echo "=== Exportando Escenas de Chax en 1080p (1920x1080) ==="

SCENE_NAMES=(
  "scene_01_hero"
  "scene_02_mapax"
  "scene_03_ptt_identidad"
  "scene_04_fisica_mesh"
  "scene_05_escenarios"
  "scene_06_comparativa"
  "scene_07_urgencia_testflight"
)

for i in "${!SCENE_NAMES[@]}"; do
  NAME="${SCENE_NAMES[$i]}"
  OUT="$DIR/${NAME}.png"
  echo "📸 Generando [$((i+1))/7]: ${NAME}.png ..."
  "$CHROME" --headless --disable-gpu --window-size=1920,1080 --screenshot="$OUT" "file://$DIR/presentation_16x9.html?scene=$i" 2>/dev/null
done

echo "✅ Todas las escenas fueron exportadas exitosamente en: $DIR"
