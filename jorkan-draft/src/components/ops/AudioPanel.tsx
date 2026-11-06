import { useMemo, useState } from 'react';
import { patchAudio } from '@/state/settingsStore';
import { useRuntime, useSettings, useUi } from '@/state/hooks';
import { getDirector } from '@/audio/Director';
import { SpeechSynthesisProvider } from '@/audio/tts/SpeechSynthesisProvider';
import { loadPronunciations, savePronunciations, type PronunciationRule } from '@/config/pronunciations';
import { MOCK_PLAYER_POOL } from '@/data/mockPlayers';
import { LEAGUE } from '@/config/league';
import { pickLine } from '@/audio/phrases';
import { armPresentation } from '@/state/useAudioDirector';
import { OpsButton, OpsPanel, OpsRow, OpsSection, OpsSlider, OpsToggle } from './OpsPanel';

/** Volume mixer, voice settings and pronunciation overrides. Key: M */
export function AudioPanel({ onClose }: { onClose: () => void }) {
  const runtime = useRuntime();
  const ui = useUi();
  const settings = useSettings();
  const audio = settings.audio;
  const director = getDirector(runtime);
  const status = director.status();

  const voices = director.getAnnouncer().getProvider().voices();
  const [rulesText, setRulesText] = useState(() => rulesToText(loadPronunciations()));
  const [savedNote, setSavedNote] = useState('');

  const samplePick = useMemo(() => {
    const player = MOCK_PLAYER_POOL[0];
    const team = LEAGUE.teams[0];
    if (!player || !team) return null;
    return {
      overallPick: 1,
      round: 1,
      pickInRound: 1,
      player,
      fantasyTeamId: team.id,
      fantasyTeamName: team.name,
      managerName: team.manager.name,
      timestamp: Date.now(),
      eventId: 'audio-panel-test',
    };
  }, []);

  return (
    <OpsPanel title="Audio" subtitle="Mixer, announcer and pronunciations" onClose={onClose}>
      <OpsSection title="Levels">
        <OpsSlider label="Master" value={audio.master} onChange={(master) => patchAudio({ master })} />
        <OpsSlider label="Music bed" value={audio.music} onChange={(music) => patchAudio({ music })} />
        <OpsSlider label="Sound effects" value={audio.sfx} onChange={(sfx) => patchAudio({ sfx })} />
        <OpsSlider label="Announcer" value={audio.announcer} onChange={(announcer) => patchAudio({ announcer })} />
        <OpsSlider
          label="Duck under announcer"
          value={audio.duckLevel}
          onChange={(duckLevel) => patchAudio({ duckLevel })}
        />
        <div className="grid grid-cols-2 gap-x-[0.9rem] gap-y-[0.2rem] pt-[0.35rem] [&>label]:rounded-[0.18rem] [&>label]:border [&>label]:border-ink/8 [&>label]:bg-ink/[0.03] [&>label]:px-[0.4rem] [&>label]:py-[0.18rem]">
          <OpsToggle label="Mute all" checked={audio.muted} onChange={(muted) => patchAudio({ muted })} />
          <OpsToggle label="Music" checked={audio.musicEnabled} onChange={(musicEnabled) => patchAudio({ musicEnabled })} />
          <OpsToggle label="Effects" checked={audio.sfxEnabled} onChange={(sfxEnabled) => patchAudio({ sfxEnabled })} />
          <OpsToggle
            label="Announcer"
            checked={audio.announcerEnabled}
            onChange={(announcerEnabled) => patchAudio({ announcerEnabled })}
          />
          <OpsToggle
            label="Countdown ticks"
            checked={audio.countdownEnabled}
            onChange={(countdownEnabled) => patchAudio({ countdownEnabled })}
          />
        </div>
      </OpsSection>

      <OpsSection title="Announcer voice">
        <label className="block">
          <span className="font-display text-tv-xs uppercase tracking-[0.16em] text-ink/55">Voice</span>
          <select
            value={audio.voiceId ?? ''}
            onChange={(event) => patchAudio({ voiceId: event.target.value || null })}
            className="mt-[0.2rem] w-full rounded-[0.2rem] border border-ink/15 bg-surface-850 px-[0.4rem] py-[0.25rem] text-tv-xs text-ink"
          >
            <option value="">Best available (a woman's voice, most natural first)</option>
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {(voice.quality ?? 0) >= 150 ? '\u2605 ' : ''}
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </label>
        <p className="text-tv-xs leading-relaxed text-ink/45">
          Voices marked &#9733; are neural and sound closest to a real announcer. If none are
          listed, open this presentation in Microsoft Edge instead of Chrome - the extension
          works there too, and Edge ships the natural voices Chrome does not.
        </p>
        <OpsSlider
          label="Rate"
          value={audio.voiceRate}
          min={0.6}
          max={1.4}
          step={0.02}
          onChange={(voiceRate) => patchAudio({ voiceRate })}
          format={(value) => value.toFixed(2)}
        />
        <OpsSlider
          label="Pitch"
          value={audio.voicePitch}
          min={0.5}
          max={1.5}
          step={0.02}
          onChange={(voicePitch) => patchAudio({ voicePitch })}
          format={(value) => value.toFixed(2)}
        />
        {/*
          Everything below is silent until a click unlocks the browser's
          audio, and the only place to do that used to be the pre-draft
          screen - so pressing "Test announcer" after a mid-draft reload did
          nothing at all, with no way to tell why.
        */}
        {!ui.armed ? (
          <p className="pt-[0.2rem] text-tv-xs leading-relaxed text-gold-600">
            Sound is off until you enable it - the browser blocks audio until something is
            clicked. Press <strong>Enable sound</strong> below or in the header.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-[0.3rem] pt-[0.2rem]">
          {!ui.armed ? (
            <OpsButton tone="primary" onClick={() => void armPresentation()}>
              Enable sound
            </OpsButton>
          ) : null}
          <OpsButton
            tone="primary"
            onClick={() => {
              if (samplePick) director.getAnnouncer().say(pickLine(samplePick));
            }}
          >
            Test announcer
          </OpsButton>
          <OpsButton onClick={() => director.getEngine().playSfx('on-the-clock')}>On the clock</OpsButton>
          <OpsButton onClick={() => director.getEngine().playSfx('countdown')}>Countdown</OpsButton>
          <OpsButton onClick={() => director.getAnnouncer().cancel()} tone="danger">
            Stop voice
          </OpsButton>
        </div>
      </OpsSection>

      <OpsSection title="Music">
        <label className="block">
          <span className="font-display text-tv-xs uppercase tracking-[0.16em] text-ink/55">
            Intro track URL
          </span>
          <input
            type="text"
            value={audio.introUrl ?? ''}
            onChange={(event) => patchAudio({ introUrl: event.target.value || null })}
            spellCheck={false}
            className="mt-[0.2rem] w-full rounded-[0.2rem] border border-ink/15 bg-surface-850 px-[0.4rem] py-[0.25rem] text-[0.65rem] text-ink/80"
          />
        </label>
        <div className="flex flex-wrap gap-[0.3rem]">
          <OpsButton onClick={() => void director.getEngine().playIntro(audio.introUrl)}>Play intro</OpsButton>
          <OpsButton onClick={() => director.getEngine().fadeOutIntro(1200)}>Fade intro</OpsButton>
          <OpsButton onClick={() => director.getEngine().startBed()}>Start bed</OpsButton>
          <OpsButton onClick={() => director.getEngine().stopBed()}>Stop bed</OpsButton>
        </div>
        <OpsRow label="Bed source" value={status.audio.bedSource} />
        <OpsRow label="Audio context" value={status.audio.contextState} />
        <OpsRow
          label="Custom files"
          value={status.audio.loadedFiles.length > 0 ? status.audio.loadedFiles.join(', ') : 'using built-in cues'}
        />
      </OpsSection>

      <OpsSection title="Pronunciations">
        <p className="text-[0.65rem] leading-relaxed text-ink/40">
          One rule per line, as <span className="text-ink/70">name = how to say it</span>. Applies to the
          spoken line only; the screen keeps the real spelling.
        </p>
        <textarea
          value={rulesText}
          onChange={(event) => setRulesText(event.target.value)}
          spellCheck={false}
          rows={8}
          className="w-full rounded-[0.2rem] border border-ink/15 bg-surface-850 px-[0.4rem] py-[0.3rem] font-mono text-[0.65rem] leading-relaxed text-ink/80"
        />
        <div className="flex items-center gap-[0.3rem]">
          <OpsButton
            tone="primary"
            onClick={() => {
              savePronunciations(textToRules(rulesText));
              director.getAnnouncer().reloadPronunciations();
              setSavedNote('Saved');
              setTimeout(() => setSavedNote(''), 1800);
            }}
          >
            Save
          </OpsButton>
          <OpsButton
            onClick={() => {
              savePronunciations([]);
              director.getAnnouncer().reloadPronunciations();
              setRulesText(rulesToText(loadPronunciations()));
            }}
          >
            Reset to defaults
          </OpsButton>
          {savedNote ? <span className="text-tv-xs text-emerald-700">{savedNote}</span> : null}
        </div>
      </OpsSection>

      <OpsSection title="Announcer status">
        <OpsRow label="Engine" value={status.announcer.provider} />
        <OpsRow label="Ready" value={status.announcer.ready ? 'yes' : 'no'} />
        <OpsRow label="Voices" value={status.announcer.voices} />
        <OpsRow label="Queued" value={status.announcer.queued} />
        <OpsRow label="Last line" value={status.announcer.lastLine || '--'} />
      </OpsSection>
    </OpsPanel>
  );
}

function rulesToText(rules: PronunciationRule[]): string {
  return rules.map((rule) => `${rule.match} = ${rule.say}`).join('\n');
}

function textToRules(text: string): PronunciationRule[] {
  return text
    .split('\n')
    .map((line) => line.split('='))
    .filter((parts) => parts.length >= 2)
    .map((parts) => ({
      match: (parts[0] ?? '').trim(),
      say: parts.slice(1).join('=').trim(),
    }))
    .filter((rule) => rule.match && rule.say);
}
