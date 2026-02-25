const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStorage() {
    const data = new Map();
    return {
        getItem(key) { return data.has(key) ? data.get(key) : null; },
        setItem(key, value) { data.set(String(key), String(value)); },
        removeItem(key) { data.delete(String(key)); }
    };
}

function createSandbox() {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/audio/audio-manifest.json'), 'utf8'));
    const credits = { items: [] };
    const listeners = {};
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        localStorage: createStorage(),
        fetch: async (pathname) => ({
            ok: true,
            async json() {
                if (String(pathname).includes('audio-credits')) return credits;
                return manifest;
            }
        }),
        CustomEvent: function CustomEvent(type, init) {
            this.type = type;
            this.detail = init && init.detail;
        },
        Audio: function FakeAudio(src) {
            this.src = src || '';
            this.currentSrc = src || '';
            this.preload = 'auto';
            this.volume = 1;
            this.muted = false;
            this.loop = false;
            this.currentTime = 0;
            this._listeners = {};
        },
        document: {
            hidden: false,
            addEventListener() {},
            removeEventListener() {}
        }
    };
    sandbox.Audio.prototype.setAttribute = function () {};
    sandbox.Audio.prototype.load = function () {};
    sandbox.Audio.prototype.pause = function () {};
    sandbox.Audio.prototype.addEventListener = function (type, fn) {
        this._listeners[type] = fn;
    };
    sandbox.Audio.prototype.play = function () {
        return Promise.resolve();
    };

    sandbox.window = sandbox;
    sandbox.window.addEventListener = function (type, fn) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
    };
    sandbox.window.removeEventListener = function (type, fn) {
        if (!listeners[type]) return;
        listeners[type] = listeners[type].filter((entry) => entry !== fn);
    };
    sandbox.window.dispatchEvent = function () { return true; };
    sandbox.window.matchMedia = function () { return { matches: false }; };
    sandbox.window.Audio = sandbox.Audio;
    sandbox.window.performance = { now: () => Date.now() };
    sandbox.listeners = listeners;
    vm.createContext(sandbox);
    const src = fs.readFileSync(path.join(__dirname, '..', 'js/audio/audio-manager.js'), 'utf8');
    vm.runInContext(src, sandbox, { filename: 'js/audio/audio-manager.js' });
    return sandbox;
}

test('audio manager scene planner produces layered music and ambient slots for minigames', async () => {
    const sandbox = createSandbox();
    const { GameAudio } = sandbox;
    await GameAudio.getManifest();
    GameAudio.updateSceneAudioContext({
        roomId: 'garden',
        timeOfDay: 'night',
        activity: 'minigame',
        minigame: 'rhythm',
        intensity: 0.65
    }, { forceRefresh: false });

    const plan = GameAudio.__debug.getSceneLayerPlan();
    assert.equal(Array.isArray(plan.ambient), true);
    assert.equal(Array.isArray(plan.music), true);
    assert.equal(plan.ambient.length, 2);
    assert.equal(plan.music.length, 2);
    assert.equal(plan.ambient[0].slotKey, 'ambient:base');
    assert.equal(plan.music[0].slotKey, 'music:base');
    assert.ok(plan.ambient[0].sound, 'ambient base layer should have a loop');
    assert.ok(plan.music[0].sound, 'music base layer should have a loop');
    assert.ok(plan.music[1].sound, 'music detail layer should activate for high-intensity rhythm');
});

test('audio manager ducking profile reduces and restores background mix multipliers', async () => {
    const sandbox = createSandbox();
    const { GameAudio } = sandbox;
    await GameAudio.getManifest();

    assert.equal(GameAudio.__debug.getRuntimeChannelMixMultiplier('music'), 1);
    assert.equal(GameAudio.__debug.getRuntimeChannelMixMultiplier('ambient'), 1);

    GameAudio.__debug.applyMixDuckProfile('reward', { holdMs: 1, releaseMs: 5 });
    assert.ok(GameAudio.__debug.getRuntimeChannelMixMultiplier('music') < 1);
    assert.ok(GameAudio.__debug.getRuntimeChannelMixMultiplier('ambient') < 1);

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(GameAudio.__debug.getRuntimeChannelMixMultiplier('music'), 1);
    assert.equal(GameAudio.__debug.getRuntimeChannelMixMultiplier('ambient'), 1);
});

test('audio manager accessibility legend includes upgraded gameplay status cues', async () => {
    const sandbox = createSandbox();
    const { GameAudio } = sandbox;
    await GameAudio.getManifest();
    const legend = GameAudio.getAccessibilityCueLegend();
    const ids = new Set(legend.map((cue) => cue.id));
    assert.ok(ids.has('cooldownComplete'));
    assert.ok(ids.has('actionAvailable'));
    assert.ok(ids.has('statusImportant'));
    assert.ok(ids.has('simonPad'));
    assert.ok(ids.has('rhythmBeatAccent'));
});

test('audio manager unlock is idempotent and removes first-interaction listeners after success', async () => {
    const sandbox = createSandbox();
    const { GameAudio } = sandbox;
    let loadCalls = 0;
    sandbox.Audio.prototype.load = function () { loadCalls += 1; };

    await GameAudio.init();
    assert.ok((sandbox.listeners.pointerdown || []).length > 0);
    assert.equal(sandbox.listeners.pagehide, undefined);

    await GameAudio.unlock();
    const afterFirstUnlockLoads = loadCalls;
    assert.equal((sandbox.listeners.pointerdown || []).length, 0);
    assert.equal((sandbox.listeners.touchstart || []).length, 0);

    await GameAudio.unlock();
    assert.equal(loadCalls, afterFirstUnlockLoads);
});
