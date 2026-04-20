import type { CompareIdeasReport, IdeaInput, VentureReport } from '$lib/types/analysis';
import { writable } from 'svelte/store';

export const latestReport = writable<VentureReport | null>(null);
export const latestCompareReport = writable<CompareIdeasReport | null>(null);
export const intakePrefill = writable<IdeaInput | null>(null);
