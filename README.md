# FretHighway 3D Prototype

An interactive 3D music visualization prototype built with React, Three.js, and TypeScript. It visualizes musical events on a 24x6 fretboard matrix moving toward the camera, with a dedicated hit-line lifecycle for “play now” timing.

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Run development server**:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` (or the port shown in terminal).

## 🎮 Controls

- **Play/Pause**: Toggle playback of the demo pattern.
- **Reset**: Rewind to start.
- **Speed**: Adjust how fast notes move toward the camera (World Units / Second).
- **View Dist**: Adjust visibility depth.
- **Camera**:
  - Left Click + Drag: Rotate
  - Right Click + Drag: Pan
  - Scroll: Zoom

## 🏁 Hit Line Behavior

- A hit line is defined at `z = hitLineZ` (default `0`).
- Notes move toward the camera, then clamp exactly to the hit line once reached.
- Lifecycle states are tracked at runtime (without mutating source song events):
  - `incoming`
  - `atHitLine`
  - `expired`
- At `atHitLine`, notes receive a “play now” visual highlight (emissive boost + optional pulse).
- After `hitHoldMs`, notes transition to `expired` and are hidden.
- Chord notes (same timestamp) remain synchronized because lifecycle updates happen in one shared runtime state map.

## ⚙️ Config

`HighwayConfig` includes:

- `hitLineZ: number`
  - Z plane used as the stop/trigger line.
- `hitHoldMs: number`
  - How long a note stays highlighted at the hit line before disappearing.
- `hitVisual?: { emissiveBoost?: number; pulse?: boolean }`
  - Optional visual tuning for the hit state.

## 🏗 Architecture

### Domain (`/domain`)

- **Mapping Logic**: `mapping.ts` converts `(fret, string, time)` to 3D coordinates and clamps note depth to the hit line.
- **Lifecycle Logic**: `noteLifecycle.ts` owns frame-rate-independent runtime state transitions (`incoming` → `atHitLine` → `expired`) and expiry timing.

### Rendering (`/render`)

- **React Three Fiber** drives real-time scene updates.
- **Runtime state separation**: notes read lifecycle from a dedicated runtime map, keeping source `NoteEvent[]` immutable.
- **Hit visuals**: notes pulse/emissive-highlight at the hit line before disappearing.
- **Highway transparency**: opaque lane body removed; only subtle, transparent orientation lines remain.

### State (`/state`)

- **Hybrid State**:
  - React State: High-level config and Play/Pause status.
  - Refs: `playheadTime` and runtime note-state map are read directly by frame loops.

## 🧪 Tests

Run domain tests:

```bash
npm test
```

Covered behavior:

- Z clamping at hit line (`z` never exceeds `hitLineZ`)
- Lifecycle transitions: `incoming` → `atHitLine` → `expired`
- Expiry timing rules
- Chord synchronization at hit/expiry boundaries

## 🔮 Future Extensions

- **Song Loading**: Parse MIDI or Guitar Pro files into `NoteEvent` objects in `domain/`.
- **Input Handling**: Add a WebMIDI listener in `state/` to detect real guitar input.
- **Scoring**: Implement timing windows around the hit line for real gameplay feedback.
