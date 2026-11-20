import SwiftUI
import WebKit

// DPanel iOS 壳：WKWebView 加载打包在本地的同一套 Web UI
// 数据直连 DPanel 面板（登录页可填任意地址），http 面板需 Info.plist 放行 ATS
struct WebViewContainer: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()

        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.allowsBackForwardNavigationGestures = false
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        wv.scrollView.isScrollEnabled = false // 页面内部自带滚动容器
        wv.isOpaque = false
        wv.backgroundColor = UIColor.systemBackground

        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            wv.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return wv
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

@main
struct DPanelApp: App {
    var body: some Scene {
        WindowGroup {
            WebViewContainer()
                .ignoresSafeArea()
                .preferredColorScheme(nil) // 跟随系统，UI 内部自处理主题
        }
    }
}
