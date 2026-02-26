// ==================== MODAL MANAGER ====================
// Centralizes modal lifecycle: overlay creation, escape key handling,
// focus trapping, ARIA attributes, and cleanup.

/**
 * Centralized modal lifecycle manager.
 * Builds on the existing pushModalEscape/popModalEscape/trapFocus
 * infrastructure in constants.js.
 * @namespace
 */
const ModalManager = {
    /** @private Stack of open modal descriptors */
    _stack: [],
    /** @private Set of modal IDs currently being closed (re-entrancy guard) */
    _closing: new Set(),

    /**
     * Open a modal with standardized lifecycle management.
     * @param {object} config
     * @param {string} config.id - Unique modal identifier
     * @param {string} config.content - Inner HTML for the modal
     * @param {string} [config.className='modal-overlay'] - CSS class for the overlay
     * @param {string} [config.ariaLabel] - Accessible label for the dialog
     * @param {string} [config.role='dialog'] - ARIA role (dialog or alertdialog)
     * @param {Function} [config.onClose] - Callback after modal is closed
     * @param {boolean} [config.focusTrap=true] - Whether to trap focus inside
     * @param {boolean} [config.closeOnBackdrop=true] - Whether clicking backdrop closes
     * @param {string} [config.focusSelector] - Selector for element to focus on open
     * @param {HTMLElement} [config.returnFocus] - Element to return focus to on close
     * @returns {HTMLElement} The created overlay element
     */
    open(config) {
        if (!config || !config.id) {
            console.error('[ModalManager] open() requires an id');
            return null;
        }

        // Prevent duplicate modals with the same id
        if (this.isOpen(config.id)) {
            this.close(config.id);
        }

        var overlay = document.createElement('div');
        overlay.className = config.className || 'modal-overlay';
        overlay.setAttribute('role', config.role || 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.dataset.modalId = config.id;
        if (config.ariaLabel) {
            overlay.setAttribute('aria-label', config.ariaLabel);
        }
        var rawContent = config.content || '';
        // Strip script tags and inline event handlers for defense-in-depth
        rawContent = rawContent.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=/gi, ' data-removed-handler=');
        overlay.innerHTML = rawContent;

        var self = this;
        var returnFocus = config.returnFocus || document.activeElement;

        function closeHandler() {
            self.close(config.id);
        }

        // Click on backdrop to close
        if (config.closeOnBackdrop !== false) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeHandler();
            });
        }

        var descriptor = {
            id: config.id,
            overlay: overlay,
            closeHandler: closeHandler,
            onClose: config.onClose || null,
            returnFocus: returnFocus
        };

        this._stack.push(descriptor);
        document.body.appendChild(overlay);
        if (typeof MLFUiHooks !== 'undefined' && MLFUiHooks && typeof MLFUiHooks.emit === 'function') {
            MLFUiHooks.emit('overlay:opened', { element: overlay, overlayId: config.id, source: 'ModalManager.open' });
            MLFUiHooks.emit('modal:opened', { element: overlay, modalId: config.id, source: 'ModalManager.open' });
        }

        // Register with the existing escape key stack
        if (typeof pushModalEscape === 'function') {
            pushModalEscape(closeHandler);
        }

        // Focus trap
        if (config.focusTrap !== false && typeof trapFocus === 'function') {
            trapFocus(overlay);
        }

        // Focus specific element if requested
        if (config.focusSelector) {
            var focusEl = overlay.querySelector(config.focusSelector);
            if (focusEl && typeof focusEl.focus === 'function') {
                focusEl.focus();
            }
        }

        return overlay;
    },

    /**
     * Close a specific modal by id.
     * @param {string} id - Modal identifier
     */
    close(id) {
        if (this._closing.has(id)) return;
        var idx = -1;
        for (var i = 0; i < this._stack.length; i++) {
            if (this._stack[i].id === id) {
                idx = i;
                break;
            }
        }
        if (idx === -1) return;
        this._closing.add(id);

        var descriptor = this._stack.splice(idx, 1)[0];

        // Unregister from escape key stack
        if (typeof popModalEscape === 'function') {
            popModalEscape(descriptor.closeHandler);
        }

        var self2 = this;
        var finalizeClose = function finalizeClose() {
            self2._closing.delete(id);
            if (typeof MLFUiHooks !== 'undefined' && MLFUiHooks && typeof MLFUiHooks.emit === 'function') {
                MLFUiHooks.emit('overlay:closed', { element: descriptor.overlay, overlayId: id, source: 'ModalManager.close' });
                MLFUiHooks.emit('modal:closed', { element: descriptor.overlay, modalId: id, source: 'ModalManager.close' });
            }
            if (descriptor.returnFocus &&
                document.contains(descriptor.returnFocus) &&
                typeof descriptor.returnFocus.focus === 'function') {
                descriptor.returnFocus.focus();
            }
            if (typeof descriptor.onClose === 'function') {
                try {
                    descriptor.onClose();
                } catch (err) {
                    console.error('[ModalManager] onClose error for \"' + id + '\":', err);
                }
            }
        };

        if (descriptor.overlay) {
            if (typeof MLFUiHooks !== 'undefined' && MLFUiHooks && typeof MLFUiHooks.emit === 'function') {
                MLFUiHooks.emit('overlay:closing', { element: descriptor.overlay, overlayId: id, source: 'ModalManager.close' });
                MLFUiHooks.emit('modal:closing', { element: descriptor.overlay, modalId: id, source: 'ModalManager.close' });
            }
            if (descriptor.overlay.parentNode) {
                const transitions = (typeof GameTransitions !== 'undefined') ? GameTransitions : (typeof window !== 'undefined' ? window.GameTransitions : null);
                if (transitions && typeof transitions.removeWithTransition === 'function') {
                    transitions.removeWithTransition(descriptor.overlay, 'overlay', finalizeClose);
                    return;
                }
                descriptor.overlay.remove();
            }
        }
        finalizeClose();
    },

    /**
     * Close the topmost modal on the stack.
     */
    closeTop() {
        if (this._stack.length === 0) return;
        var top = this._stack[this._stack.length - 1];
        this.close(top.id);
    },

    /**
     * Check if a modal with the given id is currently open.
     * @param {string} id
     * @returns {boolean}
     */
    isOpen(id) {
        return this._stack.some(function (d) { return d.id === id; });
    },

    /**
     * Get the overlay element for an open modal.
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    getOverlay(id) {
        for (var i = 0; i < this._stack.length; i++) {
            if (this._stack[i].id === id) return this._stack[i].overlay;
        }
        return null;
    },

    /**
     * Get the number of currently open modals.
     * @returns {number}
     */
    get count() {
        return this._stack.length;
    }
};
