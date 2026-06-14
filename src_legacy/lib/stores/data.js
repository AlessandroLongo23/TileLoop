import { writable } from 'svelte/store';

export const tilesets = writable([
    'loop',
    'flow',
    'tech',
]);

export const themes = writable({
    'default': {
        colors: {
            'timeattack': 'oklch(55.5% 0.163 48.998)',
            'precision': 'oklch(49.1% 0.27 292.581)',
            'zen': 'oklch(50.8% 0.118 165.612)',
        }
    }
});