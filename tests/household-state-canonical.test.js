const test = require('node:test');
const assert = require('node:assert/strict');

const HouseholdState = require('../js/state/household-state.js');

test('ensureHouseholdState treats household as canonical source and derives legacy pet view', () => {
    const now = Date.now();
    const state = {
        currentRoom: 'bedroom',
        pet: { id: 1, hunger: 10, cleanliness: 10, happiness: 10, energy: 10, type: 'cat' },
        pets: [{ id: 1, hunger: 10, cleanliness: 10, happiness: 10, energy: 10, type: 'cat' }],
        activePetIndex: 0,
        relationships: {},
        household: {
            activePetId: '1',
            petsById: {
                '1': {
                    id: '1',
                    name: 'Pet',
                    type: 'cat',
                    needs: { hunger: 88, energy: 77, fun: 66, hygiene: 55 },
                    mood: 'happy',
                    location: { roomId: 'garden' },
                    schedule: {}
                }
            },
            relationships: {},
            lastSimulatedAt: now,
            simVersion: 1
        }
    };

    HouseholdState.ensureHouseholdState(state, now);

    assert.equal(state.household.petsById['1'].needs.hunger, 88);
    assert.equal(state.pet.hunger, 88);
    assert.equal(state.pet.energy, 77);
    assert.equal(state.pet.happiness, 66);
    assert.equal(state.pet.cleanliness, 55);
    assert.equal(state.pet.location.roomId, 'garden');
});

test('ensureHouseholdState does not resurrect household-only pets when legacy pet array deleted them', () => {
    const now = Date.now();
    const state = {
        currentRoom: 'bedroom',
        pet: { id: 1, hunger: 40, cleanliness: 40, happiness: 40, energy: 40, type: 'cat' },
        pets: [{ id: 1, hunger: 40, cleanliness: 40, happiness: 40, energy: 40, type: 'cat' }],
        activePetIndex: 0,
        relationships: {},
        household: {
            activePetId: '1',
            petsById: {
                '1': { id: '1', type: 'cat', needs: { hunger: 70, energy: 70, fun: 70, hygiene: 70 }, mood: 'happy', location: { roomId: 'bedroom' }, schedule: {} },
                '2': { id: '2', type: 'dog', needs: { hunger: 60, energy: 60, fun: 60, hygiene: 60 }, mood: 'neutral', location: { roomId: 'garden' }, schedule: {} }
            },
            relationships: {},
            lastSimulatedAt: now,
            simVersion: 1
        }
    };

    HouseholdState.ensureHouseholdState(state, now);

    assert.equal(state.pets.length, 1);
    assert.equal(state.pets[0].id, 1);
    assert.equal(Object.prototype.hasOwnProperty.call(state.household.petsById, '2'), false);
});

test('ensureHouseholdState preserves canonical household needs while merging legacy non-canonical edits', () => {
    const now = Date.now();
    const state = {
        currentRoom: 'bedroom',
        pet: { id: 1, name: 'Legacy Renamed', hunger: 5, cleanliness: 5, happiness: 5, energy: 5, type: 'cat' },
        pets: [{ id: 1, name: 'Legacy Renamed', hunger: 5, cleanliness: 5, happiness: 5, energy: 5, type: 'cat', accessory: 'hat' }],
        activePetIndex: 0,
        relationships: {},
        household: {
            activePetId: '1',
            petsById: {
                '1': {
                    id: '1',
                    name: 'Household Name',
                    type: 'cat',
                    accessory: 'none',
                    needs: { hunger: 91, energy: 82, fun: 73, hygiene: 64 },
                    mood: 'happy',
                    location: { roomId: 'garden' },
                    schedule: { currentActivity: { type: 'rest' } }
                }
            },
            relationships: {},
            lastSimulatedAt: now,
            simVersion: 1
        }
    };

    HouseholdState.ensureHouseholdState(state, now);

    assert.equal(state.household.petsById['1'].name, 'Legacy Renamed');
    assert.equal(state.household.petsById['1'].accessory, 'hat');
    assert.equal(state.household.petsById['1'].needs.hunger, 91);
    assert.equal(state.household.petsById['1'].location.roomId, 'garden');
    assert.equal(state.pet.hunger, 91);
});
