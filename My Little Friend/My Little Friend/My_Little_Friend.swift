//
//  My_Little_Friend.swift
//  My Little Friend
//
//  Created by William Brandon on 2/21/26.
//

import SwiftUI
import WebKit
import UIKit
import UserNotifications

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
    @State private var webViewLoadFailure: WebViewLoadFailureState? = nil

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("My Little Friend")
                    .font(.headline)
                Spacer()
                Button {
                    webViewLoadFailure = nil
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
                GameWebView(isLoading: $isLoading, reloadToken: reloadToken, loadFailure: $webViewLoadFailure)
                    .ignoresSafeArea(edges: .bottom)

                if isLoading {
                    ProgressView("Loading My Little Friend...")
                        .padding(12)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                }

                if let failure = webViewLoadFailure {
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.orange)
                            .accessibilityHidden(true)
                        Text("Game Load Problem")
                            .font(.headline)
                        Text(failure.userMessage)
                            .font(.subheadline)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                        Text(failure.details)
                            .font(.caption)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                            .lineLimit(4)
                        HStack(spacing: 10) {
                            Button("Retry") {
                                webViewLoadFailure = nil
                                isLoading = true
                                reloadToken = UUID()
                            }
                            .buttonStyle(.borderedProminent)
                            .accessibilityHint("Reloads the game web view")

                            Button("Copy Diagnostics") {
                                UIPasteboard.general.string = failure.diagnosticsText
                            }
                            .buttonStyle(.bordered)
                            .accessibilityHint("Copies technical details for support")
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: 420)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
                    .padding(16)
                    .accessibilityElement(children: .contain)
                }
            }
        }
    }
}

struct WebViewLoadFailureState: Identifiable, Equatable {
    let id: UUID = UUID()
    let userMessage: String
    let details: String
    let diagnosticsText: String
}

struct GameWebView: UIViewRepresentable {
    @Binding var isLoading: Bool
    let reloadToken: UUID
    @Binding var loadFailure: WebViewLoadFailureState?

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading, loadFailure: $loadFailure)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(context.coordinator, name: "haptics")
        configuration.userContentController.add(context.coordinator, name: "lifecycleSave")
        configuration.userContentController.add(context.coordinator, name: "notifications")

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
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, UNUserNotificationCenterDelegate {
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
        @Binding private var loadFailure: WebViewLoadFailureState?
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
        private var pendingNotificationDeepLink: [String: Any]?

        init(isLoading: Binding<Bool>, loadFailure: Binding<WebViewLoadFailureState?>) {
            _isLoading = isLoading
            _loadFailure = loadFailure
            super.init()
            prepareHaptics()
        }

        deinit {
            NotificationCenter.default.removeObserver(self)
        }

        func attach(webView: WKWebView) {
            self.webView = webView
            installLifecycleObserversIfNeeded()
            UNUserNotificationCenter.current().delegate = self
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
            if message.name == "notifications" {
                handleNativeNotificationsMessage(message)
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

        private func handleNativeNotificationsMessage(_ message: WKScriptMessage) {
            guard let body = message.body as? [String: Any] else { return }
            let action = (body["action"] as? String ?? "").lowercased()
            let requestId = body["requestId"] as? String ?? UUID().uuidString
            switch action {
            case "requestpermission":
                handleNotificationsPermissionRequest(requestId: requestId)
            case "schedule":
                handleNotificationSchedule(body: body, requestId: requestId)
            case "cancel":
                handleNotificationCancel(body: body, requestId: requestId)
            case "cancelall":
                handleNotificationCancelAll(requestId: requestId)
            default:
                sendNotificationsBridgeCallback([
                    "requestId": requestId,
                    "ok": false,
                    "error": "Unknown notifications action: \(action)"
                ])
            }
        }

        private func handleNotificationsPermissionRequest(requestId: String) {
            let center = UNUserNotificationCenter.current()
            center.requestAuthorization(options: [.alert, .badge, .sound]) { [weak self] granted, error in
                center.getNotificationSettings { settings in
                    let permission = self?.mapNotificationAuthorizationStatus(settings.authorizationStatus) ?? "default"
                    DispatchQueue.main.async {
                        var payload: [String: Any] = [
                            "requestId": requestId,
                            "ok": error == nil,
                            "granted": granted,
                            "permission": permission
                        ]
                        if let error {
                            payload["error"] = error.localizedDescription
                        }
                        self?.sendNotificationsBridgeCallback(payload)
                    }
                }
            }
        }

        private func handleNotificationSchedule(body: [String: Any], requestId: String) {
            let identifier = (body["id"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "mlf.reminder.\(UUID().uuidString)"
            let title = (body["title"] as? String) ?? "My Little Friend"
            let messageBody = (body["body"] as? String) ?? ""
            let route = normalizedReminderRoute(body["route"] as? String)
            let reminderType = (body["reminderType"] as? String) ?? "generic"

            let content = UNMutableNotificationContent()
            content.title = title
            content.body = messageBody
            content.sound = .default
            content.userInfo = [
                "route": route,
                "reminderType": reminderType,
                "deepLink": "mlf://\(route)"
            ]

            let delaySeconds = (body["delaySeconds"] as? NSNumber)?.doubleValue ?? (body["delaySeconds"] as? Double)
            let fireAtMs = (body["fireAt"] as? NSNumber)?.doubleValue ?? (body["fireAt"] as? Double)
            let trigger: UNTimeIntervalNotificationTrigger
            if let fireAtMs, fireAtMs > 0 {
                let delta = max(1.0, (fireAtMs / 1000.0) - Date().timeIntervalSince1970)
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: delta, repeats: false)
            } else {
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1.0, delaySeconds ?? 3.0), repeats: false)
            }

            let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request) { [weak self] error in
                DispatchQueue.main.async {
                    var payload: [String: Any] = [
                        "requestId": requestId,
                        "ok": error == nil,
                        "id": identifier,
                        "route": route
                    ]
                    if let error {
                        payload["error"] = error.localizedDescription
                    }
                    self?.sendNotificationsBridgeCallback(payload)
                }
            }
        }

        private func handleNotificationCancel(body: [String: Any], requestId: String) {
            let identifier = (body["id"] as? String) ?? ""
            if !identifier.isEmpty {
                UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
                UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [identifier])
            }
            sendNotificationsBridgeCallback([
                "requestId": requestId,
                "ok": true,
                "id": identifier
            ])
        }

        private func handleNotificationCancelAll(requestId: String) {
            let center = UNUserNotificationCenter.current()
            center.removeAllPendingNotificationRequests()
            center.removeAllDeliveredNotifications()
            sendNotificationsBridgeCallback([
                "requestId": requestId,
                "ok": true
            ])
        }

        private func mapNotificationAuthorizationStatus(_ status: UNAuthorizationStatus) -> String {
            switch status {
            case .authorized, .provisional, .ephemeral:
                return "granted"
            case .denied:
                return "denied"
            case .notDetermined:
                return "default"
            @unknown default:
                return "default"
            }
        }

        private func normalizedReminderRoute(_ route: String?) -> String {
            let raw = (route ?? "journey").lowercased().replacingOccurrences(of: "#", with: "").replacingOccurrences(of: "/", with: "")
            switch raw {
            case "streak":
                return "streak"
            case "explore", "expedition":
                return "explore"
            case "garden":
                return "garden"
            default:
                return "journey"
            }
        }

        private func sendNotificationsBridgeCallback(_ payload: [String: Any]) {
            guard let webView else { return }
            guard JSONSerialization.isValidJSONObject(payload),
                  let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else {
                return
            }
            let script = """
            (function() {
              try {
                if (window.MLFNativeNotifications && typeof window.MLFNativeNotifications.__nativeCallback === 'function') {
                  window.MLFNativeNotifications.__nativeCallback(\(json));
                }
              } catch (_) {}
            })();
            """
            webView.evaluateJavaScript(script, completionHandler: nil)
        }

        private func deliverReminderDeepLink(route: String, reminderType: String) {
            let payload: [String: Any] = [
                "route": normalizedReminderRoute(route),
                "reminderType": reminderType,
                "deepLink": "mlf://\(normalizedReminderRoute(route))"
            ]
            pendingNotificationDeepLink = payload
            attemptDeliverPendingReminderDeepLink()
        }

        private func attemptDeliverPendingReminderDeepLink() {
            guard let webView, let payload = pendingNotificationDeepLink else { return }
            guard JSONSerialization.isValidJSONObject(payload),
                  let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else {
                return
            }
            let script = """
            (function() {
              try {
                if (window.MLFNativeNotifications && typeof window.MLFNativeNotifications.__nativeDeepLink === 'function') {
                  return !!window.MLFNativeNotifications.__nativeDeepLink(\(json));
                }
                return false;
              } catch (_) {
                return false;
              }
            })();
            """
            webView.evaluateJavaScript(script) { [weak self] result, error in
                guard let self else { return }
                if error == nil {
                    self.pendingNotificationDeepLink = nil
                    return
                }
                self.pendingNotificationDeepLink = payload
                _ = result
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
            loadFailure = nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
            loadFailure = nil
            attemptDeliverPendingReminderDeepLink()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            handleWebViewLoadFailure(in: webView, error: error, phase: "didFailNavigation")
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            handleWebViewLoadFailure(in: webView, error: error, phase: "didFailProvisionalNavigation")
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

        func userNotificationCenter(
            _ center: UNUserNotificationCenter,
            willPresent notification: UNNotification,
            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
        ) {
            completionHandler([.banner, .sound])
        }

        func userNotificationCenter(
            _ center: UNUserNotificationCenter,
            didReceive response: UNNotificationResponse,
            withCompletionHandler completionHandler: @escaping () -> Void
        ) {
            let userInfo = response.notification.request.content.userInfo
            let route = (userInfo["route"] as? String) ?? "journey"
            let reminderType = (userInfo["reminderType"] as? String) ?? "generic"
            DispatchQueue.main.async { [weak self] in
                self?.deliverReminderDeepLink(route: route, reminderType: reminderType)
                completionHandler()
            }
        }

        private func handleWebViewLoadFailure(in webView: WKWebView, error: Error, phase: String) {
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled {
                return
            }

            isLoading = false
            let failure = buildWebViewLoadFailureState(webView: webView, error: nsError, phase: phase)
            loadFailure = failure
            reportWebViewLoadFailureToDiagnosticsBuffer(failure, phase: phase, nsError: nsError)
        }

        private func buildWebViewLoadFailureState(webView: WKWebView, error: NSError, phase: String) -> WebViewLoadFailureState {
            let failingURL = webView.url?.absoluteString ?? "unknown"
            let bundleVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
            let bundleBuild = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
            let timestamp = ISO8601DateFormatter().string(from: Date())
            let diagnosticsLines = [
                "My Little Friend Native WebView Diagnostics",
                "Timestamp: \(timestamp)",
                "Phase: \(phase)",
                "Error Domain: \(error.domain)",
                "Error Code: \(error.code)",
                "Error: \(error.localizedDescription)",
                "Failing URL: \(failingURL)",
                "iOS: \(UIDevice.current.systemName) \(UIDevice.current.systemVersion)",
                "Device: \(UIDevice.current.model)",
                "App Version: \(bundleVersion) (\(bundleBuild))"
            ]

            return WebViewLoadFailureState(
                userMessage: "The game page did not load correctly in the app web view.",
                details: "\(error.localizedDescription) (code \(error.code))",
                diagnosticsText: diagnosticsLines.joined(separator: "\n")
            )
        }

        private func reportWebViewLoadFailureToDiagnosticsBuffer(_ failure: WebViewLoadFailureState, phase: String, nsError: NSError) {
            print("[MLF][NATIVE] WebView load failure (\(phase)): \(nsError.domain) \(nsError.code) \(nsError.localizedDescription)")
            guard let webView else { return }

            let entry: [String: Any] = [
                "category": "NATIVE",
                "level": "error",
                "message": "WKWebView navigation/load failure.",
                "meta": [
                    "phase": phase,
                    "errorDomain": nsError.domain,
                    "errorCode": nsError.code,
                    "errorMessage": nsError.localizedDescription,
                    "diagnosticsText": failure.diagnosticsText
                ]
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
    }
}
