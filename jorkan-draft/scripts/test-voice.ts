/**
 * Announcer voice selection.
 *
 *   npm run test:voice
 *
 * The brief is a woman's voice, as natural as the machine can manage. Nothing
 * in the Web Speech API reports either gender or quality, so both are
 * recognised by name - which makes this exactly the kind of rule that needs
 * checking against the voice lists real machines actually report.
 */
import { scoreVoice } from '../src/audio/tts/SpeechSynthesisProvider';

const failures: string[] = [];
function check(condition: boolean, name: string, detail = ''): void {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name} ${detail}`);
    failures.push(name);
  }
}

type Voice = { name: string; lang: string; localService: boolean };

/** Pick the way the provider does: highest score, ties by list order. */
function pick(voices: Voice[]): string {
  const best = [...voices]
    .map((v) => ({ v, score: scoreVoice(v.name, v.lang, v.localService) }))
    .sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.v.name : 'none';
}

/** Chrome on Windows, with no Edge neural voices installed. */
const CHROME_WINDOWS: Voice[] = [
  { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
  { name: 'Microsoft Mark - English (United States)', lang: 'en-US', localService: true },
  { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true },
  { name: 'Google Deutsch', lang: 'de-DE', localService: false },
  { name: 'Google español', lang: 'es-ES', localService: false },
  { name: 'Google US English', lang: 'en-US', localService: false },
  { name: 'Google UK English Female', lang: 'en-GB', localService: false },
  { name: 'Google UK English Male', lang: 'en-GB', localService: false },
];

/** Edge on Windows, where the neural voices show up. */
const EDGE_WINDOWS: Voice[] = [
  ...CHROME_WINDOWS,
  { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', localService: false },
  { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US', localService: false },
  { name: 'Microsoft Christopher Online (Natural) - English (United States)', lang: 'en-US', localService: false },
];

/** A machine with nothing but the old local engines. */
const BARE: Voice[] = [
  { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
  { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true },
];

/** A machine with no English at all. */
const SPANISH_ONLY: Voice[] = [
  { name: 'Google español', lang: 'es-ES', localService: false },
  { name: 'Microsoft Helena - Spanish (Spain)', lang: 'es-ES', localService: true },
];

console.log('Announcer voice selection');

check(
  pick(CHROME_WINDOWS) === 'Google UK English Female',
  'Chrome/Windows picks the streamed woman\'s voice',
  pick(CHROME_WINDOWS),
);
check(
  pick(EDGE_WINDOWS) === 'Microsoft Aria Online (Natural) - English (United States)',
  'Edge/Windows picks a neural woman\'s voice',
  pick(EDGE_WINDOWS),
);
check(pick(BARE) === 'Microsoft Zira - English (United States)', 'a bare machine still gets a woman', pick(BARE));
check(pick(SPANISH_ONLY) === 'none', 'no English means no default rather than a wrong one', pick(SPANISH_ONLY));

// Men's voices are never the default, however modern they are.
check(
  scoreVoice('Microsoft Guy Online (Natural) - English (United States)', 'en-US', false) < 0,
  'a neural man outranks nothing',
);
check(scoreVoice('Google UK English Male', 'en-GB', false) < 0, 'nor does a streamed one');
// "female" ends in "male"; the word boundaries are what keep them apart.
check(scoreVoice('Google UK English Female', 'en-GB', false) > 0, 'and Female is not read as Male');
check(
  scoreVoice('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false) >
    scoreVoice('Microsoft Zira - English (United States)', 'en-US', true),
  'neural beats the old local engine by a distance',
);
check(
  scoreVoice('Google UK English Female', 'en-GB', false) >
    scoreVoice('Microsoft Zira - English (United States)', 'en-US', true),
  'streamed beats local when neither is neural',
);
check(scoreVoice('Google Deutsch', 'de-DE', false) < 0, 'another language is never chosen');

if (failures.length > 0) {
  console.error(`\n${failures.length} failing check(s): ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll voice checks passed.');
