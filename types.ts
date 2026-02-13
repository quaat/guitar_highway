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

export interface VisualSettings {
  visualQuality: 'low' | 'medium' | 'high';
  enableHighwayEffects: boolean;
  enableNoteEffects: boolean;
  enableParticles: boolean;
  enableBackground: boolean;
  enablePostProcessing: boolean;
  enableCameraMotion: boolean;
  enableTempoReactiveLights: boolean;
}

export const STRING_COLORS = [
  '#ef4444', // 1: Red (Low E - wait, usually 6 is Low E in tabs, but Rocksmith flips visual)
             // Let's stick to standard Rocksmith-like:
             // E (Red), A (Yellow), D (Blue), G (Orange), B (Green), e (Purple)
             // We will map index 1-6 to these.
             // Let's assume String 6 is Low E (Thickest) -> Red
  '#ef4444', // 1 bottom lane color - Red
  '#eab308', // 2 - Yellow
  '#3b82f6', // 3 - Blue
  '#f97316', // 4 - Orange
  '#22c55e', // 5 - Green
  '#9333ea', // 6 top lane color - Purple
];

// Map 1-based string index to color
export const getStringColor = (strIndex: number): string => {
  // Clamp 1-6
  const idx = Math.max(1, Math.min(6, strIndex));
  return STRING_COLORS[idx]; // 0 is unused in this mapping if we want to match string numbers directly, let's fix array
};

export const STRING_COLORS_MAP: Record<number, string> = {
  1: '#ef4444', // bottom lane - Red
  2: '#eab308', // Yellow
  3: '#3b82f6', // Blue
  4: '#f97316', // Orange
  5: '#22c55e', // Green
  6: '#9333ea', // top lane - Purple
};
