import { NoteEvent, STRING_COLORS_MAP } from '../../types';
import { CameraConfig, PitchName, TabxSong } from './types';

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
  if (!match) throw new Error(`Invalid pitch format: ${pitch}`);
  const [, note, octaveStr] = match;
  return (Number(octaveStr) + 1) * 12 + NOTE_TO_SEMITONE[note];
};

export const midiFromStringFret = (tuning: PitchName[], capo: number, stringIndexHighToLow: number, fret: number): number => {
  const lowToHighIndex = 5 - stringIndexHighToLow;
  const openMidi = pitchNameToMidi(tuning[lowToHighIndex]);
  return openMidi + capo + fret;
};

export interface ConvertedSong {
  notes: NoteEvent[];
  totalBars: number;
  totalNotes: number;
  tempoMap?: Array<{ timeSec: number; bpm: number }>;
  cameraDefaults?: CameraConfig;
  cameraTimeline?: Array<{ timeSec: number; config: Partial<CameraConfig> }>;
  fretFocusDefaults?: { min: number; max: number };
  fretFocusTimeline?: Array<{ timeSec: number; min: number; max: number }>;
}

export const tabxSongToEvents = (song: TabxSong): ConvertedSong => {
  const notes: NoteEvent[] = [];
  const cameraTimeline: Array<{ timeSec: number; config: Partial<CameraConfig> }> = [];
  const fretFocusTimeline: Array<{ timeSec: number; min: number; max: number }> = [];
  const { bpm: defaultBpm, timeSig, tuning, capo, resolution } = song.meta;
  const tempoMap: Array<{ timeSec: number; bpm: number }> = [];
  const quartersPerBar = timeSig.num * (4 / timeSig.den);

  let sectionStartSec = 0;
  let idCounter = 0;
  let globalBarOffset = 0;

  const cameraEvents = [...(song.camera?.events ?? [])].sort((a, b) => (a.at.bar === b.at.bar ? a.at.slot - b.at.slot : a.at.bar - b.at.bar));
  let cameraEventIndex = 0;

  const fretFocusEvents = [...(song.fretFocus?.events ?? [])].sort((a, b) => (a.at.bar === b.at.bar ? a.at.slot - b.at.slot : a.at.bar - b.at.bar));
  let fretFocusEventIndex = 0;

  song.sections.forEach((section) => {
    const slotTimes = new Map<string, number>();
    const tempoByPosition = new Map<string, number>();
    (section.tempoEvents ?? []).forEach((event) => {
      tempoByPosition.set(`${event.at.bar}:${event.at.slot}`, event.bpm);
    });

    let currentBpm = defaultBpm;
    let elapsedInSectionSec = 0;

    if (tempoByPosition.has('0:0')) currentBpm = tempoByPosition.get('0:0')!;
    tempoMap.push({ timeSec: sectionStartSec, bpm: currentBpm });

    section.bars.forEach((bar, barIdx) => {
      const barResolution = Math.max(1, bar.rhythmResolution ?? resolution);
      const slotDurationForBpm = (activeBpm: number) => (60 / activeBpm) * (quartersPerBar / barResolution);

      for (let slot = 0; slot < barResolution; slot += 1) {
        const key = `${barIdx}:${slot}`;
        if (tempoByPosition.has(key)) {
          const nextBpm = tempoByPosition.get(key)!;
          if (nextBpm !== currentBpm || tempoMap.length === 0) {
            currentBpm = nextBpm;
            tempoMap.push({ timeSec: sectionStartSec + elapsedInSectionSec, bpm: currentBpm });
          }
        }

        const absTime = sectionStartSec + elapsedInSectionSec;
        slotTimes.set(key, absTime);

        const globalBar = globalBarOffset + barIdx;
        while (cameraEventIndex < cameraEvents.length) {
          const nextEvent = cameraEvents[cameraEventIndex];
          if (nextEvent.at.bar !== globalBar || nextEvent.at.slot !== slot) break;
          cameraTimeline.push({ timeSec: absTime, config: nextEvent.config });
          cameraEventIndex += 1;
        }

        while (fretFocusEventIndex < fretFocusEvents.length) {
          const nextEvent = fretFocusEvents[fretFocusEventIndex];
          if (nextEvent.at.bar !== globalBar || nextEvent.at.slot !== slot) break;
          fretFocusTimeline.push({ timeSec: absTime, min: nextEvent.min, max: nextEvent.max });
          fretFocusEventIndex += 1;
        }

        elapsedInSectionSec += slotDurationForBpm(currentBpm);
      }

      bar.events.forEach((event) => {
        const slot = event.slot ?? Math.round((event.col / Math.max(1, resolution - 1)) * Math.max(0, barResolution - 1));
        const boundedSlot = Math.max(0, Math.min(barResolution - 1, slot));
        const time = slotTimes.get(`${barIdx}:${boundedSlot}`) ?? sectionStartSec + elapsedInSectionSec;
        const string = 6 - event.stringIndex;
        notes.push({
          id: `tabx-${idCounter++}`,
          time,
          fret: event.fret,
          string,
          duration: 0.12,
          color: STRING_COLORS_MAP[string],
          midi: midiFromStringFret(tuning, capo, event.stringIndex, event.fret),
          techniques: event.techniques,
        } as NoteEvent & { midi: number });
      });
    });

    sectionStartSec += elapsedInSectionSec;
    globalBarOffset += section.bars.length;
  });

  notes.sort((a, b) => a.time - b.time);

  return {
    notes,
    totalBars: song.sections.reduce((sum, section) => sum + section.bars.length, 0),
    totalNotes: notes.length,
    tempoMap,
    cameraDefaults: song.camera?.defaults,
    cameraTimeline,
    fretFocusDefaults: song.fretFocus?.defaults,
    fretFocusTimeline,
  };
};

export const convertTabxToEvents = tabxSongToEvents;
