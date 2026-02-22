#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function noop() {}

function makeStubElement() {
    return {
        style: {},
        dataset: {},
        classList: {
            add: noop,
            remove: noop,
            toggle: noop,
            contains: () => false
        },
        children: [],
        innerHTML: '',
        textContent: '',
        value: '',
        checked: false,
        disabled: false,
        open: false,
        content: { firstElementChild: null },
        appendChild: noop,
        removeChild: noop,
        replaceChildren: noop,
        setAttribute: noop,
        getAttribute: () => null,
        removeAttribute: noop,
        addEventListener: noop,
        removeEventListener: noop,
        querySelector: () => null,
        querySelectorAll: () => [],
        contains: () => false,
        closest: () => null,
        focus: noop,
        blur: noop,
        click: noop,
        showModal: noop,
        close: noop,
        getContext: () => null,
        getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 })
    };
}

function createVmContext() {
    const storage = new Map();
    const localStorage = {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(String(key), String(value)); },
        removeItem(key) { storage.delete(String(key)); },
        clear() { storage.clear(); }
    };

    const body = makeStubElement();
    const document = {
        body,
        activeElement: body,
        hidden: false,
        visibilityState: 'visible',
        createElement: () => makeStubElement(),
        createTextNode: (text) => ({ textContent: String(text) }),
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener: noop,
        removeEventListener: noop,
        contains: () => false
    };

    const context = {
        console,
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Error,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Promise,
        Intl,
        URL,
        URLSearchParams,
        parseInt,
        parseFloat,
        isFinite,
        isNaN,
        setTimeout: noop,
        clearTimeout: noop,
        setInterval: noop,
        clearInterval: noop,
        requestAnimationFrame: () => 0,
        cancelAnimationFrame: noop,
        performance: { now: () => 0 },
        navigator: { language: 'en-US', userAgent: 'node', onLine: true },
        location: { href: 'http://localhost/', search: '', hash: '' },
        document,
        localStorage,
        sessionStorage: localStorage,
        crypto: {
            getRandomValues(arr) {
                if (!arr || typeof arr.length !== 'number') return arr;
                for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
                return arr;
            }
        },
        matchMedia: () => ({
            matches: false,
            addEventListener: noop,
            removeEventListener: noop,
            addListener: noop,
            removeListener: noop
        }),
        Audio: function Audio() {
            return {
                play: () => Promise.resolve(),
                pause: noop,
                cloneNode() { return this; },
                currentTime: 0,
                volume: 1
            };
        },
        Image: function Image() { return makeStubElement(); },
        HTMLElement: function HTMLElement() {},
        Node: function Node() {},
        CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
        alert: noop,
        confirm: () => true,
        prompt: () => null,
        fetch: async () => ({ ok: true, json: async () => ({}), text: async () => '' })
    };

    context.window = context;
    context.globalThis = context;
    context.self = context;
    return vm.createContext(context);
}

function runScriptInContext(context, relPath) {
    const code = read(relPath);
    vm.runInContext(code, context, { filename: relPath });
}

function summarizeRotation(sequence) {
    let immediateRepeats = 0;
    for (let i = 1; i < sequence.length; i++) {
        if (sequence[i] === sequence[i - 1]) immediateRepeats++;
    }
    return {
        total: sequence.length,
        unique: new Set(sequence).size,
        immediateRepeats
    };
}

function runRotationSmoke(context) {
    const state = {};
    const results = [];
    const push = (label, pool, opts) => {
        const items = Array.isArray(pool) ? pool.filter(Boolean) : [];
        if (!items.length) {
            results.push({ label, skipped: true, reason: 'empty pool' });
            return;
        }
        const seq = [];
        for (let i = 0; i < 12; i++) {
            const choice = context.chooseRotatingContentWithHistory(items, Object.assign({
                scope: 'smoke',
                key: label,
                state,
                recentWindow: 3,
                idKey: 'id'
            }, opts || {}));
            const id = choice && (choice.id || choice.name || choice.prompt || choice.text || choice);
            seq.push(String(id));
        }
        results.push(Object.assign({ label }, summarizeRotation(seq), { sample: seq.slice(0, 6) }));
    };

    push('trivia', context.getPackTriviaQuestions ? context.getPackTriviaQuestions([]) : []);
    push('matching', context.getPackMatchingDecks ? context.getPackMatchingDecks([]) : []);
    const cookingCatalog = context.getPackCookingRecipes ? context.getPackCookingRecipes([]) : null;
    push('cooking', cookingCatalog && Array.isArray(cookingCatalog.recipes) ? cookingCatalog.recipes : []);
    push('fishing', context.getPackFishingCatches ? context.getPackFishingCatches([]) : []);
    push('coloring', context.getPackColoringTemplates ? context.getPackColoringTemplates([]) : []);
    push('tournament-rivals', context.getPackTournamentRivals ? context.getPackTournamentRivals([]).map((name, idx) => ({ id: `${name}_${idx}`, name })) : [], { idKey: 'name' });

    const bosses = context.getContentPackItems ? context.getContentPackItems('bosses') : [];
    const rivals = context.getContentPackItems ? context.getContentPackItems('rivals') : [];
    push('bosses', bosses);
    push('rivals', rivals);

    const biomeEvents = context.getPackedBiomeEvents ? context.getPackedBiomeEvents('event', 'forest') : [];
    const biomeLootTables = context.getPackedBiomeLootWeights ? context.getPackedBiomeLootWeights() : {};
    push('forest-events', biomeEvents);
    push('forest-loot', biomeLootTables && biomeLootTables.forest && Array.isArray(biomeLootTables.forest.entries) ? biomeLootTables.forest.entries : []);

    const flavorSeq = [];
    if (typeof context.getBreedingFlavorLine === 'function') {
        for (let i = 0; i < 12; i++) {
            flavorSeq.push(String(context.getBreedingFlavorLine({
                state,
                isHybrid: true,
                hasMutation: i % 2 === 0,
                petType: i % 3 === 0 ? 'reefkitty' : 'skyhound'
            }) || ''));
        }
        results.push(Object.assign({ label: 'breeding-flavor' }, summarizeRotation(flavorSeq), { sample: flavorSeq.slice(0, 4) }));
    }

    return results;
}

function main() {
    const context = createVmContext();

    runScriptInContext(context, 'js/constants.js');
    runScriptInContext(context, 'js/content-packs.js');
    runScriptInContext(context, 'js/data/packs/starter-packs.js');

    if (typeof context.validateContentPacks !== 'function') {
        throw new Error('validateContentPacks() was not registered');
    }

    const report = context.validateContentPacks({ log: false });
    const smoke = runRotationSmoke(context);

    const summary = {
        ok: report.ok,
        packs: report.packs,
        errorCount: report.errorCount,
        warningCount: report.warningCount,
        byType: report.byType
    };

    console.log('Content pack validation summary:');
    console.log(JSON.stringify(summary, null, 2));

    if (report.errors.length) {
        console.log('\nErrors:');
        report.errors.forEach((msg) => console.log(`- ${msg}`));
    }
    if (report.warnings.length) {
        console.log('\nWarnings:');
        report.warnings.forEach((msg) => console.log(`- ${msg}`));
    }

    console.log('\nRotation smoke (12 picks each):');
    smoke.forEach((entry) => {
        if (entry.skipped) {
            console.log(`- ${entry.label}: skipped (${entry.reason})`);
            return;
        }
        console.log(`- ${entry.label}: unique=${entry.unique}/${entry.total}, immediateRepeats=${entry.immediateRepeats}, sample=${entry.sample.join(' | ')}`);
    });

    if (!report.ok) process.exit(1);
}

main();
