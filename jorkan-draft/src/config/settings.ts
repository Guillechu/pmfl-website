import type { AppSettings } from '@/types/settings';

const STORAGE_KEY = 'jorkan-draft.settings.v1';

/**
 * League intro music, supplied by the commissioner. Dropbox share links are
 * normalised to a direct-delivery URL at playback time (see audio/urls.ts).
 * Drop a file at /public/audio/intro.mp3 to override this entirely.
 */
export const DEFAULT_INTRO_URL =
  'https://www.dropbox.com/scl/fi/044chewhnh0vk9fn1cyvk/Dmitry.R_-_Power_Kanye_West_Cover_-mp3.pm.mp3?rlkey=eacdml3cqi2uohdttieyrl85d&st=dduxw9aw&dl=0';

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
    // Pitch shifting is the single biggest source of that "computer voice"
    // sound, and a neural voice needs none of it. Left at 1, with only a
    // whisker off the rate so a name lands rather than rushes.
    voiceRate: 0.98,
    voicePitch: 1,
    announcerEnabled: true,
    musicEnabled: true,
    sfxEnabled: true,
    countdownEnabled: true,
    introUrl: DEFAULT_INTRO_URL,
  },
  presentation: {
    view: 'live',
    showTicker: false,
    revealSeconds: 7,
    uiScale: 1,
    lowMotion: false,
    debugOverlay: false,
    fullscreenOnArm: true,
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
