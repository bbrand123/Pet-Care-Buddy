const test = require('node:test');
const assert = require('node:assert/strict');

const RecoveryUI = require('../js/save/recovery-ui.js');

test('buildRecoveryDialogHTML includes actionable recovery buttons and support messaging', () => {
    const html = RecoveryUI.buildRecoveryDialogHTML();
    assert.equal(html.includes('Save Data Issue'), true);
    assert.equal(html.includes('Export Diagnostics'), true);
    assert.equal(html.includes('Start Fresh'), true);
    assert.equal(html.includes('Try Continue'), true);
});

test('showSaveRecoveryDialog returns no-error when no load error is provided', () => {
    const result = RecoveryUI.showSaveRecoveryDialog({});
    assert.deepEqual(result, { shown: false, reason: 'no-error' });
});
