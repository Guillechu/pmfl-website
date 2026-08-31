import { useEffect, useMemo, useState } from 'react';
import { useDraft, useRuntime, useSettings, useSyncStatus, useUi } from '@/state/hooks';
import { getDirector } from '@/audio/Director';
import { OpsButton, OpsPanel, OpsSection } from './OpsPanel';

/**
 * Draft day checklist. Key: C
 *
 * Items the app can verify, it verifies - the rest are ticked by hand and
 * remembered in localStorage so the list survives a reload on draft night.
 */

const STORAGE_KEY = 'jorkan-draft.checklist.v1';

interface ManualItem {
  id: string;
  label: string;
  hint?: string;
}

const MANUAL_ITEMS: ManualItem[] = [
  { id: 'chrome', label: 'Chrome updated' },
  { id: 'espn-login', label: 'Signed in to ESPN' },
  { id: 'espn-room', label: 'ESPN draft room open in its own window' },
  { id: 'tv', label: 'TV connected over HDMI and set as the second display' },
  { id: 'resolution', label: 'TV running at 1920x1080 or higher' },
  { id: 'fullscreen', label: 'Presentation window moved to the TV and fullscreened (F)' },
  { id: 'audio-out', label: 'Sound coming out of the TV, not the laptop' },
  { id: 'announcer', label: 'Announcer tested (Audio panel)' },
  { id: 'intro', label: 'Intro music tested' },
  { id: 'bed', label: 'Background bed tested' },
  { id: 'pick-sound', label: 'Pick sound tested' },
  { id: 'sleep', label: 'Sleep and screensaver disabled' },
  { id: 'charger', label: 'Laptop charger connected' },
  { id: 'vpn', label: 'VPN disabled' },
  { id: 'notifications', label: 'Notifications silenced (Windows focus assist)' },
  { id: 'mock', label: 'Mock draft sync tested end to end' },
];

export function ChecklistPanel({ onClose }: { onClose: () => void }) {
  const runtime = useRuntime();
  const state = useDraft();
  const status = useSyncStatus();
  const ui = useUi();
  const settings = useSettings();
  const audio = getDirector(runtime).status();

  const [checked, setChecked] = useState<Record<string, boolean>>(() => load());
  useEffect(() => save(checked), [checked]);

  const automatic = useMemo(
    () => [
      {
        id: 'ext',
        // The simulator also reports a version, so require the real feed too.
        label: 'Extension connected',
        ok: status.provider === 'espn' && status.extensionVersion !== null,
      },
      { id: 'espn-tab', label: 'ESPN draft room detected', ok: status.espnTabDetected },
      { id: 'observer', label: 'DOM observer watching', ok: status.observerActive },
      { id: 'sync', label: 'ESPN sync healthy', ok: status.connection === 'connected' },
      { id: 'armed', label: 'Presentation armed', ok: ui.armed },
      { id: 'audio', label: 'Audio unlocked', ok: audio.audio.contextState === 'running' },
      {
        id: 'voice',
        label: 'Announcer voice available',
        ok: audio.announcer.ready && audio.announcer.voices > 0,
      },
      { id: 'live', label: 'Real ESPN feed (not the simulator)', ok: status.provider === 'espn' },
      { id: 'size', label: 'Window at least 1280 wide', ok: window.innerWidth >= 1280 },
      { id: 'phase', label: 'Waiting on ESPN, nothing stuck', ok: state.phase !== 'idle' },
    ],
    [status, ui.armed, audio, state.phase],
  );

  const manualDone = MANUAL_ITEMS.filter((item) => checked[item.id]).length;
  const autoDone = automatic.filter((item) => item.ok).length;

  return (
    <OpsPanel
      title="Draft day checklist"
      subtitle={`${autoDone}/${automatic.length} checked automatically · ${manualDone}/${MANUAL_ITEMS.length} by hand`}
      onClose={onClose}
      width="30rem"
    >
      <OpsSection title="Checked automatically">
        {automatic.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between border-b border-white/5 py-[0.2rem]"
          >
            <span className="text-tv-xs text-white/70">{item.label}</span>
            <span
              className={`font-display text-tv-xs font-bold uppercase tracking-[0.16em] ${
                item.ok ? 'text-emerald-300' : 'text-alert-400'
              }`}
            >
              {item.ok ? 'ok' : 'no'}
            </span>
          </div>
        ))}
      </OpsSection>

      <OpsSection title="Check by hand">
        {MANUAL_ITEMS.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-[0.5rem] border-b border-white/5 py-[0.2rem]"
          >
            <input
              type="checkbox"
              checked={Boolean(checked[item.id])}
              onChange={(event) =>
                setChecked((current) => ({ ...current, [item.id]: event.target.checked }))
              }
              className="h-[0.8rem] w-[0.8rem] accent-gold-500"
            />
            <span
              className={`text-tv-xs ${checked[item.id] ? 'text-white/40 line-through' : 'text-white/75'}`}
            >
              {item.label}
            </span>
          </label>
        ))}
        <div className="pt-[0.4rem]">
          <OpsButton onClick={() => setChecked({})}>Reset checklist</OpsButton>
        </div>
      </OpsSection>

      <OpsSection title="Keys">
        <p className="text-[0.66rem] leading-relaxed text-white/45">
          <b className="text-white/70">1 / 2 / 3</b> live, board, rosters &middot;{' '}
          <b className="text-white/70">F</b> fullscreen &middot; <b className="text-white/70">M</b> audio
          &middot; <b className="text-white/70">C</b> this checklist &middot;{' '}
          <b className="text-white/70">Ctrl+Shift+D</b> commissioner panel &middot;{' '}
          <b className="text-white/70">Esc</b> clear a stuck reveal
          {settings.presentation.lowMotion ? ' · low-motion mode is on' : ''}
        </p>
      </OpsSection>
    </OpsPanel>
  );
}

function load(): Record<string, boolean> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
}

function save(value: Record<string, boolean>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore: the checklist is a convenience, not state the draft depends on.
  }
}
