#!/bin/sh
# 先起 nginx（8080：前端 + 反代），再启动官方 DPanel 后端（8086，前台运行）
nginx -t && nginx
exec /docker/entrypoint-lite.sh
