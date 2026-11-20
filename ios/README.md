# DPanel iOS 版

iOS 壳工程：SwiftUI + WKWebView，加载与本安卓 APK 完全相同的一套 Web UI，数据直连你的 DPanel 面板。

## 目录结构

```
ios/
├── project.yml              # XcodeGen 工程描述（生成 DPanel.xcodeproj）
├── DPanel/
│   ├── App.swift            # SwiftUI 入口 + WKWebView 壳
│   ├── Info.plist           # 由 project.yml 生成（ATS 放行 http、全屏、横竖屏）
│   ├── Assets.xcassets/     # AppIcon（1024）+ AccentColor
│   └── Web/                 # Web UI 资源（与安卓 APK 内 assets 同源）
```

## 两种安装方式

### 方式 A：PWA（零成本，推荐先用这个）

面板已在运行这套 UI 的话（例如 http://192.168.200.247:8807）：

1. iPhone 用 **Safari** 打开面板地址
2. 底部「分享」→「添加到主屏幕」
3. 桌面出现 DPanel 图标，点开即全屏运行（无浏览器地址栏）

优点：不用签名、不用电脑、面板前端更新立即生效。
注意：Safari 的 PWA 支持略弱于 App 壳（如个别 API 受限），绝大多数页面功能正常。

### 方式 B：真 IPA（需重签）

IPA 必须有签名才能装到 iPhone。本仓库的 GitHub Actions 会产出**未签名 IPA**，你用自己 Apple ID 重签（免费账号即可，App 7 天有效需续签；付费开发者账号 1 年）：

1. 把 `dpanel-app/` 目录推到你的 GitHub 仓库（workflow 在 `.github/workflows/build-ios-ipa.yml`，push 到 main 即自动构建，或在 Actions 页手动 Run）
2. 构建完成后到 Actions 运行页下载 artifact `DPanel-unsigned-ipa`
3. Windows 上安装 [Sideloadly](https://sideloadly.io/)（需先装 iTunes+iCloud 官方版获取驱动）
4. iPhone 连电脑 → Sideloadly 拖入 IPA → 填你的 Apple ID → Start → 完成后在 iPhone「设置-通用-VPN与设备管理」信任证书
5. 或者用 **AltStore**（免电脑后续可续签）/ 有付费开发者账号则直接在 Xcode 里签名分发

## 本地构建（有 Mac 时）

```bash
brew install xcodegen
cd ios && xcodegen generate
open DPanel.xcodeproj   # Xcode 里选好签名团队直接 Run
```

## 修改 Web UI 后同步

```bash
# 在 dpanel-app 目录执行
cp index.html sw.js manifest.webmanifest ios/DPanel/Web/
cp -r css js icons ios/DPanel/Web/
```
