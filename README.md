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
