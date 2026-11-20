#!/usr/bin/env bash
# 将 ui-source/ 前端源码同步进安卓 WebView assets（对应根目录 sync-ui.sh 的安卓版）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/ui-source"
DST="$(cd "$(dirname "$0")" && pwd)/app/src/main/assets"

mkdir -p "$DST"
rm -rf "$DST/css" "$DST/js" "$DST/icons"
cp -r "$SRC/css" "$SRC/js" "$SRC/icons" "$DST/"
cp "$SRC/index.html" "$SRC/manifest.webmanifest" "$SRC/sw.js" "$DST/"

echo "UI synced to $DST"
