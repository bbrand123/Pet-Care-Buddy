(function initMLFSaveRecoveryUI(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFSaveRecoveryUI = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFSaveRecoveryUI() {
    'use strict';

    function buildRecoveryDialogHTML() {
        return (
            '<div class="modal-content" style="max-width:320px;text-align:center;">' +
                '<h2 style="margin-bottom:12px;">Save Data Issue</h2>' +
                '<p style="margin-bottom:16px;font-size:0.9rem;">We could not safely read your save data. You can start fresh, or export diagnostics first to help support troubleshoot what happened.</p>' +
                '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
                    '<button id="recovery-export-diagnostics" style="padding:10px 18px;border:1px solid #90CAF9;border-radius:8px;background:#E3F2FD;color:#0D47A1;cursor:pointer;font-weight:600;font-family:inherit;">Export Diagnostics</button>' +
                    '<button id="recovery-fresh" style="padding:10px 18px;border:none;border-radius:8px;background:#EF5350;color:white;cursor:pointer;font-weight:600;font-family:inherit;">Start Fresh</button>' +
                    '<button id="recovery-dismiss" style="padding:10px 18px;border:1px solid #ccc;border-radius:8px;background:white;cursor:pointer;font-weight:600;font-family:inherit;">Try Continue</button>' +
                '</div>' +
            '</div>'
        );
    }

    function safeCall(fn) {
        if (typeof fn !== 'function') return;
        try { fn(); } catch (e) {}
    }

    function showSaveRecoveryDialog(options) {
        const opts = options && typeof options === 'object' ? options : {};
        const loadError = opts.error || null;
        if (!loadError) return { shown: false, reason: 'no-error' };

        const documentRef = opts.documentRef || (typeof document !== 'undefined' ? document : null);
        if (!documentRef || typeof documentRef.createElement !== 'function') {
            return { shown: false, reason: 'no-document' };
        }
        if (typeof documentRef.getElementById === 'function' && documentRef.getElementById('save-recovery-overlay')) {
            return { shown: false, reason: 'already-open' };
        }

        const overlay = documentRef.createElement('div');
        overlay.id = 'save-recovery-overlay';
        overlay.className = 'modal-overlay';
        if (typeof overlay.setAttribute === 'function') {
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Save data corrupted');
        }
        overlay.innerHTML = buildRecoveryDialogHTML();

        if (!documentRef.body || typeof documentRef.body.appendChild !== 'function') {
            return { shown: false, reason: 'no-body' };
        }
        documentRef.body.appendChild(overlay);

        const diagnostics = opts.diagnostics;
        if (diagnostics && typeof diagnostics.error === 'function') {
            diagnostics.error('UI', 'Save recovery dialog displayed after load failure.', {
                error: String(loadError && loadError.message ? loadError.message : loadError)
            });
        }

        const exportBtn = typeof documentRef.getElementById === 'function'
            ? documentRef.getElementById('recovery-export-diagnostics')
            : null;
        if (exportBtn && typeof exportBtn.addEventListener === 'function') {
            exportBtn.addEventListener('click', function onExportDiagnostics() {
                try {
                    if (opts.diagnosticsUI && typeof opts.diagnosticsUI.openDiagnosticsExportDialog === 'function') {
                        opts.diagnosticsUI.openDiagnosticsExportDialog({ context: 'save-recovery-dialog' });
                        return;
                    }
                    if (typeof opts.openDiagnosticsReport === 'function') {
                        opts.openDiagnosticsReport({ context: 'save-recovery-dialog' });
                    }
                } catch (e) {}
            });
        }

        const freshBtn = typeof documentRef.getElementById === 'function'
            ? documentRef.getElementById('recovery-fresh')
            : null;
        if (freshBtn && typeof freshBtn.addEventListener === 'function') {
            freshBtn.addEventListener('click', function onStartFresh() {
                try {
                    const storageRef = opts.localStorageRef || (typeof localStorage !== 'undefined' ? localStorage : null);
                    const storageKey = opts.storageKey;
                    if (storageRef && storageKey) {
                        storageRef.removeItem(storageKey);
                    }
                } catch (e) {}
                safeCall(opts.onStartFreshReset);
                safeCall(opts.suppressUnloadAutosaveForReload);
                if (typeof overlay.remove === 'function') {
                    overlay.remove();
                }
                const reloadLocation = opts.reloadLocation || (typeof location !== 'undefined' ? location : null);
                if (reloadLocation && typeof reloadLocation.reload === 'function') {
                    reloadLocation.reload();
                }
            });
        }

        const dismissBtn = typeof documentRef.getElementById === 'function'
            ? documentRef.getElementById('recovery-dismiss')
            : null;
        if (dismissBtn && typeof dismissBtn.addEventListener === 'function') {
            dismissBtn.addEventListener('click', function onDismiss() {
                if (typeof overlay.remove === 'function') {
                    overlay.remove();
                }
                safeCall(opts.onDismiss);
            });
        }

        if (typeof opts.announce === 'function') {
            opts.announce('Save data may be corrupted. A recovery dialog is available.', true);
        }

        return { shown: true, overlayId: overlay.id };
    }

    return Object.freeze({
        buildRecoveryDialogHTML,
        showSaveRecoveryDialog
    });
});
