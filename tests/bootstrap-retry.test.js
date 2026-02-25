const test = require('node:test');
const assert = require('node:assert/strict');

const BootstrapCoordinator = require('../js/core/bootstrap-coordinator.js');
const RuntimeBootstrapShared = require('../js/boot/runtime-bootstrap-shared.js');

test('bootstrap coordinator allows retry when onBoot throws', () => {
    let calls = 0;
    const coordinator = BootstrapCoordinator.createBootstrapCoordinator({
        onBoot() {
            calls += 1;
            if (calls === 1) throw new Error('boot failed');
        }
    });

    assert.throws(() => coordinator.boot(), /boot failed/);
    assert.equal(coordinator.hasStarted(), false);
    assert.equal(coordinator.boot(), true);
    assert.equal(coordinator.hasStarted(), true);
    assert.equal(calls, 2);
});

test('runtime bootstrap shared rolls back bootstrapped flag after failed run and permits retry', async () => {
    const globalObj = {
        dispatchEvent() {}
    };

    await assert.rejects(async () => {
        await RuntimeBootstrapShared.runRuntimeBoot({
            global: globalObj,
            bootPath: 'test',
            loadRuntimeScripts: async () => {
                throw new Error('load failed');
            },
            onError() {}
        });
    }, /load failed/);

    assert.equal(globalObj.__MLF_RUNTIME_BOOTSTRAPPED__, false);
    assert.equal(globalObj.__MLF_RUNTIME_READY__, false);

    const retry = await RuntimeBootstrapShared.runRuntimeBoot({
        global: globalObj,
        bootPath: 'test',
        loadRuntimeScripts: async () => ({ runtimeScriptFiles: [] })
    });

    assert.equal(retry.bootPath, 'test');
    assert.equal(globalObj.__MLF_RUNTIME_BOOTSTRAPPED__, true);
    assert.equal(globalObj.__MLF_RUNTIME_READY__, true);
});
