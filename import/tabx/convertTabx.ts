import { NoteEvent, STRING_COLORS_MAP } from '../../types';
import { PitchName, TabxSong } from './types';

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

export const pitchNameToMidi = (pitch: PitchName): number => {
  const match = pitch.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid pitch format: ${pitch}`);
  }
  const [, note, octaveStr] = match;
  return (Number(octaveStr) + 1) * 12 + NOTE_TO_SEMITONE[note];
};

export const midiFromStringFret = (
  tuning: PitchName[],
  capo: number,
  stringIndexHighToLow: number,
  fret: number,
): number => {
  const lowToHighIndex = 5 - stringIndexHighToLow;
  const openMidi = pitchNameToMidi(tuning[lowToHighIndex]);
  return openMidi + capo + fret;
};

export interface ConvertedSong {
  notes: NoteEvent[];
  totalBars: number;
  totalNotes: number;
}

export const convertTabxToEvents = (song: TabxSong): ConvertedSong => {
  const notes: NoteEvent[] = [];
  const { bpm, timeSig, resolution, tuning, capo } = song.meta;
  const beatDurationSec = 60 / bpm;
  const barDurationSec = beatDurationSec * timeSig.num * (4 / timeSig.den);
  let sectionStartSec = 0;
  let idCounter = 0;

  song.sections.forEach((section) => {
    section.bars.forEach((bar, barIdx) => {
      const barStartSec = sectionStartSec + barIdx * barDurationSec;
      bar.events.forEach((event) => {
        const time = barStartSec + (event.col * barDurationSec) / resolution;
        const string = 6 - event.stringIndex;
        notes.push({
          id: `tabx-${idCounter++}`,
          time,
          fret: event.fret,
          string,
          duration: 0.12,
          color: STRING_COLORS_MAP[string],
          midi: midiFromStringFret(tuning, capo, event.stringIndex, event.fret),
        } as NoteEvent & { midi: number });
      });
    });
    sectionStartSec += section.bars.length * barDurationSec;
  });

  notes.sort((a, b) => a.time - b.time);

  return {
    notes,
    totalBars: song.sections.reduce((sum, section) => sum + section.bars.length, 0),
    totalNotes: notes.length,
  };
};
