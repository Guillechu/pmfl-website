import type { AppSettings } from '@/types/settings';

const STORAGE_KEY = 'jorkan-draft.settings.v1';

export const DEFAULT_SETTINGS: AppSettings = {
  audio: {
    master: 0.85,
    music: 0.32,
    sfx: 0.75,
    announcer: 1,
    muted: false,
    duckLevel: 0.22,
    duckAttackMs: 220,
    duckReleaseMs: 900,
    voiceId: null,
    voiceRate: 0.96,
    voicePitch: 0.92,
    announcerEnabled: true,
    musicEnabled: true,
    sfxEnabled: true,
    countdownEnabled: true,
  },
  presentation: {
    view: 'live',
    showTicker: true,
    revealSeconds: 7,
    uiScale: 1,
    lowMotion: false,
    debugOverlay: false,
  },
};

export function loadSettings(): AppSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      audio: { ...DEFAULT_SETTINGS.audio, ...(parsed.audio ?? {}) },
      presentation: { ...DEFAULT_SETTINGS.presentation, ...(parsed.presentation ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // A full or blocked localStorage must never take the presentation down.
  }
}
