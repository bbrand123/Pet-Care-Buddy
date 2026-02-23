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
    const DEFAULT_PERSIST_MAX_ENTRIES = 80;
    const DEFAULT_STORAGE_KEY = 'mlf_diagnostics_recent_logs_v1';
    const ALLOWED_CATEGORIES = Object.freeze(['BOOT', 'SAVE', 'LOAD', 'MIGRATE', 'NATIVE', 'UI']);

    const _entries = [];
    let _maxEntries = DEFAULT_MAX_ENTRIES;
    let _persistMaxEntries = DEFAULT_PERSIST_MAX_ENTRIES;
    let _storageKey = DEFAULT_STORAGE_KEY;
    let _persistenceEnabled = true;
    let _storageAdapter = null;
    let _persistTimer = null;
    let _restoreAttempted = false;
    let _metadataProvider = null;

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
        if (ALLOWED_CATEGORIES.indexOf(value) >= 0) return value;
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

    function getGlobalObject() {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof window !== 'undefined') return window;
        return null;
    }

    function getStorageAdapter() {
        if (_storageAdapter && typeof _storageAdapter.getItem === 'function' && typeof _storageAdapter.setItem === 'function') {
            return _storageAdapter;
        }
        const root = getGlobalObject();
        if (!root || !root.localStorage) return null;
        try {
            if (typeof root.localStorage.getItem !== 'function' || typeof root.localStorage.setItem !== 'function') return null;
            return root.localStorage;
        } catch (_) {
            return null;
        }
    }

    function clearPersistTimer() {
        if (!_persistTimer) return;
        try { clearTimeout(_persistTimer); } catch (_) {}
        _persistTimer = null;
    }

    function buildPersistedPayload() {
        return {
            savedAt: nowIso(),
            entries: _entries.slice(-Math.max(1, _persistMaxEntries))
        };
    }

    function persistNow() {
        clearPersistTimer();
        if (!_persistenceEnabled) return false;
        const storage = getStorageAdapter();
        if (!storage) return false;
        try {
            storage.setItem(_storageKey, JSON.stringify(buildPersistedPayload()));
            return true;
        } catch (_) {
            return false;
        }
    }

    function schedulePersist() {
        if (!_persistenceEnabled) return;
        if (_persistTimer) return;
        _persistTimer = setTimeout(() => {
            persistNow();
        }, 50);
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
        schedulePersist();
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
        clearPersistTimer();
    }

    function setMaxEntries(nextMax) {
        if (!Number.isInteger(nextMax) || nextMax <= 0) return _maxEntries;
        _maxEntries = nextMax;
        trimRingBuffer();
        return _maxEntries;
    }

    function setPersistMaxEntries(nextMax) {
        if (!Number.isInteger(nextMax) || nextMax <= 0) return _persistMaxEntries;
        _persistMaxEntries = nextMax;
        return _persistMaxEntries;
    }

    function getEnvironmentInfo() {
        const root = getGlobalObject();
        let userAgent = 'unknown';
        let platform = 'unknown';
        let href = 'unknown';
        let protocol = 'unknown';
        try { userAgent = root && root.navigator && root.navigator.userAgent ? String(root.navigator.userAgent) : userAgent; } catch (_) {}
        try {
            platform = root && root.navigator && (root.navigator.userAgentData?.platform || root.navigator.platform)
                ? String(root.navigator.userAgentData?.platform || root.navigator.platform)
                : platform;
        } catch (_) {}
        try {
            href = root && root.location && root.location.href ? String(root.location.href) : href;
            protocol = root && root.location && root.location.protocol ? String(root.location.protocol) : protocol;
        } catch (_) {}
        const bootInfo = (root && root.__MLF_RUNTIME_BOOT_INFO__ && typeof root.__MLF_RUNTIME_BOOT_INFO__ === 'object')
            ? safeClone(root.__MLF_RUNTIME_BOOT_INFO__)
            : null;
        return {
            generatedAt: nowIso(),
            appVersion: (typeof APP_VERSION !== 'undefined') ? APP_VERSION : null,
            currentSaveSchemaVersion: (typeof MLFSaveSchema !== 'undefined' && MLFSaveSchema) ? MLFSaveSchema.CURRENT_SCHEMA_VERSION : null,
            userAgent,
            platform,
            href,
            protocol,
            bootInfo
        };
    }

    function buildReportHeaderLines(options) {
        const opts = (options && typeof options === 'object') ? options : {};
        const providedMetadata = (typeof _metadataProvider === 'function')
            ? (safeClone(_metadataProvider() || {}) || {})
            : {};
        const envInfo = Object.assign({}, getEnvironmentInfo(), providedMetadata);
        const lines = [
            'My Little Friend Diagnostics',
            'Generated: ' + String(envInfo.generatedAt || nowIso()),
            'App Version: ' + String(envInfo.appVersion ?? 'unknown'),
            'Current Save Schema: ' + String(envInfo.currentSaveSchemaVersion ?? 'unknown'),
            'Platform: ' + String(envInfo.platform || 'unknown'),
            'Protocol: ' + String(envInfo.protocol || 'unknown'),
            'URL: ' + String(envInfo.href || 'unknown'),
            'User Agent: ' + String(envInfo.userAgent || 'unknown')
        ];
        if (envInfo.bootInfo) lines.push('Boot Info: ' + JSON.stringify(envInfo.bootInfo));
        if (opts.context) lines.push('Context: ' + String(opts.context));
        lines.push('');
        lines.push('Entries (' + _entries.length + '):');
        return lines;
    }

    function exportPlainText(options) {
        const header = buildReportHeaderLines(options);
        const body = _entries.map((entry) => {
            const metaText = entry.meta == null ? '' : ' ' + JSON.stringify(entry.meta);
            return '[' + entry.ts + '] [' + entry.category + '] [' + entry.level.toUpperCase() + '] ' + entry.message + metaText;
        });
        return header.concat(body).join('\n');
    }

    function createSupportReportText(options) {
        return exportPlainText(options);
    }

    function restorePersisted() {
        if (_restoreAttempted) return { restored: false, reason: 'already-attempted' };
        _restoreAttempted = true;
        if (!_persistenceEnabled) return { restored: false, reason: 'disabled' };
        const storage = getStorageAdapter();
        if (!storage) return { restored: false, reason: 'storage-unavailable' };
        try {
            const raw = storage.getItem(_storageKey);
            if (!raw) return { restored: false, reason: 'missing' };
            const parsed = JSON.parse(raw);
            const entries = Array.isArray(parsed && parsed.entries) ? parsed.entries : [];
            for (let i = 0; i < entries.length; i++) {
                push(entries[i]);
            }
            return { restored: entries.length > 0, count: entries.length };
        } catch (_) {
            return { restored: false, reason: 'parse-failed' };
        }
    }

    function configure(options) {
        if (!options || typeof options !== 'object') return;
        if (Object.prototype.hasOwnProperty.call(options, 'persistenceEnabled')) _persistenceEnabled = !!options.persistenceEnabled;
        if (typeof options.storageKey === 'string' && options.storageKey) _storageKey = options.storageKey;
        if (options.storage && typeof options.storage === 'object') _storageAdapter = options.storage;
        if (typeof options.metadataProvider === 'function') _metadataProvider = options.metadataProvider;
        if (Number.isInteger(options.maxEntries) && options.maxEntries > 0) setMaxEntries(options.maxEntries);
        if (Number.isInteger(options.persistMaxEntries) && options.persistMaxEntries > 0) setPersistMaxEntries(options.persistMaxEntries);
        if (options.autoRestore === true) restorePersisted();
    }

    function resetForTests() {
        clear();
        _maxEntries = DEFAULT_MAX_ENTRIES;
        _persistMaxEntries = DEFAULT_PERSIST_MAX_ENTRIES;
        _storageKey = DEFAULT_STORAGE_KEY;
        _persistenceEnabled = true;
        _storageAdapter = null;
        _restoreAttempted = false;
        _metadataProvider = null;
    }

    try { restorePersisted(); } catch (_) {}

    return Object.freeze({
        ALLOWED_CATEGORIES,
        push,
        log,
        warn,
        error,
        getEntries,
        clear,
        setMaxEntries,
        setPersistMaxEntries,
        configure,
        restorePersisted,
        persistNow,
        getEnvironmentInfo,
        createSupportReportText,
        exportPlainText,
        _resetForTests: resetForTests
    });
});
