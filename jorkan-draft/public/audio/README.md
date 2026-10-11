# Audio

The presentation ships with **original synthesised cues and a generated music
bed**, so it has sound out of the box with nothing to download and nothing to
license. Everything here is optional: drop a file in and it takes over.

## Files the engine looks for

| Name | Used for | If missing |
| --- | --- | --- |
| `intro` | Pre-draft music on the waiting screen | Falls back to the hosted intro URL in the Audio panel, then the generated bed |
| `draft-bed` | Background bed during the draft (must loop cleanly) | Generated bed is used |
| `on-the-clock` | New team on the clock - the turn changing hands | Synthesised church bell |
| `countdown` | Each of the last five seconds of a pick | Synthesised clock tick |
| `transition` | Between the pick reveal and the next team (also used for round changes) | Synthesised whoosh |
| `draft-complete` | Draft complete | Synthesised fanfare |

Any of `.mp3`, `.m4a`, `.ogg` or `.wav` - the engine tries each in that order,
so whatever the file arrived as will do. Drop it in this folder under the
exact name, then reload the presentation. The Audio panel (press **M**) lists
the custom files that loaded, by full filename, so you can see at a glance
whether yours was picked up.

Nothing you put here is committed: `.gitignore` in this folder keeps these
files on the machine running the show.

## Guidance

- Keep the bed quiet and unobtrusive. It ducks automatically while the
  announcer speaks; the ducking depth is set in the Audio panel.
- The bed must loop seamlessly - trim it on a bar boundary with no silence at
  either end.
- Use music you have the right to play, and keep it to your own copy for your
  own draft night - these files are deliberately kept out of the repository so
  nothing here is redistributed.
