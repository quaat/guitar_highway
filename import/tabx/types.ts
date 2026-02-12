export type PitchName = `${'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'}${'' | '#'}${number}`;

export interface TabxMeta {
  title?: string;
  artist?: string;
  bpm: number;
  timeSig: {
    num: number;
    den: number;
  };
  tuning: PitchName[]; // low-to-high E A D G B e
  capo: number;
  resolution: number;
}

export interface TabxNoteCell {
  stringIndex: number; // 0=high e, 5=low E
  col: number;
  fret: number;
}

export interface TabxBar {
  index: number;
  events: TabxNoteCell[];
}

export interface TabxSection {
  name: string;
  bars: TabxBar[];
}

export interface TabxSong {
  meta: TabxMeta;
  sections: TabxSection[];
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  contextLine: string;
}
