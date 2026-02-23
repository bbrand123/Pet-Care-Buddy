const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifestConfig = require('../scripts/runtime-manifest.config.cjs');

const LEGACY_MONOLITHS = Object.freeze([
    'js/game.js',
    'js/ui.js',
    'js/minigames.js'
]);

function readRepoFile(relativePath) {
    return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

function flattenRuntimeConfigFiles() {
    return []
        .concat(manifestConfig.BASE_RUNTIME_FILES)
        .concat(manifestConfig.GAME_RUNTIME_FILES)
        .concat(manifestConfig.UI_RUNTIME_FILES)
        .concat(manifestConfig.MINIGAME_RUNTIME_FILES)
        .concat(manifestConfig.COMPETITION_RUNTIME_FILES)
        .concat(manifestConfig.RUNTIME_BOOT_FILES);
}

test('legacy monolith files are clearly marked as archived', () => {
    for (const file of LEGACY_MONOLITHS) {
        const contents = readRepoFile(file);
        assert.match(contents, /LEGACY MONOLITH ARCHIVE \(DO NOT EDIT FOR PRODUCTION CHANGES\)/);
    }
});

test('runtime manifest config and generated manifests exclude legacy monolith files', () => {
    const runtimeConfigFiles = flattenRuntimeConfigFiles();
    const generatedModuleManifest = readRepoFile('js/config/runtime-manifest.generated.js');
    const generatedClassicManifest = readRepoFile('js/config/runtime-manifest.classic.generated.js');
    const swAssets = readRepoFile('sw-assets.generated.js');

    for (const legacyPath of LEGACY_MONOLITHS) {
        const runtimeRelative = `./${legacyPath.replace(/^js\//, '')}`;
        const swRelative = `./${legacyPath}`;

        assert.equal(runtimeConfigFiles.includes(runtimeRelative), false, `${runtimeRelative} must not be in runtime manifest config lists`);
        assert.equal(manifestConfig.EXCLUDE_ASSET_PATHS.has(legacyPath), true, `${legacyPath} must be in EXCLUDE_ASSET_PATHS`);

        assert.equal(generatedModuleManifest.includes(runtimeRelative), false, `${runtimeRelative} must not be in generated module runtime manifest`);
        assert.equal(generatedClassicManifest.includes(runtimeRelative), false, `${runtimeRelative} must not be in generated classic runtime manifest`);
        assert.equal(swAssets.includes(swRelative), false, `${swRelative} must not be in generated sw assets`);
    }
});
