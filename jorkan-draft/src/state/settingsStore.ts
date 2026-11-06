import type { AppSettings, AudioSettings, PresentationSettings } from '@/types/settings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/config/settings';
import { Store } from './store';

export const settingsStore = new Store<AppSettings>(
  typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings(),
);

export function patchAudio(patch: Partial<AudioSettings>): void {
  settingsStore.update((current) => {
    const next = { ...current, audio: { ...current.audio, ...patch } };
    saveSettings(next);
    return next;
  });
}

export function patchPresentation(patch: Partial<PresentationSettings>): void {
  settingsStore.update((current) => {
    const next = { ...current, presentation: { ...current.presentation, ...patch } };
    saveSettings(next);
    return next;
  });
}

export function resetSettings(): void {
  settingsStore.set(DEFAULT_SETTINGS);
  saveSettings(DEFAULT_SETTINGS);
}
