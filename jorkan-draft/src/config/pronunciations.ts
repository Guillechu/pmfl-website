import { LEAGUE } from './league';

/**
 * Pronunciation overrides for the announcer.
 *
 * The browser voice reads English; several team names, manager names and
 * player names in this league are not. Each rule replaces a phrase with a
 * phonetic respelling just before the line is spoken - the screen still shows
 * the real spelling.
 *
 * Add your own from the audio panel; they are stored in localStorage.
 */
export interface PronunciationRule {
  /** Text as it appears in the pick/team data. Matched case-insensitively. */
  match: string;
  /** Phonetic respelling handed to the speech engine. */
  say: string;
}

/** Player names the browser voice reliably gets wrong. */
const PLAYER_RULES: PronunciationRule[] = [
  { match: "Ja'Marr Chase", say: 'Juh-MAR Chase' },
  { match: 'Bijan Robinson', say: 'BEE-zhan Robinson' },
  { match: 'Jahmyr Gibbs', say: 'JAH-meer Gibbs' },
  { match: 'Amon-Ra St. Brown', say: 'AH-mon RAH Saint Brown' },
  { match: "De'Von Achane", say: 'DEH-von uh-SHAWN' },
  { match: 'Puka Nacua', say: 'POO-kuh nah-KOO-uh' },
  { match: 'Tetairoa McMillan', say: 'Teh-tie-ROH-uh Mick-MILL-un' },
  { match: 'Emeka Egbuka', say: 'Eh-MEH-kuh Egg-BOO-kuh' },
  { match: 'Jaxon Smith-Njigba', say: 'Jaxon Smith en-JIG-buh' },
  { match: "Ka'imi Fairbairn", say: 'Kah-EE-mee FAIR-bairn' },
  { match: 'Younghoe Koo', say: 'YUNG-hoe Koo' },
  { match: 'Rhamondre Stevenson', say: 'Ruh-MON-dray Stevenson' },
  { match: 'TreVeyon Henderson', say: 'Tray-VAY-on Henderson' },
  { match: 'Quinshon Judkins', say: 'QUIN-shawn Judkins' },
  { match: 'Bhayshul Tuten', say: 'BAY-shool TOO-ten' },
  { match: 'Chig Okonkwo', say: 'Chig oh-KONK-woe' },
  { match: "Ja'Tavion Sanders", say: 'Juh-TAY-vee-on Sanders' },
  { match: 'Isiah Pacheco', say: 'Ih-ZAY-uh puh-CHECK-oh' },
  { match: 'Cam Skattebo', say: 'Cam SKAT-uh-bo' },
  { match: 'Devaughn Vele', say: 'Duh-VON VELL-ay' },
  { match: 'Andrei Iosivas', say: 'AHN-dray yo-SEE-vus' },
  { match: 'D/ST', say: 'defense' },
];

/** Built from the league config so team and manager phonetics live in one place. */
function leagueRules(): PronunciationRule[] {
  const rules: PronunciationRule[] = [];
  for (const team of LEAGUE.teams) {
    if (team.phonetic) rules.push({ match: team.name, say: team.phonetic });
    if (team.manager.phonetic) rules.push({ match: team.manager.name, say: team.manager.phonetic });
  }
  return rules;
}

export const DEFAULT_PRONUNCIATIONS: PronunciationRule[] = [...leagueRules(), ...PLAYER_RULES];

const STORAGE_KEY = 'jorkan-draft.pronunciations.v1';

export function loadPronunciations(): PronunciationRule[] {
  if (typeof localStorage === 'undefined') return DEFAULT_PRONUNCIATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRONUNCIATIONS;
    const custom = JSON.parse(raw) as PronunciationRule[];
    if (!Array.isArray(custom)) return DEFAULT_PRONUNCIATIONS;
    // Custom rules win over defaults for the same phrase.
    const map = new Map(DEFAULT_PRONUNCIATIONS.map((rule) => [rule.match.toLowerCase(), rule]));
    for (const rule of custom) {
      if (rule && typeof rule.match === 'string' && typeof rule.say === 'string') {
        map.set(rule.match.toLowerCase(), rule);
      }
    }
    return [...map.values()];
  } catch {
    return DEFAULT_PRONUNCIATIONS;
  }
}

export function savePronunciations(rules: PronunciationRule[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Never let a storage failure stop the broadcast.
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Apply overrides, longest phrase first so "Los Badros" beats "Badros". */
export function applyPronunciations(text: string, rules: PronunciationRule[]): string {
  let output = text;
  const ordered = [...rules].sort((a, b) => b.match.length - a.match.length);
  for (const rule of ordered) {
    if (!rule.match) continue;
    const pattern = new RegExp(`(^|[^\\w])${escapeRegExp(rule.match)}(?=$|[^\\w])`, 'gi');
    output = output.replace(pattern, (_full, prefix: string) => `${prefix}${rule.say}`);
  }
  return output;
}
