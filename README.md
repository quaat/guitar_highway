# FretHighway 3D Prototype

An interactive 3D music visualization prototype built with React, Three.js, and TypeScript. It visualizes musical events on a 24x6 fretboard matrix moving toward the camera, laying the groundwork for rhythm game mechanics.

## 🚀 Quick Start

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run development server**:
    ```bash
    npm run dev
    ```
3.  Open `http://localhost:5173` (or the port shown in terminal).

## 🎮 Controls

*   **Play/Pause**: Toggle playback of the demo pattern.
*   **Reset**: Rewind to start.
*   **Speed**: Adjust how fast notes move toward the camera (World Units / Second).
*   **View Dist**: Adjust visibility depth (Fog and Clip distance).
*   **Camera**:
    *   Left Click + Drag: Rotate
    *   Right Click + Drag: Pan
    *   Scroll: Zoom

## 🏗 Architecture

### Domain (`/domain`)
*   **Mapping Logic**: `mapping.ts` is the source of truth for converting musical data `(fret, string, time)` into 3D world coordinates `(x, y, z)`.
*   **Separation of Concerns**: Rendering components simply query the domain logic. This allows easy swapping of visual styles (e.g. changing from horizontal to vertical highway) by updating one function.

### Rendering (`/render`)
*   **React Three Fiber**: Used for the declarative 3D scene.
*   **Performance**: Notes update their Z-position imperatively via `useFrame` and `Ref` manipulation, bypassing React's render cycle for smooth 60fps animation.
*   **Highway**: Static geometry visualizing the grid lanes.

### State (`/state`)
*   **Hybrid State**:
    *   React State: High-level config (Speed, View Distance) and Play/Pause status.
    *   Refs: `playheadTime` is mutable and read directly by the animation loop. This prevents re-rendering the entire React tree on every frame.

### Coordinate System
*   **X Axis**: Frets (1-24). 0 is roughly center.
*   **Y Axis**: Strings (1-6). 6 (Low E) is Top (+Y), 1 (High E) is Bottom (-Y).
*   **Z Axis**: Time. 0 is the "Now" plane. Negative Z is the future (notes coming from the distance).

## 🔮 Future Extensions

*   **Song Loading**: Parse MIDI or Guitar Pro files into `NoteEvent` objects in `domain/`.
*   **Input Handling**: Add a WebMIDI listener in `state/` to detect real guitar input.
*   **Scoring**: Implement a collision detection function in `domain/` comparing input timestamp vs. note timestamp at Z=0.

## 📄 TABX 2 Format Reference

The importer supports a `TABX 2` text format with a YAML-like structure.

### Required top-level structure

```txt
TABX 2

meta:
  ...optional metadata keys...

tab: <Section Name>
e|...|
B|...|
G|...|
D|...|
A|...|
E|...|

rhythm:
  resolution: <slots per bar>
  bars: [<bar1 slots>, <bar2 slots>, ...]
```

- First non-empty line must be exactly `TABX 2`.
- At least one `tab:` block is required.
- Each `tab:` block must contain all six strings in order: `e B G D A E`.
- `rhythm:` is optional, but strongly recommended for deterministic timing.

### `meta:` keys (all supported settings)

All `meta:` fields are optional except that `bpm`/timing fields fall back to defaults.

- `title: <string>`
- `artist: <string>`
- `bpm: <integer>` (default `120`)
- `time: <num>/<den>` (default `4/4`)
- `tuning: <6 pitches low-to-high>` (default `E2 A2 D3 G3 B3 E4`)
- `capo: <integer>` (default `0`)
- `resolution: <integer>` (default `16`)
- `backingtrack: <path-or-url>` (`.webm` and `.m4a` are supported in-app)
- `playbackDelayMs: <integer>` (default `0`)

Example:

```yaml
meta:
  title: Example Song
  artist: Example Band
  bpm: 128
  time: 4/4
  tuning: E2 A2 D3 G3 B3 E4
  capo: 0
  resolution: 16
  backingtrack: ./my-song.webm
  playbackDelayMs: 750
```

### Tab line syntax

- Notes are read from ASCII tab lines like `e|---5h7---10b12--|`.
- Multi-digit frets are supported (e.g. `10`, `12`, `24`).
- Supported technique tokens include:
  - `h`, `p`, `b`, `r`, `/`, `\`, `~`, `t`, `s`, `S`, `=`, `*`, `tr`, `TP`, `PM`, `M`, `x`

### `rhythm:` block syntax

Supported forms:

```yaml
rhythm:
  resolution: 16
  bars: [16, 16, 16]
```

or

```yaml
rhythm:
  resolution: 16
  bars:
    - 16
    - 16
```

- `resolution` defines the number of timing slots per bar.
- `bars` defines per-bar slot counts for the section.
- If `rhythm:` is omitted, timing is approximated from note grouping in each bar.

### Playback behavior for backing tracks

- Visual note playback starts immediately when you click **Play**.
- If `backingtrack` is set, backing audio starts after `playbackDelayMs`.
- Use positive delay values when your track should start later than the notes.
