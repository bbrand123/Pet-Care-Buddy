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
        configuration.userContentController.add(context.coordinator, name: "lifecycleSave")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.backgroundColor = .systemBackground
        webView.scrollView.backgroundColor = .systemBackground
        context.coordinator.lastReloadToken = reloadToken
        context.coordinator.attach(webView: webView)
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

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private struct PendingLifecycleSaveRequest {
            let requestId: String
            let reason: String
            let timeoutWorkItem: DispatchWorkItem
            let completion: (LifecycleSaveResponse) -> Void
        }

        private struct LifecycleSaveResponse {
            let requestId: String
            let reason: String
            let ok: Bool
            let timedOut: Bool
            let durationMs: Double?
            let errorCode: String?
            let errorMessage: String?
            let meta: [String: Any]
        }

        @Binding private var isLoading: Bool
        var lastReloadToken = UUID()
        private weak var webView: WKWebView?
        private let lightImpact = UIImpactFeedbackGenerator(style: .light)
        private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
        private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
        private let notificationFeedback = UINotificationFeedbackGenerator()
        private var lifecycleObserversInstalled = false
        private var pendingLifecycleSaveRequests: [String: PendingLifecycleSaveRequest] = [:]
        private let lifecycleSaveTimeoutMs = 1800
        private let lifecycleSaveQueue = DispatchQueue.main
        private var lastLifecycleSaveTriggerAt = Date.distantPast

        init(isLoading: Binding<Bool>) {
            _isLoading = isLoading
            super.init()
            prepareHaptics()
        }

        deinit {
            NotificationCenter.default.removeObserver(self)
        }

        func attach(webView: WKWebView) {
            self.webView = webView
            installLifecycleObserversIfNeeded()
        }

        private func prepareHaptics() {
            lightImpact.prepare()
            mediumImpact.prepare()
            heavyImpact.prepare()
            notificationFeedback.prepare()
        }

        private func installLifecycleObserversIfNeeded() {
            guard !lifecycleObserversInstalled else { return }
            lifecycleObserversInstalled = true
            let center = NotificationCenter.default
            center.addObserver(self, selector: #selector(handleWillResignActive), name: UIApplication.willResignActiveNotification, object: nil)
            center.addObserver(self, selector: #selector(handleDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
            center.addObserver(self, selector: #selector(handleWillTerminate), name: UIApplication.willTerminateNotification, object: nil)
        }

        @objc private func handleWillResignActive() {
            triggerLifecycleSave(reason: "app_will_resign_active")
        }

        @objc private func handleDidEnterBackground() {
            triggerLifecycleSave(reason: "app_did_enter_background")
        }

        @objc private func handleWillTerminate() {
            triggerLifecycleSave(reason: "app_will_terminate")
        }

        private func triggerLifecycleSave(reason: String) {
            guard let webView else { return }

            let now = Date()
            if now.timeIntervalSince(lastLifecycleSaveTriggerAt) < 0.12 {
                return
            }
            lastLifecycleSaveTriggerAt = now

            var backgroundTaskId = UIBackgroundTaskIdentifier.invalid
            backgroundTaskId = UIApplication.shared.beginBackgroundTask(withName: "MLF.LifecycleSave") {
                if backgroundTaskId != .invalid {
                    UIApplication.shared.endBackgroundTask(backgroundTaskId)
                    backgroundTaskId = .invalid
                }
            }

            Task { @MainActor [weak self, weak webView] in
                guard let self, let webView else {
                    if backgroundTaskId != .invalid {
                        UIApplication.shared.endBackgroundTask(backgroundTaskId)
                    }
                    return
                }

                let result = await self.awaitLifecycleSave(in: webView, reason: reason, timeoutMs: self.lifecycleSaveTimeoutMs)
                if !result.ok {
                    self.reportLifecycleSaveFailureToDiagnosticsBuffer(result)
                }

                if backgroundTaskId != .invalid {
                    UIApplication.shared.endBackgroundTask(backgroundTaskId)
                }
            }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "lifecycleSave" {
                handleLifecycleSaveCallback(message)
                return
            }
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

        @MainActor
        private func awaitLifecycleSave(in webView: WKWebView, reason: String, timeoutMs: Int) async -> LifecycleSaveResponse {
            let requestId = UUID().uuidString
            let startedAt = Date()

            return await withCheckedContinuation { continuation in
                let timeoutWorkItem = DispatchWorkItem { [weak self] in
                    guard let self else { return }
                    let timeoutResponse = LifecycleSaveResponse(
                        requestId: requestId,
                        reason: reason,
                        ok: false,
                        timedOut: true,
                        durationMs: Date().timeIntervalSince(startedAt) * 1000,
                        errorCode: "TIMEOUT",
                        errorMessage: "Timed out waiting for lifecycle save callback from JavaScript.",
                        meta: [:]
                    )
                    self.completeLifecycleSaveRequest(requestId: requestId, with: timeoutResponse)
                }

                pendingLifecycleSaveRequests[requestId] = PendingLifecycleSaveRequest(
                    requestId: requestId,
                    reason: reason,
                    timeoutWorkItem: timeoutWorkItem,
                    completion: { response in
                        continuation.resume(returning: response)
                    }
                )

                lifecycleSaveQueue.asyncAfter(deadline: .now() + .milliseconds(timeoutMs), execute: timeoutWorkItem)

                let script = lifecycleSaveInvocationScript(requestId: requestId, reason: reason)
                webView.evaluateJavaScript(script) { [weak self] _, error in
                    guard let self else { return }
                    if let error {
                        let response = LifecycleSaveResponse(
                            requestId: requestId,
                            reason: reason,
                            ok: false,
                            timedOut: false,
                            durationMs: Date().timeIntervalSince(startedAt) * 1000,
                            errorCode: "JS_EVALUATE_ERROR",
                            errorMessage: error.localizedDescription,
                            meta: [:]
                        )
                        self.completeLifecycleSaveRequest(requestId: requestId, with: response)
                    }
                }
            }
        }

        @MainActor
        private func handleLifecycleSaveCallback(_ message: WKScriptMessage) {
            guard let body = message.body as? [String: Any] else { return }
            guard let requestId = body["requestId"] as? String, !requestId.isEmpty else { return }

            let ok = (body["ok"] as? Bool) ?? false
            let reason = (body["reason"] as? String) ?? (pendingLifecycleSaveRequests[requestId]?.reason ?? "native-lifecycle")
            let durationMs = (body["durationMs"] as? NSNumber)?.doubleValue ?? (body["durationMs"] as? Double)

            var errorCode: String? = nil
            var errorMessage: String? = nil
            if let error = body["error"] as? [String: Any] {
                errorCode = error["code"] as? String
                errorMessage = error["message"] as? String
            } else if !ok {
                errorMessage = "JavaScript lifecycle save returned failure without error payload."
                errorCode = "JS_SAVE_FAILED"
            }

            let response = LifecycleSaveResponse(
                requestId: requestId,
                reason: reason,
                ok: ok,
                timedOut: false,
                durationMs: durationMs,
                errorCode: errorCode,
                errorMessage: errorMessage,
                meta: body
            )
            completeLifecycleSaveRequest(requestId: requestId, with: response)
        }

        @MainActor
        private func completeLifecycleSaveRequest(requestId: String, with response: LifecycleSaveResponse) {
            guard let pending = pendingLifecycleSaveRequests.removeValue(forKey: requestId) else { return }
            pending.timeoutWorkItem.cancel()
            pending.completion(response)
        }

        private func lifecycleSaveInvocationScript(requestId: String, reason: String) -> String {
            let requestIdLiteral = jsStringLiteral(requestId)
            let reasonLiteral = jsStringLiteral(reason)
            return """
            (function() {
              try {
                var payload = { requestId: \(requestIdLiteral), reason: \(reasonLiteral), force: false };
                if (window.MLFSaveLifecycleBridge && typeof window.MLFSaveLifecycleBridge.requestSave === 'function') {
                  window.MLFSaveLifecycleBridge.requestSave(payload);
                  return { requested: true };
                }
                if (typeof window.saveNowForLifecycle === 'function') {
                  Promise.resolve(window.saveNowForLifecycle(payload.reason)).then(function(result) {
                    var out = (result && typeof result === 'object') ? result : { ok: !!result };
                    out.requestId = payload.requestId;
                    out.reason = out.reason || payload.reason;
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.lifecycleSave) {
                      window.webkit.messageHandlers.lifecycleSave.postMessage(out);
                    }
                  }).catch(function(err) {
                    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.lifecycleSave) {
                      window.webkit.messageHandlers.lifecycleSave.postMessage({
                        requestId: payload.requestId,
                        ok: false,
                        reason: payload.reason,
                        error: { code: 'PROMISE_REJECTED', message: String((err && err.message) || err) }
                      });
                    }
                  });
                  return { requested: true, fallback: true };
                }
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.lifecycleSave) {
                  window.webkit.messageHandlers.lifecycleSave.postMessage({
                    requestId: payload.requestId,
                    ok: false,
                    reason: payload.reason,
                    error: { code: 'LIFECYCLE_SAVE_BRIDGE_UNAVAILABLE', message: 'Lifecycle save bridge not ready.' }
                  });
                }
                return { requested: false };
              } catch (err) {
                if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.lifecycleSave) {
                  window.webkit.messageHandlers.lifecycleSave.postMessage({
                    requestId: \(requestIdLiteral),
                    ok: false,
                    reason: \(reasonLiteral),
                    error: { code: 'LIFECYCLE_SAVE_INVOKE_EXCEPTION', message: String((err && err.message) || err) }
                  });
                }
                return { requested: false, error: true };
              }
            })();
            """
        }

        private func jsStringLiteral(_ value: String) -> String {
            let escaped = value
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "\"", with: "\\\"")
                .replacingOccurrences(of: "\n", with: "\\n")
                .replacingOccurrences(of: "\r", with: "\\r")
                .replacingOccurrences(of: "\u{2028}", with: "\\u2028")
                .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
            return "\"\(escaped)\""
        }

        private func reportLifecycleSaveFailureToDiagnosticsBuffer(_ result: LifecycleSaveResponse) {
            print("[MLF][NATIVE] Lifecycle save failed (\(result.reason)): \(result.errorCode ?? "UNKNOWN") \(result.errorMessage ?? "")")
            guard let webView else { return }

            var meta = result.meta
            meta["requestId"] = result.requestId
            meta["reason"] = result.reason
            meta["timedOut"] = result.timedOut
            if let durationMs = result.durationMs {
                meta["durationMs"] = durationMs
            }
            if let errorCode = result.errorCode {
                meta["errorCode"] = errorCode
            }
            if let errorMessage = result.errorMessage {
                meta["errorMessage"] = errorMessage
            }
            meta["nativeBundleVersion"] = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
            meta["nativeBuildNumber"] = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"

            let entry: [String: Any] = [
                "category": "NATIVE",
                "level": "error",
                "message": "Lifecycle save failed in native bridge.",
                "meta": meta
            ]

            guard
                JSONSerialization.isValidJSONObject(entry),
                let data = try? JSONSerialization.data(withJSONObject: entry),
                let json = String(data: data, encoding: .utf8)
            else {
                return
            }

            let script = """
            (function() {
              try {
                if (window.MLFDiagnostics && typeof window.MLFDiagnostics.push === 'function') {
                  window.MLFDiagnostics.push(\(json));
                }
              } catch (_) {}
            })();
            """
            webView.evaluateJavaScript(script, completionHandler: nil)
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
