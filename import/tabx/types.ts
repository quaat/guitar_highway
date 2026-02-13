export type PitchName = `${'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'}${'' | '#'}${number}`;

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  near: number;
  far: number;
  rotationEuler?: [number, number, number];
  damping?: number;
  transitionMs?: number;
}

export type TabxCameraPartialConfig = Partial<CameraConfig>;

export interface TabxMeta {
  title?: string;
  artist?: string;
  bpm: number;
  backingtrack?: string;
  playbackDelayMs: number;
  timeSig: {
    num: number;
    den: number;
  };
  tuning: PitchName[]; // low-to-high E A D G B e
  capo: number;
  resolution: number;
}

export interface TabxTechnique {
  symbol: string;
  text?: string;
  connectsToCol?: number;
}

export interface TabxNoteCell {
  stringIndex: number; // 0=high e, 5=low E
  col: number;
  fret: number;
  slot?: number;
  techniques?: TabxTechnique[];
}

export interface TabxBar {
  index: number;
  events: TabxNoteCell[];
  rhythmResolution?: number;
}

export interface TabxTempoEvent {
  at: {
    bar: number;
    slot: number;
  };
  bpm: number;
}

export interface TabxCameraEvent {
  at: {
    bar: number;
    slot: number;
  };
  config: TabxCameraPartialConfig;
}

export interface TabxCameraTimeline {
  snapshots?: Record<string, CameraConfig>;
  defaults?: CameraConfig;
  events?: TabxCameraEvent[];
}

export interface TabxDurationEvent {
  at: {
    bar: number;
    slot: number;
  };
  string: number;
  durationSlots: number;
}

export interface TabxFretFocusEvent {
  at: {
    bar: number;
    slot: number;
  };
  min: number;
  max: number;
}

export interface TabxFretFocusTimeline {
  defaults?: {
    min: number;
    max: number;
  };
  events?: TabxFretFocusEvent[];
}

export interface TabxSection {
  name: string;
  bars: TabxBar[];
  tempoEvents?: TabxTempoEvent[];
  durationEvents?: TabxDurationEvent[];
}

export interface TabxSong {
  meta: TabxMeta;
  sections: TabxSection[];
  camera?: TabxCameraTimeline;
  fretFocus?: TabxFretFocusTimeline;
}

export interface ParseDiagnostic {
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  contextLine: string;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  contextLine: string;
}
