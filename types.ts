export interface NoteEvent {
  id: string;
  fret: number;   // 1 to 24
  string: number; // 1 to 6
  time: number;   // seconds
  duration?: number;
  color?: string;
}

export type NoteLifecycleState = 'incoming' | 'atHitLine' | 'expired';

export interface RuntimeNoteState {
  id: string;
  state: NoteLifecycleState;
  hitAtTime?: number;
  expiresAtTime?: number;
}

export interface HitVisualConfig {
  emissiveBoost?: number;
  pulse?: boolean;
}

export interface HighwayConfig {
  fretSpacing: number;
  stringSpacing: number;
  speed: number;       // Units per second
  viewDistance: number;
  laneWidth: number;   // Visual width of the highway
  laneHeight: number;  // Visual height of the highway
  hitLineZ: number;
  hitHoldMs: number;
  hitVisual?: HitVisualConfig;
}

export interface CameraConfig {
  fov: number;
  position: [number, number, number];
  target: [number, number, number];
}

export const STRING_COLORS = [
  '#ef4444',
  '#9333ea',
  '#22c55e',
  '#f97316',
  '#3b82f6',
  '#eab308',
  '#ef4444',
];

export const getStringColor = (strIndex: number): string => {
  const idx = Math.max(1, Math.min(6, strIndex));
  return STRING_COLORS[idx];
};

export const STRING_COLORS_MAP: Record<number, string> = {
  1: '#9333ea', // High E
  2: '#22c55e', // B
  3: '#f97316', // G
  4: '#3b82f6', // D
  5: '#eab308', // A
  6: '#ef4444', // Low E
};
