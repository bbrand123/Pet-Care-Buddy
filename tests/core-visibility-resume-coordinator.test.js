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
