const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');
const CORRUPT_INVALID_JSON_FIXTURE = path.resolve(__dirname, 'fixtures/saves/corrupt-invalid-json.json');
const SAVE_KEY = 'myLittleFriend';

function contentTypeFor(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html': return 'text/html; charset=utf-8';
        case '.js': return 'application/javascript; charset=utf-8';
        case '.css': return 'text/css; charset=utf-8';
        case '.json': return 'application/json; charset=utf-8';
        case '.svg': return 'image/svg+xml';
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        case '.mp3': return 'audio/mpeg';
        case '.wav': return 'audio/wav';
        case '.woff': return 'font/woff';
        case '.woff2': return 'font/woff2';
        default: return 'application/octet-stream';
    }
}

function createStaticServer(rootDir) {
    const server = http.createServer((req, res) => {
        try {
            const requestPath = decodeURIComponent((req.url || '/').split('?')[0] || '/');
            const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
            let filePath = path.join(rootDir, normalized === '/' ? 'index.html' : normalized.replace(/^\//, ''));
            if (!filePath.startsWith(rootDir)) {
                res.writeHead(403).end('Forbidden');
                return;
            }
            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }
            if (!fs.existsSync(filePath)) {
                res.writeHead(404).end('Not found');
                return;
            }
            res.writeHead(200, {
                'Content-Type': contentTypeFor(filePath),
                'Cache-Control': 'no-store'
            });
            fs.createReadStream(filePath).pipe(res);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(String(err && err.message ? err.message : err));
        }
    });
    return {
        async start() {
            await new Promise((resolve, reject) => {
                server.once('error', reject);
                server.listen(0, '127.0.0.1', resolve);
            });
            const address = server.address();
            const port = address && typeof address === 'object' ? address.port : null;
            if (!port) throw new Error('Failed to start static test server.');
            return `http://127.0.0.1:${port}/index.html`;
        },
        async stop() {
            await new Promise((resolve) => server.close(() => resolve()));
        }
    };
}

async function waitForRuntimeReady(page) {
    await page.waitForFunction(() => window.__MLF_RUNTIME_READY__ === true, null, { timeout: 30000 });
}

async function seedStablePrefs(page) {
    await page.addInitScript(() => {
        const entries = {
            myLittleFriend_tutorialDone: 'true',
            myLittleFriend_reducedMotion: 'true',
            myLittleFriend_hapticOff: 'true',
            myLittleFriend_ttsOff: 'true',
            myLittleFriend_soundEnabled: 'false',
            myLittleFriend_musicEnabled: 'false',
            myLittleFriend_calmMode: 'true',
            myLittleFriend_firstRunA11yDefaultsV1: 'true'
        };
        Object.entries(entries).forEach(([key, value]) => {
            try { window.localStorage.setItem(key, value); } catch (_) {}
        });
    });
}

async function readSave(page) {
    const raw = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);
    assert.equal(typeof raw, 'string', 'expected save to exist in localStorage');
    return JSON.parse(raw);
}

async function tapEggFiveTimes(page) {
    const egg = page.locator('#egg-button');
    await egg.waitFor({ state: 'visible' });
    for (let i = 0; i < 5; i++) {
        await egg.tap();
        await page.waitForTimeout(240);
    }
}

async function hatchAndNamePet(page, name) {
    await tapEggFiveTimes(page);
    await page.locator('.naming-overlay').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#pet-name-input').fill(name);
    await page.locator('#naming-submit').tap();
    await page.locator('#core-feed-btn').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(
        (petName) => {
            const label = document.querySelector('.pet-name');
            return !!label && label.textContent && label.textContent.includes(petName);
        },
        name,
        { timeout: 10000 }
    );
}

async function performCareAction(page, buttonSelector) {
    const before = await readSave(page);
    await page.locator(buttonSelector).tap();
    await page.waitForTimeout(800);
    await page.locator('#save-indicator').waitFor({ state: 'attached', timeout: 5000 });
    const after = await readSave(page);
    assert.equal(Number.isInteger(after.saveSchemaVersion), true);
    assert.equal(after.saveSchemaVersion >= 1, true);
    assert.equal(Number(after.lastUpdate) >= Number(before.lastUpdate || 0), true);
    return { before, after };
}

async function playAndEndColoringMinigame(page) {
    const visibleMinigameButton = page.locator('#minigames-btn:visible');
    if (await visibleMinigameButton.count()) {
        await visibleMinigameButton.first().tap();
    } else {
        await page.evaluate(() => {
            if (typeof openMiniGamesMenu !== 'function') {
                throw new Error('openMiniGamesMenu is unavailable');
            }
            openMiniGamesMenu();
        });
    }
    await page.locator('.minigame-menu-overlay').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('.minigame-card[data-game="coloring"]').tap();
    await page.locator('.coloring-game-overlay').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('.coloring-swatch').first().tap();
    await page.locator('.coloring-region').first().tap();
    await page.locator('#coloring-done').tap();
    await page.locator('.minigame-summary-overlay').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('.minigame-summary-overlay [data-summary-close]').tap();
    await page.locator('.minigame-summary-overlay').waitFor({ state: 'detached', timeout: 10000 });
}

async function adoptAdditionalPet(page, name) {
    await page.locator('#new-pet-btn').tap();
    await page.locator('#modal-adopt').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#modal-adopt').tap();
    await page.locator('.adopt-banner').waitFor({ state: 'visible', timeout: 10000 });
    await hatchAndNamePet(page, name);
    await page.waitForFunction(() => document.querySelectorAll('.pet-tab').length >= 2, null, { timeout: 10000 });
}

test('mobile gameplay flow covers boot, hatch/adopt, care, minigame, and save/load recovery', async () => {
    const server = createStaticServer(REPO_ROOT);
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const url = await server.start();

    try {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true,
            userAgent: 'MLF-E2E/1.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
        });
        const page = await context.newPage();
        await seedStablePrefs(page);

        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(String(err && err.message ? err.message : err)));

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await waitForRuntimeReady(page);
        await page.locator('#egg-button').waitFor({ state: 'visible' });

        await hatchAndNamePet(page, 'Pixel');

        const careResult = await performCareAction(page, '#core-feed-btn');
        const beforeHunger = Number(careResult.before.pet && careResult.before.pet.hunger);
        const afterHunger = Number(careResult.after.pet && careResult.after.pet.hunger);
        assert.equal(Number.isFinite(beforeHunger) && Number.isFinite(afterHunger), true);
        assert.equal(afterHunger >= beforeHunger, true, 'feed action should not reduce hunger stat');

        await page.waitForTimeout(700);
        await performCareAction(page, '#core-play-btn');

        await playAndEndColoringMinigame(page);

        await adoptAdditionalPet(page, 'Comet');
        let savedPayload = await readSave(page);
        assert.equal(savedPayload.phase, 'pet');
        assert.equal(Array.isArray(savedPayload.pets), true);
        assert.equal(savedPayload.pets.length >= 2, true);
        assert.equal(Number.isInteger(savedPayload.saveSchemaVersion), true);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForRuntimeReady(page);
        await page.locator('#core-feed-btn').waitFor({ state: 'visible', timeout: 15000 });
        await page.waitForFunction(
            () => document.querySelectorAll('.pet-tab').length >= 2,
            null,
            { timeout: 15000 }
        );
        await page.waitForFunction(() => {
            const label = document.querySelector('.pet-name');
            return !!label && /Pixel|Comet/.test(label.textContent || '');
        }, null, { timeout: 10000 });

        savedPayload = await readSave(page);
        assert.equal(savedPayload.phase, 'pet');
        assert.equal(savedPayload.pets.length >= 2, true);
        assert.equal(savedPayload.pet && typeof savedPayload.pet === 'object', true);
        assert.equal(pageErrors.length, 0, `unexpected page errors:\n${pageErrors.join('\n')}`);

        await context.close();
    } finally {
        await browser.close();
        await server.stop();
    }
});

test('corrupted save shows calm recovery dialog and diagnostics export UI', async () => {
    const server = createStaticServer(REPO_ROOT);
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const url = await server.start();

    try {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            isMobile: true
        });
        const page = await context.newPage();
        const corruptSave = fs.readFileSync(CORRUPT_INVALID_JSON_FIXTURE, 'utf8');
        await seedStablePrefs(page);
        await page.addInitScript(([key, value]) => {
            try { window.localStorage.setItem(key, value); } catch (_) {}
        }, [SAVE_KEY, corruptSave]);

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await waitForRuntimeReady(page);

        await page.locator('#save-recovery-overlay').waitFor({ state: 'visible', timeout: 15000 });
        await page.locator('#recovery-export-diagnostics').tap();
        await page.locator('#mlf-diagnostics-export-overlay').waitFor({ state: 'visible', timeout: 10000 });
        const reportText = await page.locator('#mlf-diagnostics-export-overlay textarea').inputValue();
        assert.equal(reportText.includes('My Little Friend Diagnostics'), true);
        assert.equal(reportText.includes('Context: save-recovery-dialog'), true);
        assert.equal(reportText.includes('Entries ('), true);

        await page.getByRole('button', { name: 'Close' }).tap();
        await page.locator('#mlf-diagnostics-export-overlay').waitFor({ state: 'detached', timeout: 10000 });
        await page.locator('#recovery-dismiss').tap();
        await page.locator('#save-recovery-overlay').waitFor({ state: 'detached', timeout: 10000 });

        await context.close();
    } finally {
        await browser.close();
        await server.stop();
    }
});
