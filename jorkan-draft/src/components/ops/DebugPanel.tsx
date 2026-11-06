import { useEffect, useState } from 'react';
import { useDraft, useRuntime, useSyncStatus } from '@/state/hooks';
import { getDirector } from '@/audio/Director';
import { EspnDraftProvider } from '@/providers/EspnDraftProvider';
import { LEAGUE } from '@/config/league';
import { formatClock } from '@/core/clock';
import { MOCK_PLAYER_POOL } from '@/data/mockPlayers';
import {
  clearDebug,
  debugEntries,
  downloadDebugJson,
  isDebugEnabled,
  setDebugEnabled,
  subscribeDebug,
} from '@/debug/logger';
import { toggleFullscreen } from '@/state/useKeyboardShortcuts';
import { OpsButton, OpsPanel, OpsRow, OpsSection } from './OpsPanel';

/**
 * Commissioner / debug panel. Ctrl + Shift + D.
 *
 * Shows ESPN's view and the presentation's view side by side so a
 * disagreement is obvious at a glance, and offers recovery tools. The manual
 * override exists only to rescue a broken night - it is never the normal way
 * to run the draft.
 */
export function DebugPanel({ onClose }: { onClose: () => void }) {
  const runtime = useRuntime();
  const state = useDraft();
  const status = useSyncStatus();
  const director = getDirector(runtime);
  const provider = runtime.getProvider();
  const espn = provider instanceof EspnDraftProvider ? provider : null;

  const [, bump] = useState(0);
  useEffect(() => subscribeDebug(() => bump((n) => n + 1)), []);
  useEffect(() => {
    const timer = setInterval(() => bump((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const espnView = status.espnSnapshot;
  const summary = runtime.machineSummary();
  const audio = director.status();
  const entries = debugEntries();

  const mismatch = (a: unknown, b: unknown) => (a === null || a === undefined ? false : a !== b);

  return (
    <OpsPanel
      title="Commissioner panel"
      subtitle="Ctrl + Shift + D · diagnostics and recovery"
      onClose={onClose}
      width="35rem"
    >
      <OpsSection title="ESPN connection">
        <OpsRow label="Connection" value={status.connection} />
        <OpsRow label="Provider" value={status.provider} />
        <OpsRow label="League id" value={LEAGUE.espnLeagueId} />
        <OpsRow label="ESPN tab detected" value={status.espnTabDetected ? 'yes' : 'no'} />
        <OpsRow label="DOM observer" value={status.observerActive ? 'watching' : 'idle'} />
        <OpsRow label="Extension version" value={status.extensionVersion ?? '--'} />
        <OpsRow
          label="Parser confidence"
          value={status.parserConfidence === null ? '--' : `${Math.round(status.parserConfidence * 100)}%`}
        />
        <OpsRow label="Last ESPN event" value={ago(status.lastEventAt)} />
        <OpsRow label="Last reconcile" value={ago(status.lastReconcileAt)} />
      </OpsSection>

      <OpsSection title="ESPN vs presentation">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-[0.7rem] text-tv-xs">
          <span className="font-display uppercase tracking-[0.14em] text-ink/35">Field</span>
          <span className="font-display uppercase tracking-[0.14em] text-ink/35">ESPN</span>
          <span className="font-display uppercase tracking-[0.14em] text-ink/35">TV</span>

          <Compare label="Round" espn={espnView?.round ?? null} tv={state.round} mismatch={mismatch} />
          <Compare label="Pick" espn={espnView?.pickInRound ?? null} tv={state.pickInRound} mismatch={mismatch} />
          <Compare label="Overall" espn={espnView?.overallPick ?? null} tv={state.overallPick} mismatch={mismatch} />
          <Compare
            label="On the clock"
            espn={espnView?.onTheClock?.fantasyTeamName ?? null}
            tv={state.onTheClock?.fantasyTeamName ?? '--'}
            mismatch={mismatch}
          />
          <Compare
            label="Clock"
            espn={espnView?.clockMs === null || espnView?.clockMs === undefined ? null : formatClock(espnView.clockMs)}
            tv={formatClock(state.clock.remainingMs)}
            mismatch={mismatch}
          />
          <Compare label="Phase" espn={espnView?.phase ?? null} tv={state.phase} mismatch={mismatch} />
          {/* ESPN reads carry only recent history by design, so this row is
              informational rather than a mismatch check. */}
          <Compare
            label="Picks in read / total"
            espn={espnView?.picks.length ?? null}
            tv={state.picks.length}
            mismatch={() => false}
          />
        </div>
        {status.drift.length > 0 ? (
          <p className="mt-[0.4rem] rounded-[0.2rem] border border-gold-500/40 bg-gold-500/10 px-[0.5rem] py-[0.3rem] text-tv-xs text-gold-300">
            Last correction: {status.drift.map((entry) => `${entry.field} ${entry.espn} → ${entry.presentation}`).join(', ')}
          </p>
        ) : null}
      </OpsSection>

      <OpsSection title="Parser strategies">
        {Object.keys(status.strategies).length === 0 ? (
          <p className="text-tv-xs text-ink/40">No parse reported yet.</p>
        ) : (
          Object.entries(status.strategies).map(([field, strategy]) => (
            <OpsRow key={field} label={field} value={strategy} />
          ))
        )}
      </OpsSection>

      <OpsSection title="Presentation">
        <OpsRow label="Last processed pick" value={lastPickLabel(state.picks[state.picks.length - 1])} />
        <OpsRow label="Dedupe entries" value={summary.seenCount} />
        <OpsRow label="Hydrated" value={summary.hydrated ? 'yes' : 'no'} />
        <OpsRow label="Reveal queue" value={runtime.ui.get().reveal ? 'showing' : 'idle'} />
      </OpsSection>

      <OpsSection title="Audio">
        <OpsRow label="Audio context" value={audio.audio.contextState} />
        <OpsRow label="Music bed" value={audio.audio.bedRunning ? audio.audio.bedSource : 'stopped'} />
        <OpsRow label="Ducked" value={audio.audio.ducked ? 'yes' : 'no'} />
        <OpsRow label="Speech engine" value={audio.announcer.provider} />
        <OpsRow label="Speech ready" value={audio.announcer.ready ? `yes (${audio.announcer.voices} voices)` : 'no'} />
        <OpsRow label="Announcer queue" value={audio.announcer.queued} />
      </OpsSection>

      <OpsSection title="Controls">
        <div className="flex flex-wrap gap-[0.3rem]">
          <OpsButton tone="primary" onClick={() => void runtime.resync()}>
            Resync
          </OpsButton>
          <OpsButton onClick={() => void runtime.useEspn()}>Reconnect ESPN</OpsButton>
          <OpsButton onClick={() => director.getAnnouncer().say('Announcer check. Jorkan League draft night.')}>
            Test announcer
          </OpsButton>
          <OpsButton onClick={() => testReveal(runtime)}>Test player reveal</OpsButton>
          <OpsButton onClick={() => void toggleFullscreen()}>Fullscreen</OpsButton>
          <OpsButton onClick={() => runtime.clearReveal()}>Clear reveal</OpsButton>
        </div>
      </OpsSection>

      <OpsSection title="ESPN debug capture">
        <p className="text-[0.65rem] leading-relaxed text-ink/40">
          Records sanitised draft-room structure so the parser can be adapted to what ESPN actually
          renders. No credentials, cookies or browsing data are ever collected.
        </p>
        <div className="flex flex-wrap gap-[0.3rem]">
          <OpsButton
            tone={isDebugEnabled() ? 'primary' : 'default'}
            onClick={() => {
              const next = !isDebugEnabled();
              setDebugEnabled(next);
              espn?.setDebugCapture(next);
              bump((n) => n + 1);
            }}
          >
            {isDebugEnabled() ? 'Capture on' : 'Capture off'}
          </OpsButton>
          <OpsButton onClick={() => espn?.requestDebugExport()} disabled={!espn}>
            Pull from extension
          </OpsButton>
          <OpsButton
            onClick={() =>
              downloadDebugJson({
                league: LEAGUE.espnLeagueId,
                status,
                presentation: {
                  phase: state.phase,
                  round: state.round,
                  pickInRound: state.pickInRound,
                  overallPick: state.overallPick,
                  picks: state.picks.length,
                },
              })
            }
          >
            Export JSON
          </OpsButton>
          <OpsButton onClick={() => clearDebug()}>Clear log</OpsButton>
        </div>
        <div className="mt-[0.4rem] max-h-[12rem] overflow-y-auto rounded-[0.2rem] border border-ink/10 bg-surface-950/60 p-[0.4rem] font-mono text-[0.6rem] leading-relaxed text-ink/60">
          {entries.length === 0 ? (
            <p className="text-ink/25">No entries yet.</p>
          ) : (
            entries
              .slice(-60)
              .reverse()
              .map((entry, index) => (
                <div key={`${entry.at}-${index}`} className="border-b border-ink/5 py-[0.1rem]">
                  <span className="text-ink/30">{new Date(entry.at).toLocaleTimeString()} </span>
                  <span className="text-gold-500">{entry.kind}</span> {entry.message}
                </div>
              ))
          )}
        </div>
      </OpsSection>
    </OpsPanel>
  );
}

function Compare({
  label,
  espn,
  tv,
  mismatch,
}: {
  label: string;
  espn: string | number | null;
  tv: string | number;
  mismatch: (a: unknown, b: unknown) => boolean;
}) {
  const bad = mismatch(espn, tv);
  return (
    <>
      <span className="border-b border-ink/5 py-[0.12rem] text-ink/45">{label}</span>
      <span className={`tabular border-b border-ink/5 py-[0.12rem] text-right ${bad ? 'text-alert-500' : 'text-ink/80'}`}>
        {espn ?? '--'}
      </span>
      <span className={`tabular border-b border-ink/5 py-[0.12rem] text-right ${bad ? 'text-alert-500' : 'text-ink/80'}`}>
        {tv}
      </span>
    </>
  );
}

function ago(at: number | null): string {
  if (!at) return 'never';
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 1) return 'just now';
  if (seconds < 90) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

function lastPickLabel(pick: { round: number; pickInRound: number; player: { name: string } } | undefined): string {
  if (!pick) return '--';
  return `${pick.round}.${String(pick.pickInRound).padStart(2, '0')} ${pick.player.name}`;
}

/** Fires the reveal choreography with a sample pick, without touching state. */
function testReveal(runtime: ReturnType<typeof useRuntime>): void {
  const player = MOCK_PLAYER_POOL[0];
  const team = LEAGUE.teams[0];
  if (!player || !team) return;
  runtime.previewReveal({
    pick: {
      overallPick: 1,
      round: 1,
      pickInRound: 1,
      player,
      fantasyTeamId: team.id,
      fantasyTeamName: team.name,
      managerName: team.manager.name,
      timestamp: Date.now(),
      eventId: `debug-preview-${Date.now()}`,
    },
    stage: 'incoming',
    startedAt: Date.now(),
  });
}
