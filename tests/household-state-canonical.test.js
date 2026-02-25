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
