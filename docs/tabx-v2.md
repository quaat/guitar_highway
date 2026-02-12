# TABX 2 (ASCII + Rhythm)

TABX 2 supports loose/common ASCII tab text and separates rhythm from spacing.

## Structure

- Header: `TABX 2`
- Optional `meta:` block (`title`, `artist`, `bpm`, `time`, `tuning`, `capo`, `resolution`, `backingtrack`, `playbackDelayMs`)
- One or more `tab:` blocks with six ASCII string lines (`e B G D A E`)
- Optional `rhythm:` block attached to the preceding `tab:` block

## Tab parsing

- Accepts classic lines like `e|---5h7---|---10b12--|`
- Multi-digit frets (`10`, `12`, `24`) are supported.
- Techniques are tokenized and attached as note metadata:
  - `h`, `p`, `b`, `r`, `/`, `\`, `~`, `t`, `s`, `S`, `=`, `*`, `tr`, `TP`, `PM`, `M`, `x`
- String labels normalize friendly variants (`b`/`H` => `B`).


### Backing track metadata

TABX 2 can define an optional backing track and a playback delay in milliseconds:

```yaml
meta:
  backingtrack: ./my-song.webm
  playbackDelayMs: 750
```

- `backingtrack` supports `.webm` and `.m4a` file paths/URLs.
- `playbackDelayMs` delays note/playback start so the backing track can align with incoming notes.

## Rhythm block

Rhythm is explicit and **not inferred from spacing**.

Supported forms:

```yaml
rhythm:
  resolution: 16
  bars: [16, 16, 16]
```

or list form:

```yaml
rhythm:
  resolution: 16
  bars:
    - 16
    - 16
```

Each bar has `resolution` slots. Unique note column groups are mapped into slots in order.

If `rhythm:` is missing, timing is approximated and a warning is emitted.


## Common rhythm pitfall (important)

If you omit `rhythm:`, TABX 2 intentionally **does not** infer exact timing from ASCII spacing.
The importer approximates timing from note-group order within each bar, which may sound uneven between bars when note counts/grouping differ.

For steady streams (for example, constant eighth notes in a riff), you should provide an explicit rhythm grid.

Example for 20 bars of straight eighth notes in 4/4:

```yaml
rhythm:
  resolution: 8
  bars: [8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8]
```

Also note: if your `tab:` starts with empty bars (e.g. `e|-------|----------|` etc.), those bars are imported as silence by design. Remove them if you do not want a pause before notes start.
