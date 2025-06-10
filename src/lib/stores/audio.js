import { writable } from 'svelte/store';

export const audio = writable(null);
export const isMuted = writable(true);
