// ==================== SHARED UTILITIES ====================
// Extracted from duplicated patterns across the codebase.
// Loaded before all other JS files.

/**
 * Clamp a numeric value between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Return a display-safe pet name, with HTML escaping applied.
 * Handles missing name, missing type data, and null pets gracefully.
 * @param {object} pet
 * @returns {string} HTML-escaped display name
 */
function getPetDisplayName(pet) {
    if (!pet) return 'Pet';
    const raw = pet.name
        || ((typeof getAllPetTypeData === 'function' ? getAllPetTypeData(pet.type) : null) || {}).name
        || 'Pet';
    return (typeof escapeHTML === 'function') ? escapeHTML(raw) : raw.replace(/[&<>"']/g, function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});
}

/**
 * Safely read a value from localStorage with a try-catch wrapper.
 * @param {string} key - localStorage key
 * @param {*} fallback - value returned on error or missing key
 * @param {Function} [parser=JSON.parse] - parsing function (JSON.parse, parseFloat, etc.)
 * @returns {*}
 */
function safeStorageGet(key, fallback, parser) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        if (parser) return parser(raw);
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

/**
 * Safely write a value to localStorage with a try-catch wrapper.
 * Non-string values are JSON-stringified automatically.
 * @param {string} key - localStorage key
 * @param {*} value - value to store
 */
function safeStorageSet(key, value) {
    try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
    } catch (e) {
        // Storage full or unavailable — silently ignore
    }
}

/**
 * Create an overlay div element with class, innerHTML, and optional config.
 * @param {string} className - CSS class(es) for the overlay
 * @param {string} innerHTML - inner HTML content
 * @param {object} [options]
 * @param {HTMLElement} [options.parent=document.body] - parent to append to
 * @param {Function} [options.onClose] - called when overlay background is clicked
 * @param {boolean} [options.focusTrap=false] - whether to trap focus inside
 * @param {string} [options.ariaLabel] - aria-label for the overlay
 * @param {string} [options.role='dialog'] - ARIA role
 * @param {boolean} [options.ariaModal=true] - aria-modal attribute
 * @returns {HTMLElement} the created overlay element
 */
function createOverlay(className, innerHTML, options) {
    const opts = options || {};
    const overlay = document.createElement('div');
    overlay.className = className;
    overlay.innerHTML = innerHTML;
    if (opts.ariaLabel) overlay.setAttribute('aria-label', opts.ariaLabel);
    overlay.setAttribute('role', opts.role || 'dialog');
    if (opts.ariaModal !== false) overlay.setAttribute('aria-modal', 'true');
    if (opts.onClose) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) opts.onClose();
        });
    }
    var parent = opts.parent || document.body;
    parent.appendChild(overlay);
    if (opts.focusTrap && typeof trapFocus === 'function') {
        trapFocus(overlay);
    }
    return overlay;
}

/**
 * Restore a log display from a history array.
 * Replaces the near-identical restoreBattleLog, restoreBossLog, and restoreRivalLog functions.
 * @param {string} selector - CSS selector for the log container (e.g. '#battle-log')
 * @param {string[]} logEntries - array of log message strings
 * @param {Function} [renderFn] - optional custom render function per entry; defaults to creating a text div
 * @param {HTMLElement} [root] - root element to query selector from (defaults to document)
 */
function restoreLog(selector, logEntries, renderFn, root) {
    var container = (root || document).querySelector(selector);
    if (!container) return;
    var entries = logEntries || [];
    entries.forEach(function (msg) {
        if (renderFn) {
            renderFn(container, msg);
        } else {
            var entry = document.createElement('div');
            entry.className = 'battle-log-entry';
            entry.textContent = msg;
            container.appendChild(entry);
        }
    });
    container.scrollTop = container.scrollHeight;
}
