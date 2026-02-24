const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SaveSchema = require('../js/save/schema.js');
const SaveMigrations = require('../js/save/migrate.js');
const SaveMigrationRegistry = require('../js/save/migrations/registry.js');
const SaveMigrationV0ToV1 = require('../js/save/migrations/v0-to-v1.js');
const SaveMigrationV1ToV2 = require('../js/save/migrations/v1-to-v2.js');
const SaveMigrationV2ToV3 = require('../js/save/migrations/v2-to-v3.js');

const fixturesDir = path.resolve(__dirname, 'fixtures/saves');

function readFixture(name) {
    return fs.readFileSync(path.join(fixturesDir, name), 'utf8');
}

function parseFixtureJson(name) {
    return JSON.parse(readFixture(name));
}

test('save migration registry is ordered and includes v0->v1, v1->v2, and v2->v3', () => {
    const migrations = SaveMigrationRegistry.MIGRATIONS;
    assert.ok(Array.isArray(migrations));
    assert.equal(migrations.length >= 3, true);
    assert.equal(migrations[0].fromVersion, 0);
    assert.equal(migrations[0].toVersion, 1);
    assert.equal(migrations[1].fromVersion, 1);
    assert.equal(migrations[1].toVersion, 2);
    assert.equal(migrations[2].fromVersion, 2);
    assert.equal(migrations[2].toVersion, 3);
    assert.equal(migrations.some((migration) => migration.name === 'legacy-v0-to-v1'), true);
    assert.equal(migrations.some((migration) => migration.name === 'household-v1-to-v2'), true);
    assert.equal(migrations.some((migration) => migration.name === 'pity-counters-v2-to-v3'), true);
});

test('v0->v1 migration is unit-tested and records repairs', () => {
    const payload = {
        phase: 'hatching',
        eggTaps: 7,
        lastUpdate: 1700000000000,
        activePetIndex: -1,
        pet: { name: 'Pip', type: 'furry', birthdate: 1699999999000 }
    };
    const changes = [];
    const migrated = SaveMigrationV0ToV1.apply(payload, {
        recordChange(change) {
            changes.push(change);
        }
    });

    assert.equal(migrated.phase, 'egg');
    assert.equal(migrated.eggTaps, 0);
    assert.equal(migrated.activePetIndex, 0);
    assert.equal(Array.isArray(migrated.pets), true);
    assert.equal(migrated.pets.length, 1);
    assert.equal(migrated.saveSchemaVersion, 1);
    assert.equal(changes.length >= 4, true);
    assert.equal(changes.some((change) => change.path === 'phase'), true);
    assert.equal(changes.some((change) => change.path === 'saveSchemaVersion'), true);
});

test('v1->v2 migration creates household state and repairs missing petsById', () => {
    const payload = {
        saveSchemaVersion: 1,
        phase: 'pet',
        lastUpdate: 1700000000000,
        activePetIndex: 0,
        pet: { id: 5, name: 'Pip', type: 'cat', hunger: 40, happiness: 50, cleanliness: 60, energy: 70 },
        pets: [{ id: 5, name: 'Pip', type: 'cat', hunger: 40, happiness: 50, cleanliness: 60, energy: 70 }],
        household: { activePetId: '5' }
    };
    const changes = [];
    const migrated = SaveMigrationV1ToV2.apply(payload, {
        recordChange(change) {
            changes.push(change);
        }
    });

    assert.equal(migrated.saveSchemaVersion, 2);
    assert.ok(migrated.household);
    assert.equal(migrated.household.activePetId, '5');
    assert.ok(migrated.household.petsById['5']);
    assert.equal(migrated.household.petsById['5'].needs.hunger, 40);
    assert.equal(migrated.household.lastSimulatedAt, 1700000000000);
    assert.equal(changes.some((change) => change.path === 'household'), true);
});

test('v2->v3 migration adds pity counters for economy and exploration', () => {
    const payload = {
        saveSchemaVersion: 2,
        phase: 'pet',
        lastUpdate: 1700000000000,
        pet: { id: 'pet-1', name: 'Pip', type: 'cat' },
        pets: [{ id: 'pet-1', name: 'Pip', type: 'cat' }],
        household: { activePetId: 'pet-1', petsById: { 'pet-1': { id: 'pet-1' } }, relationships: {}, lastSimulatedAt: 1700000000000, simVersion: 1 },
        economy: {},
        exploration: {}
    };
    const changes = [];
    const migrated = SaveMigrationV2ToV3.apply(payload, {
        recordChange(change) {
            changes.push(change);
        }
    });

    assert.equal(migrated.saveSchemaVersion, 3);
    assert.deepEqual(migrated.economy.pity, { mysteryEggRareMisses: 0 });
    assert.deepEqual(migrated.exploration.pity, { expeditionRareMisses: 0 });
    assert.equal(changes.some((change) => change.path === 'economy.pity'), true);
    assert.equal(changes.some((change) => change.path === 'exploration.pity'), true);
});

test('parseSavePayloadJSON returns helpful parse errors', () => {
    assert.throws(
        () => SaveMigrations.parseSavePayloadJSON(readFixture('corrupt-invalid-json.json')),
        (err) => {
            assert.equal(err.name, 'SavePayloadParseError');
            assert.equal(err.code, 'SAVE_JSON_PARSE_FAILED');
            return true;
        }
    );
});

const validFixtureCases = [
    {
        name: 'legacy-v0-implicit-egg.json',
        expected: 'legacy-v0-implicit-egg.expected.json',
        expectedFromVersion: 0
    },
    {
        name: 'legacy-v0-explicit-pet.json',
        expected: 'legacy-v0-explicit-pet.expected.json',
        expectedFromVersion: 0
    }
];

for (const fixtureCase of validFixtureCases) {
    test('migrates and validates fixture: ' + fixtureCase.name, () => {
        const parsed = SaveMigrations.parseSavePayloadJSON(readFixture(fixtureCase.name));
        const result = SaveMigrations.migrateSavePayload(parsed);

        assert.equal(result.report.fromVersion, fixtureCase.expectedFromVersion);
        assert.equal(result.report.toVersion, SaveSchema.CURRENT_SCHEMA_VERSION);
        assert.equal(result.report.changed, true);
        assert.equal(result.report.appliedMigrations.length >= 1, true);
        assert.equal(result.report.changes.length >= 1, true);

        SaveSchema.validateSavePayload(result.payload);

        const expected = parseFixtureJson(fixtureCase.expected);
        assert.deepEqual(result.payload, expected);

        const serialized1 = SaveMigrations.serializeSavePayloadJSON(result.payload);
        const serialized2 = SaveMigrations.serializeSavePayloadJSON(JSON.parse(serialized1));
        assert.equal(serialized1, serialized2);
        assert.deepEqual(JSON.parse(serialized1), expected);
    });
}

const errorFixtureCases = [
    {
        name: 'corrupt-root-array.json',
        expectedName: 'SaveValidationError',
        messageIncludes: 'root'
    },
    {
        name: 'corrupt-pet-phase-missing-pet.json',
        expectedName: 'SaveValidationError',
        messageIncludes: 'Pet-phase saves'
    },
    {
        name: 'future-v999.json',
        expectedName: 'UnsupportedFutureSaveVersionError',
        messageIncludes: 'newer than this app supports'
    }
];

for (const fixtureCase of errorFixtureCases) {
    test('rejects invalid fixture: ' + fixtureCase.name, () => {
        const parsed = SaveMigrations.parseSavePayloadJSON(readFixture(fixtureCase.name));
        assert.throws(
            () => SaveMigrations.migrateSavePayload(parsed),
            (err) => {
                assert.equal(err.name, fixtureCase.expectedName);
                assert.equal(String(err.message).includes(fixtureCase.messageIncludes), true);
                return true;
            }
        );
    });
}
