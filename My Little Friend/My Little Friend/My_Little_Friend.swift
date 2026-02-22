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
        configuration.userContentController.add(context.coordinator, name: "haptics")

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

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        @Binding private var isLoading: Bool
        var lastReloadToken = UUID()
        private let lightImpact = UIImpactFeedbackGenerator(style: .light)
        private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
        private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
        private let notificationFeedback = UINotificationFeedbackGenerator()

        init(isLoading: Binding<Bool>) {
            _isLoading = isLoading
            super.init()
            prepareHaptics()
        }

        private func prepareHaptics() {
            lightImpact.prepare()
            mediumImpact.prepare()
            heavyImpact.prepare()
            notificationFeedback.prepare()
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "haptics" else { return }

            var type = "confirm"
            var strength: String?
            if let body = message.body as? [String: Any] {
                if let bodyType = body["type"] as? String, !bodyType.isEmpty {
                    type = bodyType.lowercased()
                }
                if let bodyStrength = body["strength"] as? String, !bodyStrength.isEmpty {
                    strength = bodyStrength.lowercased()
                }
            } else if let bodyType = message.body as? String, !bodyType.isEmpty {
                type = bodyType.lowercased()
            }

            DispatchQueue.main.async { [weak self] in
                self?.fireHaptic(type: type, strength: strength)
            }
        }

        private func fireHaptic(type: String, strength: String?) {
            switch type {
            case "reward", "success":
                notificationFeedback.notificationOccurred(.success)
            case "damage":
                if strength == "heavy" {
                    heavyImpact.impactOccurred(intensity: 1.0)
                } else {
                    mediumImpact.impactOccurred(intensity: 0.9)
                }
            case "fail", "error":
                notificationFeedback.notificationOccurred(.error)
            case "warning":
                notificationFeedback.notificationOccurred(.warning)
            case "confirm":
                fallthrough
            default:
                if strength == "heavy" {
                    heavyImpact.impactOccurred(intensity: 0.9)
                } else if strength == "medium" {
                    mediumImpact.impactOccurred(intensity: 0.8)
                } else {
                    lightImpact.impactOccurred(intensity: 0.7)
                }
            }
            prepareHaptics()
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
