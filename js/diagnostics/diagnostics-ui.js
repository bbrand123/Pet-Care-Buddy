(function initMLFDiagnosticsUI(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFDiagnosticsUI = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFDiagnosticsUI() {
    'use strict';

    function getDiagnostics() {
        if (typeof MLFDiagnostics !== 'undefined' && MLFDiagnostics) return MLFDiagnostics;
        return null;
    }

    function getDocument() {
        if (typeof document !== 'undefined') return document;
        return null;
    }

    function buildDiagnosticsReportText(options) {
        const diagnostics = getDiagnostics();
        if (!diagnostics || typeof diagnostics.createSupportReportText !== 'function') {
            return 'Diagnostics unavailable.';
        }
        return diagnostics.createSupportReportText(options || null);
    }

    async function copyText(text) {
        const value = String(text || '');
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(value);
                return true;
            }
        } catch (_) {}
        const doc = getDocument();
        if (!doc) return false;
        const textarea = doc.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        doc.body.appendChild(textarea);
        textarea.select();
        let ok = false;
        try {
            ok = typeof doc.execCommand === 'function' ? !!doc.execCommand('copy') : false;
        } catch (_) {
            ok = false;
        }
        textarea.remove();
        return ok;
    }

    function removeExistingDialog(doc) {
        const existing = doc.getElementById('mlf-diagnostics-export-overlay');
        if (existing) existing.remove();
    }

    function openDiagnosticsExportDialog(options) {
        const doc = getDocument();
        if (!doc || !doc.body) return null;
        removeExistingDialog(doc);

        const opts = (options && typeof options === 'object') ? options : {};
        const reportText = buildDiagnosticsReportText(opts);

        const overlay = doc.createElement('div');
        overlay.id = 'mlf-diagnostics-export-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'mlf-diagnostics-export-title');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '9999';
        overlay.style.background = 'rgba(17, 21, 28, 0.72)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '16px';

        const panel = doc.createElement('div');
        panel.style.width = 'min(720px, 100%)';
        panel.style.maxHeight = '85vh';
        panel.style.overflow = 'auto';
        panel.style.background = '#fff';
        panel.style.borderRadius = '14px';
        panel.style.boxShadow = '0 16px 48px rgba(0,0,0,0.28)';
        panel.style.padding = '16px';

        const title = doc.createElement('h2');
        title.id = 'mlf-diagnostics-export-title';
        title.textContent = 'Diagnostics Report';
        title.style.margin = '0 0 8px 0';

        const description = doc.createElement('p');
        description.textContent = 'Copy this report when contacting support. It includes runtime, save, and recent error details.';
        description.style.margin = '0 0 10px 0';
        description.style.fontSize = '0.95rem';

        const textarea = doc.createElement('textarea');
        textarea.value = reportText;
        textarea.setAttribute('readonly', 'true');
        textarea.setAttribute('aria-label', 'Diagnostics report text');
        textarea.style.width = '100%';
        textarea.style.minHeight = '280px';
        textarea.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
        textarea.style.fontSize = '12px';
        textarea.style.lineHeight = '1.4';
        textarea.style.border = '1px solid #d7dde5';
        textarea.style.borderRadius = '10px';
        textarea.style.padding = '10px';
        textarea.style.boxSizing = 'border-box';
        textarea.style.background = '#fbfcfe';

        const status = doc.createElement('div');
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.style.minHeight = '20px';
        status.style.marginTop = '8px';
        status.style.fontSize = '0.85rem';
        status.style.color = '#334155';

        const actions = doc.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.marginTop = '12px';
        actions.style.flexWrap = 'wrap';

        const copyBtn = doc.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = 'Copy Diagnostics';
        copyBtn.style.padding = '10px 14px';
        copyBtn.style.borderRadius = '10px';
        copyBtn.style.border = 'none';
        copyBtn.style.background = '#2563EB';
        copyBtn.style.color = '#fff';
        copyBtn.style.fontWeight = '600';

        const closeBtn = doc.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = 'Close';
        closeBtn.style.padding = '10px 14px';
        closeBtn.style.borderRadius = '10px';
        closeBtn.style.border = '1px solid #cbd5e1';
        closeBtn.style.background = '#fff';
        closeBtn.style.color = '#0f172a';
        closeBtn.style.fontWeight = '600';

        function closeDialog() {
            overlay.remove();
        }

        copyBtn.addEventListener('click', function() {
            copyText(textarea.value).then(function(ok) {
                status.textContent = ok ? 'Diagnostics copied.' : 'Copy failed. Select the text and copy manually.';
            });
        });
        closeBtn.addEventListener('click', closeDialog);
        overlay.addEventListener('click', function(evt) {
            if (evt.target === overlay) closeDialog();
        });

        actions.appendChild(copyBtn);
        actions.appendChild(closeBtn);
        panel.appendChild(title);
        panel.appendChild(description);
        panel.appendChild(textarea);
        panel.appendChild(status);
        panel.appendChild(actions);
        overlay.appendChild(panel);
        doc.body.appendChild(overlay);
        try { textarea.focus(); textarea.select(); } catch (_) {}
        return overlay;
    }

    const api = Object.freeze({
        buildDiagnosticsReportText,
        copyText,
        openDiagnosticsExportDialog
    });

    if (typeof globalThis !== 'undefined') {
        globalThis.openDiagnosticsReport = function(options) {
            return api.openDiagnosticsExportDialog(options || null);
        };
    }

    return api;
});
