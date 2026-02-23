(function initMLFDiagnostics(root, factory) {
    'use strict';
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }
    root.MLFDiagnostics = factory();
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMLFDiagnostics() {
    'use strict';

    const DEFAULT_MAX_ENTRIES = 100;

    const _entries = [];
    let _maxEntries = DEFAULT_MAX_ENTRIES;

    function nowIso() {
        try {
            return new Date().toISOString();
        } catch (_) {
            return String(Date.now());
        }
    }

    function sanitizeLevel(level) {
        const value = String(level || 'info').toLowerCase();
        if (value === 'error' || value === 'warn' || value === 'debug' || value === 'info') return value;
        return 'info';
    }

    function sanitizeCategory(category) {
        const value = String(category || 'UI').toUpperCase();
        if (/^[A-Z0-9_-]+$/.test(value)) return value;
        return 'UI';
    }

    function safeClone(value) {
        if (value == null) return value;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_) {
            return String(value);
        }
    }

    function trimRingBuffer() {
        if (_entries.length <= _maxEntries) return;
        _entries.splice(0, _entries.length - _maxEntries);
    }

    function push(entry) {
        const normalized = {
            ts: typeof entry?.ts === 'string' ? entry.ts : nowIso(),
            category: sanitizeCategory(entry && entry.category),
            level: sanitizeLevel(entry && entry.level),
            message: String((entry && entry.message) || ''),
            buildVersion: entry && entry.buildVersion != null ? String(entry.buildVersion) : null,
            saveSchemaVersion: entry && entry.saveSchemaVersion != null ? Number(entry.saveSchemaVersion) : null,
            meta: safeClone(entry && entry.meta)
        };
        _entries.push(normalized);
        trimRingBuffer();
        return normalized;
    }

    function log(category, message, meta) {
        return push({ category, level: 'info', message, meta });
    }

    function warn(category, message, meta) {
        return push({ category, level: 'warn', message, meta });
    }

    function error(category, message, meta) {
        return push({ category, level: 'error', message, meta });
    }

    function getEntries() {
        return _entries.slice();
    }

    function clear() {
        _entries.length = 0;
    }

    function setMaxEntries(nextMax) {
        if (!Number.isInteger(nextMax) || nextMax <= 0) return _maxEntries;
        _maxEntries = nextMax;
        trimRingBuffer();
        return _maxEntries;
    }

    function exportPlainText() {
        return _entries.map((entry) => {
            const metaText = entry.meta == null ? '' : ' ' + JSON.stringify(entry.meta);
            return '[' + entry.ts + '] [' + entry.category + '] [' + entry.level.toUpperCase() + '] ' + entry.message + metaText;
        }).join('\n');
    }

    return Object.freeze({
        push,
        log,
        warn,
        error,
        getEntries,
        clear,
        setMaxEntries,
        exportPlainText
    });
});
