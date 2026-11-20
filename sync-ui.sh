#!/usr/bin/env bash
# 将 ui-source/ 前端源码同步进 asset/static/（内嵌部署使用 /dpanel/static/asset 绝对路径）
set -e
SRC="$(cd "$(dirname "$0")" && pwd)/ui-source"
DST="$(cd "$(dirname "$0")" && pwd)/asset/static"

rm -rf "$DST/css" "$DST/js" "$DST/icons"
cp -r "$SRC/css" "$SRC/js" "$SRC/icons" "$DST/"
cp "$SRC/manifest.webmanifest" "$SRC/sw.js" "$DST/"

# 内嵌部署必须使用绝对路径
sed -e 's|href="manifest.webmanifest"|href="/dpanel/static/asset/manifest.webmanifest"|' \
    -e 's|href="icons/|href="/dpanel/static/asset/icons/|g' \
    -e 's|href="css/|href="/dpanel/static/asset/css/|g' \
    -e 's|src="js/|src="/dpanel/static/asset/js/|g' \
    "$SRC/index.html" > "$DST/index.html"

echo "UI synced to $DST"
