import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BroadcastFrame } from '@/components/broadcast/BroadcastFrame';
import { HeaderBar } from '@/components/broadcast/HeaderBar';
import { Ticker } from '@/components/broadcast/Ticker';
import { RoundBanner } from '@/components/broadcast/RoundBanner';
import { RehearsalBadge } from '@/components/broadcast/RehearsalBadge';
import { FeedStalled } from '@/components/broadcast/FeedStalled';
import { PickReveal } from '@/components/overlays/PickReveal';
import { LiveScreen } from '@/components/screens/LiveScreen';
import { PreDraftScreen } from '@/components/screens/PreDraftScreen';
import { BoardScreen } from '@/components/screens/BoardScreen';
import { RostersScreen } from '@/components/screens/RostersScreen';
import { CompleteScreen } from '@/components/screens/CompleteScreen';
import { useDraft, useRuntime, useSettings, useSyncStatus, useUi } from '@/state/hooks';
import { AudioPanel } from '@/components/ops/AudioPanel';
import { DebugPanel } from '@/components/ops/DebugPanel';
import { ChecklistPanel } from '@/components/ops/ChecklistPanel';
import { SimulatorPanel } from '@/components/ops/SimulatorPanel';
import { useBootstrap } from '@/state/useBootstrap';
import { useKeyboardShortcuts } from '@/state/useKeyboardShortcuts';
import { armPresentation, useAudioDirector } from '@/state/useAudioDirector';
import { cn } from '@/lib/cn';

export default function App() {
  const runtime = useRuntime();
  const state = useDraft();
  const status = useSyncStatus();
  const ui = useUi();
  const settings = useSettings();

  useBootstrap();
  useKeyboardShortcuts();
  useAudioDirector();

  useEffect(() => {
    runtime.setRevealSeconds(settings.presentation.revealSeconds);
  }, [runtime, settings.presentation.revealSeconds]);

  const preDraft = state.phase === 'idle' || state.phase === 'waiting';

  return (
    <div
      className={cn('h-full w-full', settings.presentation.lowMotion && 'low-motion')}
      style={{ fontSize: `${settings.presentation.uiScale * 100}%` }}
      data-jorkan-presentation="1"
    >
      <BroadcastFrame>
        {preDraft ? (
          <PreDraftScreen armed={ui.armed} onArm={() => void armPresentation()} />
        ) : (
          <>
            <HeaderBar
              state={state}
              status={status}
              view={ui.view}
              onViewChange={(view) => runtime.setView(view)}
              armed={ui.armed}
              onArm={() => void armPresentation()}
            />
            {state.phase === 'complete' ? (
              <CompleteScreen state={state} view={ui.view} />
            ) : ui.view === 'board' ? (
              <BoardScreen state={state} />
            ) : ui.view === 'rosters' ? (
              <RostersScreen state={state} />
            ) : (
              <LiveScreen state={state} />
            )}
            {settings.presentation.showTicker ? (
              <div className="h-[3.1rem] shrink-0">
                <Ticker state={state} />
              </div>
            ) : null}
          </>
        )}

        <RehearsalBadge />
        <FeedStalled />
        <RoundBanner round={ui.roundBanner} />
        <PickReveal reveal={ui.reveal} />

        <AnimatePresence>
          {ui.showDebug ? <DebugPanel key="debug" onClose={() => runtime.toggle('showDebug')} /> : null}
          {ui.showMixer ? <AudioPanel key="audio" onClose={() => runtime.toggle('showMixer')} /> : null}
          {ui.showChecklist ? (
            <ChecklistPanel key="checklist" onClose={() => runtime.toggle('showChecklist')} />
          ) : null}
          {ui.showSimulator && import.meta.env.DEV ? (
            <SimulatorPanel key="sim" onClose={() => runtime.toggle('showSimulator')} />
          ) : null}
        </AnimatePresence>
      </BroadcastFrame>
    </div>
  );
}
