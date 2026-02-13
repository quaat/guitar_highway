export interface NoteEvent {
  id: string;
  fret: number;   // 1 to 24
  string: number; // 1 to 6
  time: number;   // seconds
  duration?: number;
  color?: string;
  midi?: number;
  techniques?: Array<{ symbol: string; text?: string; connectsToCol?: number }>;
}

export interface SongMeta {
  title?: string;
  artist?: string;
  bpm: number;
  backingtrack?: string;
  playbackDelayMs: number;
  timeSig: { num: number; den: number };
  tuning: string[];
  capo: number;
  resolution: number;
}

export interface HighwayConfig {
  fretSpacing: number;
  stringSpacing: number;
  speed: number;       // Units per second
  viewDistance: number;
  laneWidth: number;   // Visual width of the highway
  laneHeight: number;  // Visual height of the highway
  stringGlowDistance?: number;
  laneGlowDistance?: number;
  maxStringGlowIntensity?: number;
  maxLaneGlowIntensity?: number;
  minFret?: number;
  maxFret?: number;
}

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  position: [number, number, number];
  target: [number, number, number];
  rotationEuler?: [number, number, number];
  damping?: number;
  transitionMs?: number;
}

export interface CameraSnapshot {
  name: string;
  config: CameraConfig;
}

export const STRING_COLORS = [
  '#ef4444', // 1: Red (Low E - wait, usually 6 is Low E in tabs, but Rocksmith flips visual)
             // Let's stick to standard Rocksmith-like:
             // E (Red), A (Yellow), D (Blue), G (Orange), B (Green), e (Purple)
             // We will map index 1-6 to these.
             // Let's assume String 6 is Low E (Thickest) -> Red
  '#9333ea', // 1 e (High) - Purple
  '#22c55e', // 2 B - Green
  '#f97316', // 3 G - Orange
  '#3b82f6', // 4 D - Blue
  '#eab308', // 5 A - Yellow
  '#ef4444', // 6 E (Low) - Red
];

// Map 1-based string index to color
export const getStringColor = (strIndex: number): string => {
  // Clamp 1-6
  const idx = Math.max(1, Math.min(6, strIndex));
  return STRING_COLORS[idx]; // 0 is unused in this mapping if we want to match string numbers directly, let's fix array
};

export const STRING_COLORS_MAP: Record<number, string> = {
  1: '#9333ea', // High E
  2: '#22c55e', // B
  3: '#f97316', // G
  4: '#3b82f6', // D
  5: '#eab308', // A
  6: '#ef4444', // Low E
};
