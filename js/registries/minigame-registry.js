(function initMiniGameRegistry(global) {
    'use strict';

    const byId = Object.create(null);
    const order = [];

    function isObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function normalizeDescriptor(input) {
        if (!isObject(input)) throw new Error('Minigame descriptor must be an object');
        const id = String(input.id || '').trim();
        if (!id) throw new Error('Minigame descriptor is missing id');
        const name = String(input.name || '').trim();
        if (!name) throw new Error(`Minigame descriptor ${id} is missing name`);
        return Object.freeze({
            id,
            name,
            icon: String(input.icon || '🎮'),
            description: String(input.description || ''),
            a11y: String(input.a11y || ''),
            a11yNote: String(input.a11yNote || ''),
            scoreLabel: String(input.scoreLabel || ''),
            sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : null
        });
    }

    function sortDescriptors(list) {
        return list.sort((a, b) => {
            const ao = a.sortOrder;
            const bo = b.sortOrder;
            if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return ao - bo;
            if (Number.isFinite(ao) && !Number.isFinite(bo)) return -1;
            if (!Number.isFinite(ao) && Number.isFinite(bo)) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    const MiniGameRegistry = {
        validate(descriptor) {
            return normalizeDescriptor(descriptor);
        },
        register(descriptor) {
            const normalized = normalizeDescriptor(descriptor);
            if (!byId[normalized.id]) order.push(normalized.id);
            byId[normalized.id] = normalized;
            return normalized;
        },
        registerMany(descriptors) {
            const list = Array.isArray(descriptors) ? descriptors : [];
            return list.map((entry) => this.register(entry));
        },
        get(id) {
            const key = String(id || '');
            return byId[key] || null;
        },
        getAll() {
            const list = order.map((id) => byId[id]).filter(Boolean);
            return sortDescriptors(list.slice());
        },
        clear() {
            order.length = 0;
            Object.keys(byId).forEach((id) => delete byId[id]);
        }
    };

    global.MiniGameRegistry = MiniGameRegistry;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MiniGameRegistry;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
