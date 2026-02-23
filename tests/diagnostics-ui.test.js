const test = require('node:test');
const assert = require('node:assert/strict');

const Diagnostics = require('../js/diagnostics/error-buffer.js');
const DiagnosticsUI = require('../js/diagnostics/diagnostics-ui.js');

test('Diagnostics UI builds report text from diagnostics buffer', () => {
    const previous = global.MLFDiagnostics;
    global.MLFDiagnostics = Diagnostics;
    Diagnostics._resetForTests();
    Diagnostics.configure({ persistenceEnabled: false });
    Diagnostics.log('BOOT', 'Boot ok', { path: 'module' });
    const text = DiagnosticsUI.buildDiagnosticsReportText({ context: 'support' });
    assert.equal(text.includes('Diagnostics'), true);
    assert.equal(text.includes('[BOOT] [INFO] Boot ok'), true);
    if (previous === undefined) {
        delete global.MLFDiagnostics;
    } else {
        global.MLFDiagnostics = previous;
    }
});

test('Diagnostics UI copyText uses clipboard API when available', async () => {
    const hadNavigator = Object.prototype.hasOwnProperty.call(global, 'navigator');
    const originalNavigator = global.navigator;
    let copied = null;
    Object.defineProperty(global, 'navigator', {
        configurable: true,
        writable: true,
        value: {
        clipboard: {
            writeText(value) {
                copied = value;
                return Promise.resolve();
            }
        }
        }
    });

    try {
        const ok = await DiagnosticsUI.copyText('hello');
        assert.equal(ok, true);
        assert.equal(copied, 'hello');
    } finally {
        if (hadNavigator) {
            Object.defineProperty(global, 'navigator', { configurable: true, writable: true, value: originalNavigator });
        } else {
            delete global.navigator;
        }
    }
});
