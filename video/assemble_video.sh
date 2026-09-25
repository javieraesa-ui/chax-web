#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_MP4="$DIR/chax_explainer_16x9.mp4"
AUDIO_INPUT="${1:-$DIR/podcast.mp3}"

echo "================================================="
echo "🎬 Chax 16:9 Video Assembler (ffmpeg)"
echo "================================================="

# Verificar si las escenas PNG existen, si no, generarlas
if [ ! -f "$DIR/scene_01_hero.png" ]; then
  echo "⚠️ Escenas no encontradas. Generando imágenes con export_scenes.sh..."
  "$DIR/export_scenes.sh"
fi

# Comprobar si existe audio
if [ ! -f "$AUDIO_INPUT" ]; then
  echo "ℹ️ No se encontró archivo de audio en: $AUDIO_INPUT"
  echo "➡️ Si descargaste el podcast de NotebookLM, nómbralo 'podcast.mp3' y colócalo en 'docs/video/'."
  echo "➡️ Generando versión de video preliminar silenciosa con transiciones fluidas..."
  
  # Generar video a partir de las 7 escenas (cada una 10 segundos para demo de 70s si no hay audio)
  ffmpeg -y \
    -loop 1 -t 10 -i "$DIR/scene_01_hero.png" \
    -loop 1 -t 10 -i "$DIR/scene_02_mapax.png" \
    -loop 1 -t 10 -i "$DIR/scene_03_ptt_identidad.png" \
    -loop 1 -t 10 -i "$DIR/scene_04_fisica_mesh.png" \
    -loop 1 -t 10 -i "$DIR/scene_05_escenarios.png" \
    -loop 1 -t 10 -i "$DIR/scene_06_comparativa.png" \
    -loop 1 -t 10 -i "$DIR/scene_07_urgencia_testflight.png" \
    -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=9[v01]; \
                     [v01][2:v]xfade=transition=fade:duration=1:offset=18[v02]; \
                     [v02][3:v]xfade=transition=fade:duration=1:offset=27[v03]; \
                     [v03][4:v]xfade=transition=fade:duration=1:offset=36[v04]; \
                     [v04][5:v]xfade=transition=fade:duration=1:offset=45[v05]; \
                     [v05][6:v]xfade=transition=fade:duration=1:offset=54[outv]" \
    -map "[outv]" \
    -c:v libx264 -pix_fmt yuv420p -r 30 "$OUTPUT_MP4"

  echo "🎉 ¡Video preliminar generado con éxito en: $OUTPUT_MP4!"
  echo "Para agregar el audio de NotebookLM ejecuta:"
  echo "  ./docs/video/assemble_video.sh docs/video/podcast.mp3"
  exit 0
fi

# Si se proporcionó audio, obtener duración con ffprobe
AUDIO_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_INPUT")
echo "🔊 Audio detectado: $AUDIO_INPUT (Duración: ${AUDIO_DURATION}s)"

# Calcular duración proporcional por escena (7 escenas, 6 transiciones xfade de 1s)
SCENE_DUR=$(python3 -c "print(round(($AUDIO_DURATION + 6) / 7.0, 2))")
echo "⏱️ Duración asignada por escena: ${SCENE_DUR}s"

OFF1=$(python3 -c "print(round($SCENE_DUR - 1, 2))")
OFF2=$(python3 -c "print(round($OFF1 + $SCENE_DUR - 1, 2))")
OFF3=$(python3 -c "print(round($OFF2 + $SCENE_DUR - 1, 2))")
OFF4=$(python3 -c "print(round($OFF3 + $SCENE_DUR - 1, 2))")
OFF5=$(python3 -c "print(round($OFF4 + $SCENE_DUR - 1, 2))")
OFF6=$(python3 -c "print(round($OFF5 + $SCENE_DUR - 1, 2))")

echo "🎬 Ensamblando video completo sincronizado con audio..."

ffmpeg -y \
  -loop 1 -t "$SCENE_DUR" -i "$DIR/scene_01_hero.png" \
  -loop 1 -t "$SCENE_DUR" -i "$DIR/scene_02_mapax.png" \
  -loop 1 -t "$SCENE_DUR" -i "$DIR/scene_03_ptt_identidad.png" \
  -loop 1 -t "$SCENE_DUR" -i "$DIR/scene_04_fisica_mesh.png" \
  -loop 1 -t "$SCENE_DUR" -i "$DIR/scene_05_escenarios.png" \
  -loop 1 -t "$SCENE_DUR" -i "$DIR/scene_06_comparativa.png" \
  -loop 1 -t "$SCENE_DUR" -i "$DIR/scene_07_urgencia_testflight.png" \
  -i "$AUDIO_INPUT" \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=$OFF1[v01]; \
                   [v01][2:v]xfade=transition=fade:duration=1:offset=$OFF2[v02]; \
                   [v02][3:v]xfade=transition=fade:duration=1:offset=$OFF3[v03]; \
                   [v03][4:v]xfade=transition=fade:duration=1:offset=$OFF4[v04]; \
                   [v04][5:v]xfade=transition=fade:duration=1:offset=$OFF5[v05]; \
                   [v05][6:v]xfade=transition=fade:duration=1:offset=$OFF6[outv]" \
  -map "[outv]" -map 7:a \
  -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -shortest "$OUTPUT_MP4"

echo "🎉 ¡VIDEO FINAL GENERADO EXITOSAMENTE!"
echo "📁 Archivo de salida: $OUTPUT_MP4"
