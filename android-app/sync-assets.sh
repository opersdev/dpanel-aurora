#!/usr/bin/env bash
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DST="$SRC/android/app/src/main/assets"
cp -f "$SRC/index.html" "$SRC/manifest.webmanifest" "$SRC/sw.js" "$DST/"
cp -rf "$SRC/css" "$SRC/js" "$SRC/icons" "$DST/"
echo "Assets synced to $DST"
