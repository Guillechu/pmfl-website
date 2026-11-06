import { useEffect } from 'react';
import { getDirector } from '@/audio/Director';
import { toggleFullscreen } from './useKeyboardShortcuts';
import { getRuntime } from './DraftRuntime';
import { settingsStore } from './settingsStore';
import { useSettings } from './hooks';

/** Keeps the audio engine in step with the settings store. */
export function useAudioDirector(): void {
  const settings = useSettings();
  useEffect(() => {
    const director = getDirector(getRuntime());
    if (director.getEngine().isUnlocked()) director.setSettings(settings.audio);
  }, [settings.audio]);
}

/**
 * ARM PRESENTATION.
 *
 * The single user gesture the browser needs: it unlocks the audio context,
 * warms up speech synthesis, starts the pre-draft music and (optionally) goes
 * fullscreen. It does not start the draft - ESPN does that.
 */
export async function armPresentation(): Promise<void> {
  const runtime = getRuntime();
  const settings = settingsStore.get();
  runtime.arm();
  const director = getDirector(runtime);
  await director.arm(settings.audio, settings.audio.introUrl);
  if (settings.presentation.fullscreenOnArm) await toggleFullscreen();
}
