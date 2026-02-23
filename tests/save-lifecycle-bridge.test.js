const test = require('node:test');
const assert = require('node:assert/strict');

const LifecycleBridge = require('../js/save/lifecycle-bridge.js');

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('saveNowForLifecycle calls registered save handler and returns success', async () => {
    LifecycleBridge._resetForTests();
    let callCount = 0;
    const nativePosts = [];
    const diagEntries = [];

    LifecycleBridge.setNativeResultTransport((payload) => nativePosts.push(payload));
    LifecycleBridge.setDiagnosticsReporter((entry) => diagEntries.push(entry));
    LifecycleBridge.setSaveHandler((meta) => {
        callCount += 1;
        assert.equal(meta.source, 'lifecycle');
        assert.equal(meta.silentIndicator, true);
        return { ok: true, source: 'lifecycle', metaSeen: meta.reason };
    });

    const result = await LifecycleBridge.saveNowForLifecycle('app_did_enter_background');
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'app_did_enter_background');
    assert.equal(callCount, 1);
    assert.equal(nativePosts.length, 0);
    assert.equal(diagEntries.some((entry) => entry.category === 'SAVE'), true);
});

test('requestSave coalesces concurrent calls and posts both callbacks', async () => {
    LifecycleBridge._resetForTests();
    let callCount = 0;
    const nativePosts = [];

    LifecycleBridge.setNativeResultTransport((payload) => nativePosts.push(payload));
    LifecycleBridge.configure({ debounceMs: 0 });
    LifecycleBridge.setSaveHandler(async () => {
        callCount += 1;
        await delay(15);
        return { ok: true };
    });

    await Promise.all([
        LifecycleBridge.requestSave({ requestId: 'reqA', reason: 'inactive' }),
        LifecycleBridge.requestSave({ requestId: 'reqB', reason: 'background' })
    ]);

    assert.equal(callCount, 1);
    assert.equal(nativePosts.length, 2);
    assert.equal(nativePosts.some((payload) => payload.requestId === 'reqA' && payload.ok === true), true);
    assert.equal(nativePosts.some((payload) => payload.requestId === 'reqB' && payload.ok === true), true);
});

test('bridge debounces rapid lifecycle saves after completion', async () => {
    LifecycleBridge._resetForTests();
    let callCount = 0;

    LifecycleBridge.configure({ debounceMs: 200 });
    LifecycleBridge.setSaveHandler(() => {
        callCount += 1;
        return { ok: true };
    });

    const first = await LifecycleBridge.requestSave({ requestId: 'req1', reason: 'inactive', force: false });
    const second = await LifecycleBridge.requestSave({ requestId: 'req2', reason: 'background', force: false });

    assert.equal(first.accepted, true);
    assert.equal(second.accepted, true);
    assert.equal(callCount, 1);
});

test('bridge reports lifecycle save failures to native callback transport', async () => {
    LifecycleBridge._resetForTests();
    const nativePosts = [];
    LifecycleBridge.setNativeResultTransport((payload) => nativePosts.push(payload));
    LifecycleBridge.setSaveHandler(() => {
        throw new Error('disk full');
    });

    await LifecycleBridge.requestSave({ requestId: 'req_fail', reason: 'background' });
    assert.equal(nativePosts.length, 1);
    assert.equal(nativePosts[0].ok, false);
    assert.equal(String(nativePosts[0].error.message).includes('disk full'), true);
});
