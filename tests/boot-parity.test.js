const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const manifestConfig = require('../scripts/runtime-manifest.config.cjs');
const RuntimeManifestShared = require('../js/boot/runtime-manifest-shared.js');

test('runtime manifest parity helper validates generated runtime order', () => {
    const manifest = RuntimeManifestShared.normalizeManifest({
        BASE_RUNTIME_FILES: manifestConfig.BASE_RUNTIME_FILES,
        GAME_RUNTIME_FILES: manifestConfig.GAME_RUNTIME_FILES,
        UI_RUNTIME_FILES: manifestConfig.UI_RUNTIME_FILES,
        MINIGAME_RUNTIME_FILES: manifestConfig.MINIGAME_RUNTIME_FILES,
        COMPETITION_RUNTIME_FILES: manifestConfig.COMPETITION_RUNTIME_FILES,
        RUNTIME_SCRIPT_FILES: []
            .concat(manifestConfig.BASE_RUNTIME_FILES)
            .concat(manifestConfig.GAME_RUNTIME_FILES)
            .concat(manifestConfig.UI_RUNTIME_FILES)
            .concat(manifestConfig.MINIGAME_RUNTIME_FILES)
            .concat(manifestConfig.COMPETITION_RUNTIME_FILES)
    });

    const report = RuntimeManifestShared.assertRuntimeManifestParity(manifest, {
        mode: 'test',
        expectedRuntimeOrder: RuntimeManifestShared.flattenRuntimeFiles(manifest)
    });
    assert.equal(report.ok, true);
    assert.equal(report.diffIndex, -1);
});

test('runtime manifest parity helper throws on mismatch in assertion mode', () => {
    const manifest = RuntimeManifestShared.normalizeManifest({
        BASE_RUNTIME_FILES: ['./a.js'],
        GAME_RUNTIME_FILES: [],
        UI_RUNTIME_FILES: [],
        MINIGAME_RUNTIME_FILES: [],
        COMPETITION_RUNTIME_FILES: [],
        RUNTIME_SCRIPT_FILES: ['./b.js']
    });

    assert.throws(
        () => RuntimeManifestShared.assertRuntimeManifestParity(manifest, {
            mode: 'test',
            expectedRuntimeOrder: RuntimeManifestShared.flattenRuntimeFiles(manifest)
        }),
        (err) => {
            assert.equal(err.name, 'RuntimeManifestParityError');
            assert.equal(err.report.diffIndex, 0);
            return true;
        }
    );
});

test('file-protocol bootstrap smoke test emits shared ready signals and loads runtime order', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const fileBootstrapSrc = fs.readFileSync(path.join(repoRoot, 'js/boot/file-runtime-bootstrap.js'), 'utf8');
    const sharedManifestSrc = fs.readFileSync(path.join(repoRoot, 'js/boot/runtime-manifest-shared.js'), 'utf8');
    const sharedBootstrapSrc = fs.readFileSync(path.join(repoRoot, 'js/boot/runtime-bootstrap-shared.js'), 'utf8');
    const classicManifestSrc = fs.readFileSync(path.join(repoRoot, 'js/config/runtime-manifest.classic.generated.js'), 'utf8');

    const events = [];
    const appendedScripts = [];
    const runtimeScriptsLoaded = [];
    const errors = [];

    const sandbox = {
        console: {
            log() {},
            info() {},
            warn() {},
            error(...args) { errors.push(args.map(String).join(' ')); }
        },
        URL,
        Set,
        Map,
        Promise,
        Date,
        Math,
        JSON,
        Array,
        String,
        Number,
        Object,
        Boolean,
        RegExp,
        Error,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        dismissSplashScreen() {},
        Event: function Event(type) { this.type = type; },
        CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init ? init.detail : undefined; },
        setTimeout(fn) { if (typeof fn === 'function') fn(); return 1; },
        clearTimeout() {},
        dispatchEvent(evt) { events.push({ type: evt && evt.type, detail: evt && evt.detail }); },
        __MLF_RUNTIME_ASSERT_PARITY__: true
    };

    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    sandbox.document = {
        baseURI: 'file:///App/Web/index.html',
        head: {
            appendChild(node) {
                appendedScripts.push(node.src);
                try {
                    const src = String(node.src || '');
                    if (src.endsWith('/js/boot/runtime-manifest-shared.js') || src === 'js/boot/runtime-manifest-shared.js') {
                        vm.runInContext(sharedManifestSrc, context, { filename: 'runtime-manifest-shared.js' });
                    } else if (src.endsWith('/js/boot/runtime-bootstrap-shared.js') || src === 'js/boot/runtime-bootstrap-shared.js') {
                        vm.runInContext(sharedBootstrapSrc, context, { filename: 'runtime-bootstrap-shared.js' });
                    } else if (src.endsWith('/js/config/runtime-manifest.classic.generated.js') || src === 'js/config/runtime-manifest.classic.generated.js') {
                        vm.runInContext(classicManifestSrc, context, { filename: 'runtime-manifest.classic.generated.js' });
                    } else if (src.indexOf('/js/') >= 0 || src.startsWith('js/')) {
                        runtimeScriptsLoaded.push(src);
                    }
                    if (typeof node.onload === 'function') node.onload();
                } catch (err) {
                    if (typeof node.onerror === 'function') node.onerror(err);
                }
            }
        },
        createElement(tagName) {
            return {
                tagName,
                async: true,
                src: '',
                onload: null,
                onerror: null,
                remove() {}
            };
        }
    };

    const context = vm.createContext(sandbox);
    vm.runInContext(fileBootstrapSrc, context, { filename: 'file-runtime-bootstrap.js' });

    for (let i = 0; i < 400; i++) {
        await Promise.resolve();
        if (sandbox.__MLF_RUNTIME_READY__ === true && sandbox.__MLF_ALL_RUNTIME_SCRIPTS_LOADED__ === true) break;
    }

    assert.equal(errors.length, 0, errors.join('\n'));
    assert.equal(sandbox.__MLF_RUNTIME_BOOTSTRAPPED__, true);
    assert.equal(sandbox.__MLF_ALL_RUNTIME_SCRIPTS_LOADED__, true);
    assert.equal(sandbox.__MLF_RUNTIME_READY__, true);
    assert.equal(events.map((evt) => evt.type).includes('mlf:runtime-scripts-loaded'), true);
    assert.equal(events.map((evt) => evt.type).includes('mlf:runtime-ready'), true);
    assert.equal(sandbox.__MLF_RUNTIME_BOOT_INFO__.bootPath, 'file');
    assert.equal(sandbox.__MLF_RUNTIME_BOOT_INFO__.manifestParityReport.ok, true);

    const manifestRuntimeCount = sandbox.MLFRuntimeManifest.RUNTIME_SCRIPT_FILES.length;
    assert.equal(runtimeScriptsLoaded.length, manifestRuntimeCount);
});
