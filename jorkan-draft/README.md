# Jorkan League Draft Night 2026

A live TV broadcast for the Jorkan League fantasy football draft.

**ESPN is the draft. This is the broadcast.** Managers pick on ESPN exactly as
they always have. A read-only Chrome extension watches the ESPN draft room and
mirrors it here: the pick appears, the announcer calls it, the next team goes
on the clock. Nobody ever enters a pick twice.

```
ESPN draft room  ──▶  Chrome extension  ──▶  TV presentation
   (the draft)         (reads only)          (the show)
```

---

## Contents

- [Installation](#installation)
- [First time setup](#first-time-setup)
- [Chrome extension installation](#chrome-extension-installation)
- [How to connect ESPN](#how-to-connect-espn)
- [How to test with an ESPN mock draft](#how-to-test-with-an-espn-mock-draft)
- [How to open TV mode](#how-to-open-tv-mode)
- [How to use the HDMI second display](#how-to-use-the-hdmi-second-display)
- [How to arm audio](#how-to-arm-audio)
- [How to test the announcer](#how-to-test-the-announcer)
- [How to change the music](#how-to-change-the-music)
- [How to change the sound effects](#how-to-change-the-sound-effects)
- [How to change team data](#how-to-change-team-data)
- [How to resync](#how-to-resync)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)
- [Draft day checklist](#draft-day-checklist)
- [How it works](#how-it-works)
- [Development](#development)
- [Privacy and safety](#privacy-and-safety)

---

## Installation

Requirements: **Windows**, **Google Chrome**, and **Node.js 20 or newer**
(the LTS installer from [nodejs.org](https://nodejs.org) is fine). No Docker,
no WSL, no database, nothing in the cloud.

```powershell
cd jorkan-draft
npm install
```

## First time setup

The simplest path is the launcher, which installs dependencies, builds the
extension, starts the server and opens the presentation:

```
start-jorkan-draft.bat
```

Or do it by hand:

```powershell
npm install
npm run build:extension
npm run dev
```

Then open <http://localhost:5173/presentation>.

## Chrome extension installation

Only needed once (and again whenever you rebuild it).

1. Build it: `npm run build:extension`
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the folder `jorkan-draft\extension\dist`

You should see **Jorkan League Draft Bridge**. Pin it to the toolbar - its
popup is the quickest way to confirm the bridge is alive.

The extension asks for exactly one permission (`storage`) and runs only on
`fantasy.espn.com` and `localhost`.

## How to connect ESPN

There is nothing to log into and no ESPN password to enter anywhere in this
app. It reads the draft room you already have open in your own Chrome.

1. Open the presentation: <http://localhost:5173/presentation>
2. Open the ESPN draft room in a **second Chrome window** (same Chrome profile)
3. The presentation's status pill turns to **ESPN SYNCED**

If it does not, click the extension icon: the popup tells you whether it can
see the draft room, whether the observer is watching, and whether it can see
the presentation tab.

## How to test with an ESPN mock draft

**Do this before draft night.** It is the only way to confirm the parser reads
the real ESPN draft room correctly.

1. Start the presentation and make sure the extension is loaded.
2. On ESPN: *Fantasy Football → Mock Draft Lobby → join a mock draft.*
3. Press **Ctrl + Shift + D** in the presentation to open the commissioner
   panel, and turn **debug capture on**.
4. Let the mock draft run for a handful of picks.
5. Watch the **ESPN vs presentation** table in the commissioner panel. Round,
   pick, overall, team on the clock and the clock itself should agree. Any row
   that disagrees turns red.
6. Click **Pull from extension**, then **Export JSON**, and keep that file.

That export contains sanitised structure from the real draft room (no
credentials, cookies or personal data) and is exactly what is needed to adapt
the parser if any field reads wrong.

> **Status, honestly.** Two practice drafts in the real 2026 ESPN draft room
> have been captured and the parser rebuilt around what they showed.
>
> Read from the room and **verified against that captured markup**: the round,
> the overall pick, the team on the clock, the team on deck, and the pick
> clock. (The clock was invisible in the first captures - ESPN builds it out
> of separate elements, so nothing on the page owns the text "00:30" - and
> `npm run test:espn-fixture` now proves it reads.)
>
> **Not yet verified against a live draft:** the completed board. The picks
> already made are not in the room's markup at all, so they come from ESPN's
> own read-only draft feed. Our mapping from that feed to what the TV shows is
> tested; ESPN's live response shape is not, because only a real draft can
> show it. The extension popup names the board's source - it should say
> **ESPN draft feed** - so you can tell in one glance whether it worked, and
> the debug export has a section that says exactly what the feed answered.

## How to open TV mode

The presentation *is* TV mode. It is designed for 1920x1080 and scales
proportionally to 1440p and 4K.

- Press **F** for fullscreen (or arm the presentation, which does it for you).
- Press **1**, **2**, **3** to switch between **Live**, **Draft board** and
  **Team rosters**. Switching views never affects ESPN.

## How to use the HDMI second display

1. Connect the TV over HDMI.
2. Press **Windows + P** and choose **Extend**.
3. Set the TV to 1920x1080 or higher (Settings → System → Display).
4. Drag the presentation window onto the TV, click it once, press **F**.
5. Leave the ESPN draft room on the laptop screen.

Chrome keeps the two windows independent, so ESPN can stay visible on the
laptop while the TV shows the broadcast.

## How to arm audio

Browsers refuse to play sound until someone interacts with the page, so before
the draft the presentation shows one button: **ARM PRESENTATION**.

It unlocks the audio context, warms up the announcer voice, starts the intro
music and goes fullscreen. **It does not start the draft.** After arming, the
screen says *waiting for ESPN draft* and stays there until ESPN puts El Dandy
on the clock for pick 1.01.

## How to test the announcer

Press **M** for the audio panel:

- **Test announcer** reads a sample pick
- **Test pick sound**, **On the clock**, **Countdown** fire the effects
- **Voice** picks the browser voice; **Rate** and **Pitch** shape it
- **Pronunciations** is a plain list of `name = how to say it` rules

Pronunciations only change what is *spoken* - the screen always shows the real
spelling. Defaults are included for the team names, manager names and the
player names browser voices get wrong.

If the voice list is empty, Windows has no speech voices installed:
*Settings → Time & language → Speech → Manage voices → Add voices.*

## How to change the music

Two ways, and a local file always wins:

1. **Drop in a file.** Put `intro.mp3` (pre-draft) or `draft-bed.mp3`
   (background bed, must loop cleanly) into `public/audio/`, then reload.
2. **Use a hosted URL.** Press **M** and paste a link into **Intro track URL**.
   Dropbox share links are converted to a direct-play URL automatically, so a
   `?dl=0` link works as-is.

With no file and no reachable URL, the presentation plays an original
generated bed - quiet, seamless, and nothing to license. The bed ducks
automatically whenever the announcer speaks; the depth is the **Duck under
announcer** slider.

## How to change the sound effects

Drop MP3s into `public/audio/` using these names:

| File | Plays when |
| --- | --- |
| `pick-is-in.mp3` | ESPN registers a selection |
| `on-the-clock.mp3` | A new team goes on the clock |
| `countdown.mp3` | Each of the last ten seconds |
| `transition.mp3` | Between the reveal and the next team, and on round changes |
| `draft-complete.mp3` | ESPN reports the draft finished |

Anything you do not supply uses the built-in synthesised cue. `public/audio/README.md`
has the details, and the audio panel shows which custom files were loaded.

## How to change team data

Team names, managers, draft order, colours, abbreviations, ESPN aliases and
announcer phonetics all live in one file:

```
src/config/league.ts
```

The draft order there is used for validation, for on-deck lookahead, and to
recognise a team when ESPN's wording is unusual - but **ESPN always wins** on
who is actually picking. `aliases` is the list of alternate spellings to match
against ESPN text; add one if a team gets renamed mid-draft.

Roster shape (QB, RB, RB, WR, WR, TE, FLEX, K, DEF plus six bench) is in the
same file, as `STARTER_SLOTS` and `BENCH_SLOTS`.

## How to resync

The presentation reconciles with ESPN every second and a half on its own, so
this is rarely needed. If something looks wrong:

1. **Ctrl + Shift + D** → **Resync** - forces a fresh full read of ESPN.
2. Still wrong → **Reconnect ESPN** - rebuilds the connection to the extension.
3. Still wrong → reload the presentation tab (**F5**). It restores from the
   extension's mirror: the board comes back, and nothing is re-announced.
4. Extension itself stuck → `chrome://extensions` → reload the extension, then
   refresh the ESPN tab.

You never lose the draft by refreshing. ESPN holds the truth; everything here
rebuilds from it.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `1` / `2` / `3` | Live view / draft board / team rosters |
| `F` | Fullscreen |
| `M` | Audio panel |
| `C` | Draft day checklist |
| `S` | Simulator panel (development only) |
| `Ctrl + Shift + D` | Commissioner / debug panel |
| `Esc` | Clear a stuck pick reveal |

## Troubleshooting

**Status says NO ESPN LINK**
The extension is not loaded, or the presentation is not on `localhost`. Check
`chrome://extensions`, and make sure the URL is `http://localhost:5173/presentation`
(not a file:// path or a different port).

**Status says ESPN SYNCED but nothing happens**
ESPN has not started the draft yet - that is the correct behaviour. Confirm
with the extension popup that it can see the draft room.

**Status says ESPN STALE**
No update from ESPN for twelve seconds during a live draft. Usually the ESPN
tab was closed or navigated away. Reopen the draft room; it recovers on its own.

**The board is empty, or picks never appear**
Open the extension popup and read **Board source**. It should say *ESPN draft
feed*. If it says *no picks yet* once the draft is under way, the feed did not
answer: make sure the draft room tab is the one you are signed in on, and that
the URL still carries `leagueId` and `seasonId`. The popup also shows the
first warning, and the debug export has an **ESPN DRAFT FEED** section saying
exactly what happened. Everything else on the TV - round, pick, team, clock -
keeps working meanwhile.

**The board is missing some picks**
Open **Ctrl + Shift + D** and compare the ESPN column with the presentation
column. Press **Resync**. If ESPN's own column is also wrong, the parser needs
adapting - turn on debug capture and export the JSON.

**The board fills in but nothing was announced**
That is deliberate when the presentation joins a draft already in progress:
picks that happened before anyone was watching fill the board silently, and
the next live pick is announced normally.

**No sound**
Did you press **ARM PRESENTATION**? Check the audio panel shows *audio context:
running*, and that Windows is playing sound through the TV
(*Settings → System → Sound → Output*).

**Announcer is silent but effects play**
No speech voices installed, or the announcer is muted. Check the voice list in
the audio panel.

**Announcer talks over itself**
It cannot - announcements are queued. If a line seems late, it is waiting for
the pick reveal to finish, which is deliberate.

**The reveal is stuck on screen**
Press **Esc**.

**Everything is tiny or huge on the TV**
The layout scales from the window size. Make sure the window is fullscreen on
the TV and the TV is at its native resolution. There is also a UI scale in the
presentation settings if a TV overscans.

**Chrome says the extension is "unpacked"**
That is expected. It is a local extension, not one from the Web Store.

## Draft day checklist

Press **C** in the presentation for the live version - it ticks off everything
it can verify itself.

- [ ] Chrome updated
- [ ] Extension loaded and enabled (`chrome://extensions`)
- [ ] Signed in to ESPN
- [ ] ESPN draft room open in its own window
- [ ] Presentation open at `http://localhost:5173/presentation`
- [ ] Status pill shows **ESPN SYNCED**
- [ ] Extension popup shows **Board source: ESPN draft feed**
- [ ] TV connected over HDMI, display extended
- [ ] TV at 1920x1080 or higher
- [ ] Presentation fullscreen on the TV
- [ ] Audio armed and coming out of the TV
- [ ] Announcer tested
- [ ] Intro music tested
- [ ] Background bed tested
- [ ] Pick sound tested
- [ ] Sleep and screensaver disabled
- [ ] Laptop charger connected
- [ ] VPN disabled
- [ ] Notifications silenced
- [ ] Mock draft sync tested end to end

## How it works

```
ESPN draft room tab
  └─ content script (read-only)
       ├─ MutationObserver ......... a pick shows within a frame or two
       ├─ reconcile pass, 1.5s ..... a missed mutation is caught in seconds
       └─ ESPN draft feed, 2.5s .... the completed board, GET only
            │
            ▼
     background service worker
       ├─ authoritative mirror of the draft
       ├─ deduplication: leagueId + overallPick + playerId + team
       └─ persistence, so a reload restores instead of replaying
            │
            ▼
     bridge content script  ──window.postMessage──▶  presentation
                                                      └─ state machine
                                                           ├─ draft state
                                                           └─ effects: audio,
                                                              reveal, board
```

### Where each thing is read from

| What the TV shows | Where it comes from |
| --- | --- |
| Round, pick number | ESPN's current-pick module (`On the Clock: Pick 104`) |
| Team on the clock | the same module's `title`, cross-checked against the league |
| Team on deck | ESPN's upcoming-picks strip (`PICK 105 / Los Badros`) |
| Pick clock | ESPN's countdown, read from the page |
| **Every completed pick** | **ESPN's own read-only draft feed** |

The board needs its own paragraph, because it is the one thing that is *not*
in the draft room's markup. ESPN renders the picks still to come along the
top, and the selections already made are simply not there to read - a whole
practice draft was captured without one appearing. Reading them off the
screen would mean asking the commissioner to keep a particular panel open all
night and losing every pick made while it was not.

So the extension asks ESPN the same question ESPN's own draft room asks: a
`GET` to ESPN's read replica for the league's draft detail, made from the
draft room's own tab, so the session the commissioner already has open is the
one that answers. That keeps ESPN the single source of truth for every pick,
which is the entire point of the project. It cannot write: the host has no
write endpoints and the extension only ever issues `GET`. If the feed is
unreachable the parser carries on reading the clock, the round and who is on
the clock exactly as before, the popup says the board has no source, and
nothing is invented to fill the gap.

Two rules the design is built around:

1. **One owner for draft state.** Every change goes through one reducer, and
   every side effect - a sound, an announcement, an animation - is emitted
   from that reducer exactly once. "Never announce a pick twice" is a property
   of the system, not a hope.
2. **ESPN wins every disagreement.** The configured draft order is used for
   validation and for filling gaps, never to override what ESPN says.

The clock works the same way: ESPN's reading is authoritative, and the digits
are only interpolated locally between readings so they do not sit frozen.

## Development

```powershell
npm run dev              # presentation at http://localhost:5173/presentation
npm run build            # typecheck + production build
npm run build:extension  # build extension/dist
npm run watch:extension  # rebuild the extension on change
npm run check            # typecheck + all tests
npm run test:sim         # four full 180-pick drafts + reconnect checks
npm run test:extension   # extension mirror: dedupe, phases, worker restarts
npm run test:espn-api    # draft feed -> presentation-ready picks
npm run test:espn-fixture# the parser against captured ESPN 2026 markup
npm run analyze:debug -- export.json   # read a debug export from a real room
```

**Fixtures.** `fixtures/espn-2026-draft-room.html` is captured markup from a
real Jorkan League practice draft, not markup written to make a test pass;
`npm run test:espn-fixture` runs the shipping parser over it in a real
Chromium. `npm run test:espn-api` proves the mapping from a draft-detail
document to picks - it does not prove ESPN's live response shape, which only
a real draft can, so the popup names the board's source at a glance.

**Simulator.** Add `?sim=1` to the URL, or press **S**, to drive a fake draft
with no ESPN involved. It emits the same events the extension does and can
misbehave on purpose - dropping live pick events and duplicating them - to
prove the reconcile and dedupe paths hold. On draft night the real feed is the
default and the simulator is never attached unless you ask for it.

**Layout.** Everything is sized in `rem` against one root font-size, so the
whole presentation scales proportionally from 1080p to 4K. Design tokens live
in `tailwind.config.ts`.

```
src/
  types/       domain models
  config/      league, settings, pronunciations
  core/        state machine, dedupe, snake order, clock, roster assignment
  providers/   DraftProvider interface, ESPN provider, simulator
  audio/       engine, generated cues and bed, announcer, TTS abstraction
  state/       runtime, stores, hooks
  components/  screens, broadcast panels, operator panels
extension/
  src/content/ observer, parser, MAIN-world probe, debug collector
  src/bridge/  presentation bridge
  src/mirror.ts  pure dedupe/diff logic (unit tested)
  src/background.ts
```

## Privacy and safety

- The extension is **read only**. It never clicks, never submits, never
  changes ESPN's state, and cannot make a pick.
- **Only this presentation can talk to the extension.** Chrome match patterns
  cannot name a port, so the bridge script is injected into every page served
  from `localhost` - it therefore refuses to attach unless the page is on port
  5173 (which Vite pins), and re-checks before relaying anything. The
  background worker independently verifies that every message and every
  connection comes from this extension and from the origin appropriate to its
  role: the ESPN reader must be on `fantasy.espn.com`, the presentation on the
  local port above. Without those checks Chrome's defaults would let any other
  installed extension, or any page on any local port, ask for the draft mirror
  and the debug capture.
- If you change the presentation's port, change `PRESENTATION_PORT` in
  `shared/protocol.ts`: the server, the bridge and those origin checks all
  read it from there.
- No ESPN credentials are asked for, stored or transmitted. It reads the
  draft room you already have open.
- No cookies, tokens, storage or browsing data are read or collected. The
  draft feed is fetched from the draft room's own tab, so the browser attaches
  whatever session is already signed in - the extension never reads a cookie,
  never stores one and never sends one anywhere.
- The only host the extension talks to is ESPN itself, and only to read.
- Debug capture records draft-room structure only, with long opaque strings
  and anything token-shaped redacted before it leaves the page.
- Nothing is sent anywhere. Everything runs on your laptop: no server, no
  account, no cloud.
- Audio ships as original generated sound; no copyrighted music is bundled.
