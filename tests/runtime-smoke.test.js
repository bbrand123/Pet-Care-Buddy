const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const manifestConfig = require('../scripts/runtime-manifest.config.cjs');

test('generated runtime manifest script runs and excludes monolith runtime files', () => {
    execFileSync(process.execPath, ['scripts/generate-runtime-manifests.cjs'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe'
    });

    const swAssets = fs.readFileSync(path.resolve(__dirname, '../sw-assets.generated.js'), 'utf8');
    assert.equal(swAssets.includes('./js/game.js'), false);
    assert.equal(swAssets.includes('./js/ui.js'), false);
    assert.equal(swAssets.includes('./js/minigames.js'), false);
    assert.equal(swAssets.includes('./js/main.js'), true);

    const runtimeGroups = []
        .concat(manifestConfig.BASE_RUNTIME_FILES)
        .concat(manifestConfig.GAME_RUNTIME_FILES)
        .concat(manifestConfig.UI_RUNTIME_FILES)
        .concat(manifestConfig.MINIGAME_RUNTIME_FILES)
        .concat(manifestConfig.COMPETITION_RUNTIME_FILES);
    assert.equal(runtimeGroups.includes('./domain/economy/economy-calculations.js'), true);
});
