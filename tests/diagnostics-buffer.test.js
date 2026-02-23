const test = require('node:test');
const assert = require('node:assert/strict');

const Diagnostics = require('../js/diagnostics/error-buffer.js');

test('MLFDiagnostics stores structured entries in a ring buffer', () => {
    Diagnostics._resetForTests();
    Diagnostics.configure({ persistenceEnabled: false });
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
    assert.equal(exportText.includes('My Little Friend Diagnostics'), true);
    assert.equal(exportText.includes('[NATIVE] [ERROR] Bridge timeout'), true);

    Diagnostics.setMaxEntries(100);
    Diagnostics._resetForTests();
});

test('MLFDiagnostics persists and restores recent entries with configurable storage', () => {
    const store = new Map();
    const storage = {
        getItem(key) { return store.has(key) ? store.get(key) : null; },
        setItem(key, value) { store.set(key, String(value)); }
    };

    Diagnostics._resetForTests();
    Diagnostics.configure({
        persistenceEnabled: true,
        storage,
        storageKey: 'diag-test',
        persistMaxEntries: 2
    });
    Diagnostics.log('SAVE', 'Saved once', { bytes: 10 });
    Diagnostics.warn('LOAD', 'Loaded with migration', { version: 1 });
    Diagnostics.error('UI', 'Dialog failed', { id: 'x' });
    assert.equal(Diagnostics.persistNow(), true);

    const persisted = JSON.parse(store.get('diag-test'));
    assert.equal(Array.isArray(persisted.entries), true);
    assert.equal(persisted.entries.length, 2);

    Diagnostics._resetForTests();
    Diagnostics.configure({
        persistenceEnabled: true,
        storage,
        storageKey: 'diag-test'
    });
    const restore = Diagnostics.restorePersisted();
    assert.equal(restore.restored, true);
    assert.equal(Diagnostics.getEntries().length, 2);
    assert.equal(Diagnostics.getEntries()[0].category, 'LOAD');
});

test('MLFDiagnostics report includes metadata provider fields', () => {
    Diagnostics._resetForTests();
    Diagnostics.configure({
        persistenceEnabled: false,
        metadataProvider: () => ({ appVersion: 'test-build', protocol: 'file:' })
    });
    Diagnostics.log('BOOT', 'Ready', { bootPath: 'file' });
    const text = Diagnostics.createSupportReportText({ context: 'unit-test' });
    assert.equal(text.includes('App Version: test-build'), true);
    assert.equal(text.includes('Protocol: file:'), true);
    assert.equal(text.includes('Context: unit-test'), true);
    Diagnostics._resetForTests();
});
