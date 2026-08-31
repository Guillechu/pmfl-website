import { useState } from 'react';
import { useDraft, useRuntime } from '@/state/hooks';
import type { SimulatorProvider } from '@/providers/SimulatorProvider';
import { OpsButton, OpsPanel, OpsRow, OpsSection, OpsSlider } from './OpsPanel';

/**
 * Fake-ESPN control panel. Development only - it never ships in a production
 * build and it cannot touch a real ESPN draft.
 */
export function SimulatorPanel({ onClose }: { onClose: () => void }) {
  const runtime = useRuntime();
  const state = useDraft();
  const simulator = runtime.getSimulator();
  const [, force] = useState(0);

  if (!simulator) {
    return (
      <OpsPanel title="Simulator" subtitle="Not attached" onClose={onClose} side="left">
        <p className="text-tv-xs leading-relaxed text-white/50">
          The presentation is attached to the real ESPN feed. Attaching the simulator replaces that
          feed with a fake one - never do this while a real draft is running.
        </p>
        <div className="mt-[0.6rem]">
          <OpsButton tone="danger" onClick={() => void runtime.useSimulator()}>
            Attach simulator
          </OpsButton>
        </div>
      </OpsPanel>
    );
  }

  const options = simulator.getOptions();
  const update = (patch: Parameters<SimulatorProvider['setOptions']>[0]) => {
    simulator.setOptions(patch);
    force((n) => n + 1);
  };

  return (
    <OpsPanel title="Draft simulator" subtitle="Development only" onClose={onClose} side="left" width="26rem">
      <OpsSection title="Transport">
        <div className="flex flex-wrap gap-[0.3rem]">
          <OpsButton onClick={() => void runtime.useEspn()}>Back to ESPN</OpsButton>
          <OpsButton tone="primary" onClick={() => simulator.startDraft()}>
            Start draft
          </OpsButton>
          <OpsButton onClick={() => simulator.pause()}>Pause</OpsButton>
          <OpsButton onClick={() => simulator.resume()}>Resume</OpsButton>
          <OpsButton onClick={() => simulator.pickNow()}>Pick now</OpsButton>
          <OpsButton
            onClick={() => {
              for (let i = 0; i < 600; i += 1) simulator.advance(1000);
            }}
          >
            Skip 10 min
          </OpsButton>
          <OpsButton tone="danger" onClick={() => { simulator.reset(); runtime.resetPresentation(); }}>
            Reset
          </OpsButton>
        </div>
      </OpsSection>

      <OpsSection title="Pace">
        <OpsSlider
          label="Speed"
          value={options.speed}
          min={1}
          max={60}
          step={1}
          onChange={(speed) => update({ speed })}
          format={(value) => `${value}x`}
        />
        <OpsSlider
          label="Fastest pick"
          value={options.minThinkMs / 1000}
          min={1}
          max={120}
          step={1}
          onChange={(seconds) => update({ minThinkMs: seconds * 1000 })}
          format={(value) => `${value}s`}
        />
        <OpsSlider
          label="Slowest pick"
          value={options.maxThinkMs / 1000}
          min={5}
          max={300}
          step={5}
          onChange={(seconds) => update({ maxThinkMs: seconds * 1000 })}
          format={(value) => `${value}s`}
        />
      </OpsSection>

      <OpsSection title="Chaos (reliability testing)">
        <OpsSlider
          label="Drop live pick events"
          value={options.dropRate}
          onChange={(dropRate) => update({ dropRate })}
        />
        <OpsSlider
          label="Duplicate events"
          value={options.duplicateRate}
          onChange={(duplicateRate) => update({ duplicateRate })}
        />
        <p className="text-[0.65rem] leading-relaxed text-white/40">
          Dropped events must be recovered by the reconcile pass, and duplicates must never reach the
          screen twice. Both are what the extension will really do on a bad night.
        </p>
      </OpsSection>

      <OpsSection title="State">
        <OpsRow label="Simulator phase" value={simulator.getSimPhase()} />
        <OpsRow label="Presentation phase" value={state.phase} />
        <OpsRow label="Pick" value={`${state.round}.${String(state.pickInRound).padStart(2, '0')}`} />
        <OpsRow label="Overall" value={state.overallPick} />
        <OpsRow label="Picks recorded" value={state.picks.length} />
        <OpsRow label="On the clock" value={state.onTheClock?.fantasyTeamName ?? '--'} />
      </OpsSection>
    </OpsPanel>
  );
}
