(function initMLFRuntimeManifestShared(root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }
  root.MLFRuntimeManifestShared = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFRuntimeManifestShared() {
  'use strict';

  const MANIFEST_GROUP_KEYS = Object.freeze([
    'BASE_RUNTIME_FILES',
    'GAME_RUNTIME_FILES',
    'UI_RUNTIME_FILES',
    'MINIGAME_RUNTIME_FILES',
    'COMPETITION_RUNTIME_FILES'
  ]);

  function asArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function normalizeManifest(manifest) {
    const src = (manifest && typeof manifest === 'object') ? manifest : {};
    const normalized = {};
    for (const key of MANIFEST_GROUP_KEYS) {
      normalized[key] = asArray(src[key]);
    }
    normalized.RUNTIME_SCRIPT_FILES = asArray(src.RUNTIME_SCRIPT_FILES);
    return normalized;
  }

  function flattenRuntimeFiles(manifest) {
    const normalized = normalizeManifest(manifest);
    const files = [];
    for (const key of MANIFEST_GROUP_KEYS) {
      files.push(...normalized[key]);
    }
    return files;
  }

  function createManifestFromGroups(groups) {
    const normalized = normalizeManifest(groups);
    normalized.RUNTIME_SCRIPT_FILES = flattenRuntimeFiles(normalized);
    return normalized;
  }

  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function firstDiffIndex(a, b) {
    const limit = Math.min(a.length, b.length);
    for (let i = 0; i < limit; i++) {
      if (a[i] !== b[i]) return i;
    }
    return a.length === b.length ? -1 : limit;
  }

  function assertRuntimeManifestParity(input, options) {
    const opts = (options && typeof options === 'object') ? options : {};
    const manifest = normalizeManifest(input);
    const expectedRuntimeOrder = Array.isArray(opts.expectedRuntimeOrder)
      ? opts.expectedRuntimeOrder.slice()
      : flattenRuntimeFiles(manifest);
    const actualRuntimeOrder = manifest.RUNTIME_SCRIPT_FILES.slice();

    const ok = arraysEqual(expectedRuntimeOrder, actualRuntimeOrder);
    const diffIndex = ok ? -1 : firstDiffIndex(expectedRuntimeOrder, actualRuntimeOrder);
    const report = {
      ok,
      mode: opts.mode || 'runtime',
      expectedCount: expectedRuntimeOrder.length,
      actualCount: actualRuntimeOrder.length,
      diffIndex,
      expectedAtDiff: diffIndex >= 0 ? (expectedRuntimeOrder[diffIndex] || null) : null,
      actualAtDiff: diffIndex >= 0 ? (actualRuntimeOrder[diffIndex] || null) : null
    };

    if (!ok && opts.throwOnMismatch !== false) {
      const err = new Error(
        '[MLF] Runtime manifest parity mismatch at index ' + diffIndex +
        ' (expected=' + String(report.expectedAtDiff) + ', actual=' + String(report.actualAtDiff) + ')'
      );
      err.name = 'RuntimeManifestParityError';
      err.report = report;
      throw err;
    }

    return report;
  }

  return Object.freeze({
    MANIFEST_GROUP_KEYS,
    normalizeManifest,
    flattenRuntimeFiles,
    createManifestFromGroups,
    assertRuntimeManifestParity
  });
});
