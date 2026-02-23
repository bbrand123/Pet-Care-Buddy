import Testing
import Foundation
import WebKit
@testable import My_Little_Friend

@MainActor
private final class WebViewNavigationWaiter: NSObject, WKNavigationDelegate {
    private var continuation: CheckedContinuation<Void, Error>?
    private var completed = false

    func waitForFinish(timeoutMs: Int = 3000) async throws {
        if completed { return }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            self.continuation = continuation
            DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(timeoutMs)) { [weak self] in
                guard let self else { return }
                guard !self.completed else { return }
                self.completed = true
                self.continuation?.resume(throwing: NSError(
                    domain: "WebViewNavigationWaiter",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Timed out waiting for WKWebView navigation finish"]
                ))
                self.continuation = nil
            }
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !completed else { return }
        completed = true
        continuation?.resume()
        continuation = nil
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fail(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fail(error)
    }

    private func fail(_ error: Error) {
        guard !completed else { return }
        completed = true
        continuation?.resume(throwing: error)
        continuation = nil
    }
}

@MainActor
private final class LifecycleSaveMessageWaiter: NSObject, WKScriptMessageHandler {
    private var continuation: CheckedContinuation<[String: Any], Error>?
    private var completed = false

    func waitForMessage(timeoutMs: Int = 1500) async throws -> [String: Any] {
        if completed {
            throw NSError(domain: "LifecycleSaveMessageWaiter", code: 2, userInfo: [NSLocalizedDescriptionKey: "Message already consumed"])
        }
        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[String: Any], Error>) in
            self.continuation = continuation
            DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(timeoutMs)) { [weak self] in
                guard let self else { return }
                guard !self.completed else { return }
                self.completed = true
                self.continuation?.resume(throwing: NSError(
                    domain: "LifecycleSaveMessageWaiter",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Timed out waiting for lifecycleSave message"]
                ))
                self.continuation = nil
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard !completed else { return }
        guard message.name == "lifecycleSave" else { return }
        guard let body = message.body as? [String: Any] else { return }
        completed = true
        continuation?.resume(returning: body)
        continuation = nil
    }
}

@MainActor
struct My_Little_FriendTests {

    @Test func wkWebViewLifecycleSaveBridgeSmoke() async throws {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        let messageWaiter = LifecycleSaveMessageWaiter()
        configuration.userContentController.add(messageWaiter, name: "lifecycleSave")
        let webView = WKWebView(frame: .zero, configuration: configuration)

        let navWaiter = WebViewNavigationWaiter()
        webView.navigationDelegate = navWaiter

        webView.loadHTMLString(
            """
            <!doctype html>
            <html>
            <head><meta charset="utf-8"><title>MLF Test</title></head>
            <body>
              <script>
                window.MLFSaveLifecycleBridge = {
                  requestSave: function(payload) {
                    setTimeout(function() {
                      window.webkit.messageHandlers.lifecycleSave.postMessage({
                        requestId: payload.requestId,
                        reason: payload.reason,
                        ok: true,
                        durationMs: 2
                      });
                    }, 0);
                  }
                };
              </script>
              <div id="ready">ready</div>
            </body>
            </html>
            """,
            baseURL: URL(string: "https://example.invalid/")
        )

        try await navWaiter.waitForFinish()
        let scriptResult = try await webView.evaluateJavaScript(
            """
            (function () {
              if (!window.MLFSaveLifecycleBridge || typeof window.MLFSaveLifecycleBridge.requestSave !== 'function') {
                return { requested: false };
              }
              var payload = { requestId: 'unit-test-1', reason: 'test_wkwebview_smoke' };
              window.MLFSaveLifecycleBridge.requestSave(payload);
              return { requested: true };
            })();
            """
        ) as? [String: Any]
        #expect((scriptResult?["requested"] as? Bool) == true)

        let message = try await messageWaiter.waitForMessage(timeoutMs: 1500)
        #expect((message["requestId"] as? String) == "unit-test-1")
        #expect((message["reason"] as? String) == "test_wkwebview_smoke")
        #expect((message["ok"] as? Bool) == true)
    }
}
