const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let pwaModulePromise = null;
async function loadPwaModule() {
    if (!pwaModulePromise) {
        pwaModulePromise = import(pathToFileURL(path.resolve(__dirname, '../js/boot/pwa.js')).href);
    }
    return pwaModulePromise;
}

test('resolvePwaBootPolicy disables legacy PWA path by default unless explicitly enabled', async () => {
    const Pwa = await loadPwaModule();
    const policy = Pwa.resolvePwaBootPolicy({}, { location: { protocol: 'https:' } });
    assert.equal(policy.enabled, false);
    assert.equal(policy.protocolOk, true);
    assert.equal(policy.allowOfflineBanners, false);
});

test('initializePwa returns a skip result when legacy PWA support is disabled', async () => {
    const Pwa = await loadPwaModule();
    const result = Pwa.initializePwa({ enabled: false });
    assert.deepEqual(result, { skipped: true, reason: 'legacy-pwa-disabled' });
});
