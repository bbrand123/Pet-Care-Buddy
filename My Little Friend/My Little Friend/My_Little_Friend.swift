//
//  My_Little_Friend.swift
//  My Little Friend
//
//  Created by William Brandon on 2/21/26.
//

import SwiftUI
import WebKit
import UIKit

@main
struct My_Little_FriendApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var isLoading = true
    @State private var reloadToken = UUID()

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("My Little Friend")
                    .font(.headline)
                Spacer()
                Button {
                    reloadToken = UUID()
                } label: {
                    Label("Reload", systemImage: "arrow.clockwise")
                        .labelStyle(.iconOnly)
                }
                .accessibilityLabel("Reload game")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)

            ZStack {
                GameWebView(isLoading: $isLoading, reloadToken: reloadToken)
                    .ignoresSafeArea(edges: .bottom)

                if isLoading {
                    ProgressView("Loading My Little Friend...")
                        .padding(12)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}

struct GameWebView: UIViewRepresentable {
    @Binding var isLoading: Bool
    let reloadToken: UUID

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.backgroundColor = .systemBackground
        webView.scrollView.backgroundColor = .systemBackground
        context.coordinator.lastReloadToken = reloadToken
        loadLocalGame(in: webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if context.coordinator.lastReloadToken != reloadToken {
            context.coordinator.lastReloadToken = reloadToken
            loadLocalGame(in: webView)
        }
    }

    private func loadLocalGame(in webView: WKWebView) {
        guard let indexURL = Bundle.main.url(
            forResource: "index",
            withExtension: "html",
            subdirectory: "Web"
        ) else {
            webView.loadHTMLString(
                "<html><body><h1>Game assets missing from app bundle.</h1></body></html>",
                baseURL: nil
            )
            return
        }

        let readAccessURL = indexURL.deletingLastPathComponent()
        webView.loadFileURL(indexURL, allowingReadAccessTo: readAccessURL)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        @Binding private var isLoading: Bool
        var lastReloadToken = UUID()

        init(isLoading: Binding<Bool>) {
            _isLoading = isLoading
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            isLoading = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading = false
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            isLoading = false
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if url.isFileURL || url.scheme == "about" {
                decisionHandler(.allow)
                return
            }

            if ["http", "https"].contains(url.scheme?.lowercased() ?? "") {
                UIApplication.shared.open(url)
            }
            decisionHandler(.cancel)
        }
    }
}
