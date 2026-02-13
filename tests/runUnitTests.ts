import { generateDemoSong } from '../domain/generator';
import { isVisible, worldPositionForEvent } from '../domain/mapping';
import { convertTabxToEvents, midiFromStringFret, pitchNameToMidi, tabxSongToEvents } from '../import/tabx/convertTabx';
import { parseTabx, parseTabx2Ascii } from '../import/tabx/parseTabx';
import { TabxSong } from '../import/tabx/types';

type TestCase = { name: string; run: () => void };

const tests: TestCase[] = [];

const test = (name: string, run: () => void) => {
  tests.push({ name, run });
};

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}. expected=${String(expected)} actual=${String(actual)}`);
  }
};

const assertClose = (actual: number, expected: number, epsilon = 1e-9, message = 'Expected values to be close') => {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}. expected=${expected} actual=${actual}`);
  }
};

const assertThrows = (run: () => void, contains: string, message: string) => {
  try {
    run();
  } catch (error) {
    const text = String(error);
    if (!text.includes(contains)) {
      throw new Error(`${message}. error did not include "${contains}": ${text}`);
    }
    return;
  }
  throw new Error(`${message}. expected function to throw`);
};

const baseSource = `TABX 2

meta:
  title: Unit Test Song
  artist: Tester
  bpm: 90
  time: 3/4
  tuning: E2 A2 D3 G3 B3 E4
  capo: 2
  resolution: 12
  playbackDelayMs: 250
  backingtrack: ./song.mp3

tab: Verse
e|--5h7--x--|
B|----------|
G|----------|
D|----------|
A|----------|
E|----------|

rhythm:
  resolution: 12
  bars: [12]
`;

test('parseTabx2Ascii parses valid file and maps meta fields', () => {
  const out = parseTabx2Ascii(baseSource);
  assertEqual(out.errors.length, 0, 'should have no parse errors');
  assert(out.song, 'song should be returned');
  assertEqual(out.song!.meta.bpm, 90, 'bpm parsed');
  assertEqual(out.song!.meta.timeSig.num, 3, 'time signature numerator parsed');
  assertEqual(out.song!.meta.timeSig.den, 4, 'time signature denominator parsed');
  assertEqual(out.song!.meta.resolution, 12, 'resolution parsed');
  assertEqual(out.song!.meta.playbackDelayMs, 250, 'playbackDelayMs parsed');
  assertEqual(out.song!.meta.backingtrack, './song.mp3', 'backingtrack parsed');
});

test('parseTabx2Ascii reports invalid header', () => {
  const out = parseTabx2Ascii('TABX 3\ntab: A');
  assertEqual(out.song, undefined, 'invalid header should not return song');
  assert(out.errors.length > 0, 'invalid header should produce errors');
  assert(out.errors[0].message.includes('TABX 2'), 'error should reference TABX 2');
});

test('parseTabx2Ascii reports invalid meta fields', () => {
  const source = `TABX 2
meta:
  bpm: fast
  time: 44
  tuning: E2 A2 D3
tab: A
e|--0--|
B|--0--|
G|--0--|
D|--0--|
A|--0--|
E|--0--|
`;
  const out = parseTabx2Ascii(source);
  assert(out.errors.length >= 3, 'invalid meta should create multiple errors');
  assert(out.errors.some((e) => e.message.includes('bpm must be an integer')), 'invalid bpm should be reported');
  assert(out.errors.some((e) => e.message.includes('time must be in "num/den"')), 'invalid time should be reported');
  assert(out.errors.some((e) => e.message.includes('tuning must contain exactly 6 pitches')), 'invalid tuning should be reported');
});

test('parseTabx2Ascii emits warning when rhythm block is missing', () => {
  const source = baseSource.replace(/\nrhythm:[\s\S]*$/, '\n');
  const out = parseTabx2Ascii(source);
  assert(out.song, 'song should still parse without rhythm');
  assert(out.diagnostics.some((d) => d.severity === 'warning' && d.message.includes('no rhythm block')), 'warning expected');
});

test('parseTabx2Ascii parses muted notes and connector techniques', () => {
  const out = parseTabx2Ascii(baseSource);
  assert(out.song, 'song should parse');
  const events = out.song!.sections[0].bars[0].events;
  const hammerOn = events.find((e) => e.techniques?.some((t) => t.symbol === 'h'));
  assert(hammerOn, 'hammer-on technique should be attached');
  const hTechnique = hammerOn!.techniques!.find((t) => t.symbol === 'h');
  assert(typeof hTechnique?.connectsToCol === 'number', 'connector should point to next note column');
  const muted = events.find((e) => e.techniques?.some((t) => t.symbol === 'x'));
  assert(muted, 'muted note should exist');
  assertEqual(muted!.fret, 0, 'muted note should use fret 0');
});

test('parseTabx2Ascii supports dash-list rhythm bars', () => {
  const source = `TABX 2
tab: A
e|--0---|--0---|
B|------|------|
G|------|------|
D|------|------|
A|------|------|
E|------|------|
rhythm:
  resolution: 8
  - 8
  - 16
`;
  const out = parseTabx2Ascii(source);
  assert(out.song, 'song should parse');
  assertEqual(out.song!.sections[0].bars.length, 2, 'two bars expected');
  assertEqual(out.song!.sections[0].bars[0].rhythmResolution, 8, 'bar 1 rhythm resolution from list');
  assertEqual(out.song!.sections[0].bars[1].rhythmResolution, 16, 'bar 2 rhythm resolution from list');
});

test('parseTabx2Ascii errors when any string line is missing', () => {
  const source = `TABX 2
tab: A
e|--0--|
B|--0--|
G|--0--|
D|--0--|
A|--0--|
`;
  const out = parseTabx2Ascii(source);
  assert(out.errors.some((e) => e.message.includes('all six string lines')), 'missing line should be rejected');
});

test('parseTabx legacy TABX 1 fallback converts section markers', () => {
  const v1 = `TABX 1
section: Intro
e|--0--|
B|--1--|
G|--0--|
D|--2--|
A|--3--|
E|-----|
`;
  const out = parseTabx(v1);
  assertEqual(out.errors.length, 0, 'TABX 1 fallback should parse');
  assert(out.song, 'TABX 1 fallback should produce song');
  assertEqual(out.song!.sections[0].name, 'Intro', 'section should map to tab block name');
});

test('pitchNameToMidi maps note names and rejects invalid values', () => {
  assertEqual(pitchNameToMidi('A4'), 69, 'A4 midi');
  assertEqual(pitchNameToMidi('E2'), 40, 'E2 midi');
  assertEqual(pitchNameToMidi('C#3'), 49, 'C#3 midi');
  assertThrows(() => pitchNameToMidi('H2' as never), 'Invalid pitch format', 'invalid note should throw');
});

test('midiFromStringFret uses high-to-low string index mapping and capo', () => {
  const tuning = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const;
  const highEStringMidi = midiFromStringFret(tuning as unknown as TabxSong['meta']['tuning'], 0, 0, 0);
  const lowEStringMidi = midiFromStringFret(tuning as unknown as TabxSong['meta']['tuning'], 0, 5, 0);
  assertEqual(highEStringMidi, 64, 'string index 0 should be high E4');
  assertEqual(lowEStringMidi, 40, 'string index 5 should be low E2');
  assertEqual(midiFromStringFret(tuning as unknown as TabxSong['meta']['tuning'], 2, 5, 3), 45, 'capo and fret should shift midi');
});

test('tabxSongToEvents calculates bar timing and sorts notes', () => {
  const song: TabxSong = {
    meta: {
      bpm: 120,
      playbackDelayMs: 0,
      timeSig: { num: 4, den: 4 },
      tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      capo: 0,
      resolution: 16,
    },
    sections: [
      {
        name: 'A',
        bars: [
          {
            index: 1,
            rhythmResolution: 8,
            events: [
              { stringIndex: 0, col: 0, fret: 0, slot: 7 },
              { stringIndex: 5, col: 0, fret: 3, slot: 0 },
            ],
          },
          {
            index: 2,
            events: [{ stringIndex: 2, col: 15, fret: 2 }],
          },
        ],
      },
    ],
  };

  const converted = tabxSongToEvents(song);
  assertEqual(converted.totalBars, 2, 'bar count');
  assertEqual(converted.totalNotes, 3, 'note count');
  assert(converted.notes[0].time <= converted.notes[1].time, 'notes sorted by time');
  assertClose(converted.notes[0].time, 0, 1e-9, 'first slot starts at bar start');
  assertClose(converted.notes[1].time, 1.75, 1e-9, 'slot timing within first bar');
  assertClose(converted.notes[2].time, 3.875, 1e-9, 'fallback slot from column on second bar');
  assertEqual(converted.notes[0].string, 1, 'string index 5 maps to string 1');
  assertEqual(converted.notes[1].string, 6, 'string index 0 maps to string 6');
  assert(converted.notes.every((n) => typeof n.midi === 'number'), 'all notes should have midi');
});

test('convertTabxToEvents aliases tabxSongToEvents', () => {
  const parsed = parseTabx2Ascii(baseSource);
  assert(parsed.song, 'song should parse');
  const a = tabxSongToEvents(parsed.song!);
  const b = convertTabxToEvents(parsed.song!);
  assertEqual(a.totalNotes, b.totalNotes, 'alias should return same note count');
  assertEqual(a.totalBars, b.totalBars, 'alias should return same bar count');
});

test('worldPositionForEvent computes centered x/y and depth z', () => {
  const event = { id: 'n', fret: 13, string: 6, time: 5 };
  const config = { fretSpacing: 1, stringSpacing: 2, speed: 10, viewDistance: 50, laneWidth: 1, laneHeight: 1 };
  const pos = worldPositionForEvent(event, 2, config);
  assertClose(pos.x, 0.5, 1e-9, 'fret center offset');
  assertClose(pos.y, 5, 1e-9, 'string vertical placement');
  assertClose(pos.z, -30, 1e-9, 'future note should be negative z');
});

test('isVisible respects near and far depth limits', () => {
  const config = { fretSpacing: 1, stringSpacing: 1, speed: 20, viewDistance: 100, laneWidth: 1, laneHeight: 1 };
  assertEqual(isVisible({ id: 'a', fret: 1, string: 1, time: 0 }, 0, config), true, 'at playhead is visible');
  assertEqual(isVisible({ id: 'b', fret: 1, string: 1, time: -1 }, 0, config), false, 'far in the past not visible');
  assertEqual(isVisible({ id: 'c', fret: 1, string: 1, time: 20 }, 0, config), false, 'far in the future not visible');
});

test('generateDemoSong produces valid event ranges and unique ids', () => {
  const song = generateDemoSong();
  assert(song.length > 0, 'generated song should have notes');
  assert(song.every((n) => n.time >= 2 && n.time < 60), 'all notes inside expected time span');
  assert(song.every((n) => n.fret >= 1 && n.fret <= 16), 'all frets inside expected range');
  assert(song.every((n) => n.string >= 1 && n.string <= 6), 'all strings are valid');
  const uniqueIds = new Set(song.map((n) => n.id));
  assertEqual(uniqueIds.size, song.length, 'all generated ids should be unique');
});

let failures = 0;
for (const t of tests) {
  try {
    t.run();
    console.log(`PASS ${t.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${t.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  throw new Error(`${failures} test(s) failed`);
}

console.log(`All tests passed (${tests.length} cases).`);
