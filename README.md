# DPanel Aurora

基于开源容器管理面板 [DPanel](https://github.com/donknap/dpanel) 的深度定制版本 —— 全新重写的响应式前端 UI，桌面端是完整的仪表盘布局，手机端自动切换为底部导航的 App 式交互，一套代码同时适配桌面 / 平板 / 手机。

后端直接使用 DPanel 官方镜像（不拉源码、不编译 Go），功能与 API 保持兼容；前端为纯原生 HTML/CSS/JS 实现（零框架、零构建依赖），由镜像内置 nginx 直接提供，API / WebSocket 反向代理给官方后端。

![桌面端](docs/final-desktop.png)

![手机端](docs/final-mobile.png)

## ✨ 特性

- **响应式布局**
  - 桌面（≥1024px）：左侧常驻导航栏（16 个功能入口）+ 顶栏 + 多列卡片仪表盘，概览页左右分栏
  - 平板：全屏单栏布局
  - 手机：底部 5 项 Tab 导航，单栏卡片流，适配刘海屏安全区
- **明暗双主题**，跟随偏好自由切换
- **登录页**：桌面品牌渐变双栏，手机单栏卡片；首次登录自动完成创始人初始化
- **19 个功能页面**：概览、容器、镜像、网络、卷、Compose、文件管理、Swarm、快照、域名证书、应用商店、Docker 环境、计划任务、镜像仓库、标签分组、系统日志、通知中心、设置等
- **演示模式**：无需账号即可预览，URL 加 `?demo=1`
- 镜像内集成 `docker-cli` / `docker-cli-compose` / `buildx`，可直接在面板内管理宿主机容器

## 🚀 快速部署

### 方式一：Docker Compose（推荐）

```bash
curl -O https://raw.githubusercontent.com/opersdev/dpanel-aurora/master/docker-compose.yml
docker compose up -d
```

### 方式二：docker run

```bash
docker run -d \
  --name dpanel-aurora \
  --restart unless-stopped \
  -p 8808:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dpanel-data:/dpanel \
  ghcr.io/opersdev/dpanel-aurora:latest
```

> 需要挂载 `/var/run/docker.sock`，面板通过它管理宿主机上的容器。

启动后访问：

- 面板：<http://localhost:8808/>
- 演示模式：<http://localhost:8808/?demo=1>

### 首次使用

新部署没有预置账号。打开页面后直接输入你想用的用户名和密码，前端会自动调用创始人初始化接口完成账号创建，之后正常登录即可。

### 端口与目录

| 项目 | 说明 |
| --- | --- |
| `8808:8080` | 左侧为宿主机端口，可自行修改 |
| `/dpanel` | 数据卷：SQLite 数据库、ACME 证书、Compose 项目、构建缓存等持久化数据 |
| `/var/run/docker.sock` | Docker 套接字，面板管理容器的通道 |

## 🐳 镜像说明

- 镜像发布在 GHCR：`ghcr.io/opersdev/dpanel-aurora`
- 每次推送到 `master` 自动构建 `latest`；推送 `v*` 标签会生成对应的版本 tag（如 `v1.0.0`）
- 当前构建架构：`linux/amd64`
- 构建方式：**直接 `FROM dpanel/dpanel:lite` 官方镜像**，只需安装 nginx + 复制前端文件，秒级构建、不拉后端源码、不编译 Go
  - 官方后端挪到 8086 端口，nginx 监听 8080：`/` 提供本仓库前端，`/dpanel/api`、`/dpanel/ws` 反代官方后端
- 后端版本锁定：`docker build --build-arg DPANEL_IMAGE=dpanel/dpanel:v2.5.1-lite`（换成任意官方 tag）；国内网络可用 `docker.m.daocloud.io/dpanel/dpanel:lite` 加速

## 🛠️ 本地构建镜像

```bash
git clone https://github.com/opersdev/dpanel-aurora.git
cd dpanel-aurora
docker build -f docker/Dockerfile.web -t dpanel-aurora:local .
```

## 🎨 修改前端 UI

- 前端源码在 [`ui-source/`](ui-source/) 目录：`index.html` + `css/` + `js/`，纯原生实现，改完无需任何构建步骤
- 重新 `docker build` 即生效（nginx 配置在 [`docker/nginx-ui.conf`](docker/nginx-ui.conf)，启动脚本在 [`docker/start.sh`](docker/start.sh)）

> `ui-source` 中的页面通过相对路径 `./css/...`、`./js/...` 引用资源，可直接用任意静态服务器本地预览（API 需另有后端或走镜像）。

## 📦 目录结构

```
├── ui-source/           # 前端源码（HTML/CSS/JS，可直接修改）
├── docker/
│   ├── Dockerfile.web   # 镜像构建：FROM 官方镜像 + nginx 替换前端
│   ├── nginx-ui.conf    # nginx：前端入口 8080 / 反代 API·WS
│   └── start.sh         # 容器入口：先起 nginx 再起官方后端
├── docs/                # 截图
├── android-app/         # 安卓 App 工程（WebView 壳，复用 ui-source）
├── ios/                 # iOS App 工程（SwiftUI + WKWebView 壳，复用 ui-source）
├── docker-compose.yml   # 一键部署
└── android-app/sync-assets.sh  # 前端源码 → 安卓 assets 同步脚本
```

> 本仓库**只维护前端与移动端**：镜像直接基于官方 [dpanel/dpanel](https://github.com/donknap/dpanel) 镜像构建，后端与官方发版保持同步，无需维护任何 Go 代码。

## 📱 移动端 App（Android / iOS）

同一套 `ui-source/` 前端，分别打包成安卓 APK 与 iOS IPA：

### Android

- 工程：[`android-app/`](android-app/)（WebView 壳，界面资源由 `sync-assets.sh` 从 `ui-source/` 同步进 assets）
- 推送到 `master` 时 GitHub Actions 自动构建**未签名 APK**（`.github/workflows/build-android-apk.yml`），在 Actions 运行页下载 artifact `DPanel-unsigned-apk`
- 本地构建：`bash android-app/sync-assets.sh && cd android-app && ./gradlew assembleRelease`

### iOS

- 工程：[`ios/`](ios/)（SwiftUI + WKWebView，XcodeGen 描述，详细说明见 [ios/README.md](ios/README.md)）
- 推送到 `master` 时自动产出**未签名 IPA**（artifact `DPanel-unsigned-ipa`）
- 未签名 IPA 需重签后安装：Windows 用 [Sideloadly](https://sideloadly.io/) + Apple ID（免费证书 7 天续签），或有 Mac/开发者账号直接签名
- 零成本替代：iPhone Safari 打开面板地址 → 分享 → 添加到主屏幕（PWA）

> 改前端 UI 只需改 `ui-source/`：Web/镜像/安卓 APK 都从它同步，一处修改三端生效。

## 🙏 致谢与许可

- 后端与原始项目：[donknap/dpanel](https://github.com/donknap/dpanel)，遵循其原版 [LICENSE](LICENSE)
- 前端 UI 为本仓库原创重写
