#!/usr/bin/env bash
# 将 ui-source/ 前端源码同步进 iOS 壳的 Web 资源（对应 android-app/sync-assets.sh）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/ui-source"
DST="$(cd "$(dirname "$0")" && pwd)/DPanel/Web"

rm -rf "$DST"
mkdir -p "$DST"
cp -r "$SRC/css" "$SRC/js" "$SRC/icons" "$DST/"
cp "$SRC/index.html" "$SRC/manifest.webmanifest" "$SRC/sw.js" "$DST/"

echo "UI synced to $DST"
