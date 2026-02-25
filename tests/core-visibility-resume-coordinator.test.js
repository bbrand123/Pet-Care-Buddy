const test = require('node:test');
const assert = require('node:assert/strict');

const VisibilityCoordinatorModule = require('../js/core/visibility-resume-coordinator.js');

test('visibility resume coordinator routes hidden/visible transitions to injected callbacks', () => {
    const calls = [];
    const coordinator = VisibilityCoordinatorModule.createVisibilityResumeCoordinator({
        onHidden(meta) {
            calls.push(['hidden', meta && meta.source]);
            return { saved: true };
        },
        onVisible(meta) {
            calls.push(['visible', meta && meta.source]);
            return { resumed: true };
        }
    });

    const hiddenDoc = { hidden: true };
    const visibleDoc = { hidden: false };
    const hiddenResult = coordinator.handleDocumentVisibilityChange(hiddenDoc, { source: 'test-hidden' });
    const visibleResult = coordinator.handleDocumentVisibilityChange(visibleDoc, { source: 'test-visible' });

    assert.equal(hiddenResult.saved, true);
    assert.equal(visibleResult.resumed, true);
    assert.deepEqual(calls, [
        ['hidden', 'test-hidden'],
        ['visible', 'test-visible']
    ]);
});

test('visibility resume coordinator guards against re-entrant visible handling', () => {
    let coordinator = null;
    const results = [];
    coordinator = VisibilityCoordinatorModule.createVisibilityResumeCoordinator({
        onVisible() {
            results.push('outer-visible');
            const nested = coordinator.onVisible({ source: 'nested' });
            results.push(nested && nested.reason);
            return { ok: true };
        }
    });

    const out = coordinator.onVisible({ source: 'outer' });
    assert.equal(out.ok, true);
    assert.deepEqual(results, ['outer-visible', 'resume-in-flight']);
});

test('visibility resume coordinator keeps re-entrancy guard active until async visible handler settles', async () => {
    let release = null;
    const releases = [];
    let callCount = 0;
    const coordinator = VisibilityCoordinatorModule.createVisibilityResumeCoordinator({
        onVisible() {
            callCount += 1;
            return new Promise((resolve) => {
                release = resolve;
                releases.push(resolve);
            });
        }
    });

    const first = coordinator.onVisible({ source: 'async-outer' });
    const nested = coordinator.onVisible({ source: 'async-nested' });
    assert.equal(typeof first.then, 'function');
    assert.deepEqual(nested, { skipped: true, reason: 'resume-in-flight' });
    assert.equal(callCount, 1);

    release({ ok: true });
    const resolved = await first;
    assert.equal(resolved.ok, true);

    const after = coordinator.onVisible({ source: 'after' });
    assert.equal(typeof after.then, 'function');
    releases.pop()({ ok: true });
    await after;
});
