const test = require('node:test');
const assert = require('node:assert/strict');

const Diagnostics = require('../js/diagnostics/error-buffer.js');

test('MLFDiagnostics stores structured entries in a ring buffer', () => {
    Diagnostics.clear();
    Diagnostics.setMaxEntries(3);

    Diagnostics.log('BOOT', 'Boot started', { step: 1 });
    Diagnostics.warn('SAVE', 'Slow save detected', { ms: 1200 });
    Diagnostics.error('NATIVE', 'Bridge timeout', { requestId: 'abc' });
    Diagnostics.log('UI', 'Toast shown', { id: 'x' });

    const entries = Diagnostics.getEntries();
    assert.equal(entries.length, 3);
    assert.equal(entries[0].category, 'SAVE');
    assert.equal(entries[1].category, 'NATIVE');
    assert.equal(entries[2].category, 'UI');
    assert.equal(entries[1].level, 'error');
    assert.equal(typeof entries[0].ts, 'string');

    const exportText = Diagnostics.exportPlainText();
    assert.equal(exportText.includes('[NATIVE] [ERROR] Bridge timeout'), true);

    Diagnostics.setMaxEntries(100);
    Diagnostics.clear();
});
