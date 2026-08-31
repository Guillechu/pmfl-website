# Audio

The presentation ships with **original synthesised cues and a generated music
bed**, so it has sound out of the box with nothing to download and nothing to
license. Everything here is optional: drop a file in and it takes over.

## Files the engine looks for

| File | Used for | If missing |
| --- | --- | --- |
| `intro.mp3` | Pre-draft music on the waiting screen | Falls back to the hosted intro URL in the Audio panel |
| `draft-bed.mp3` | Background bed during the draft (must loop cleanly) | Generated bed is used |
| `pick-is-in.mp3` | The hit when ESPN registers a selection | Synthesised brass hit |
| `on-the-clock.mp3` | New team on the clock | Synthesised two-note call |
| `countdown.mp3` | Ticks under ten seconds | Synthesised tick |
| `transition.mp3` | Between the pick reveal and the next team (also used for round changes) | Synthesised whoosh |
| `draft-complete.mp3` | Draft complete | Synthesised fanfare |

Drop a file in this folder with the exact name, then reload the presentation.
The Audio panel (press **M**) shows which custom files were loaded.

## Guidance

- Keep the bed quiet and unobtrusive. It ducks automatically while the
  announcer speaks; the ducking depth is set in the Audio panel.
- The bed must loop seamlessly - trim it on a bar boundary with no silence at
  either end.
- Use music you have the right to play. Do not put copyrighted broadcast music
  here.
- MP3 is the safest format; Chrome also accepts `.m4a`, `.ogg` and `.wav` if
  you rename the file to `.mp3`-free equivalents in `AudioEngine.ts`.
