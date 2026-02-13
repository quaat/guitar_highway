import { parseTabx2Ascii } from './parseTabx';
import { tabxSongToEvents } from './convertTabx';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const withTempo = `TABX 2

tab: A
e|--0--0--0--0--|
B|---------------|
G|---------------|
D|---------------|
A|---------------|
E|---------------|

rhythm:
  resolution: 16
  bars: [16]

tempo:
  - at: { bar: 0, slot: 0 }
    bpm: 120
  - at: { bar: 0, slot: 8 }
    bpm: 60
`;

{
  const out = parseTabx2Ascii(withTempo);
  assert(out.errors.length === 0, 'tempo block should parse');
  assert(out.song?.sections[0].tempoEvents?.length === 2, 'tempo events captured');

  const converted = tabxSongToEvents(out.song!);
  const noteTimes = converted.notes.map((n) => n.time);
  assert(noteTimes[2] > 1.0, 'post-tempo-change note should happen later at slower bpm');
}

{
  const malformedAt = `TABX 2

tab: A
e|--0--|
B|-----|
G|-----|
D|-----|
A|-----|
E|-----|

tempo:
  - at: bar=0,slot=0
    bpm: 120
`;
  const out = parseTabx2Ascii(malformedAt);
  assert(out.errors.some((e) => e.message.includes('malformed or missing "at"')), 'malformed at should error');
}

{
  const negativeAndBadBpm = `TABX 2

tab: A
e|--0--|
B|-----|
G|-----|
D|-----|
A|-----|
E|-----|

tempo:
  - at: { bar: -1, slot: 0 }
    bpm: 120
  - at: { bar: 0, slot: 0 }
    bpm: 0
`;
  const out = parseTabx2Ascii(negativeAndBadBpm);
  assert(out.errors.some((e) => e.message.includes('non-negative')), 'negative bar/slot should error');
  assert(out.errors.some((e) => e.message.includes('greater than 0')), 'bpm <= 0 should error');
}

{
  const withCameraSnapshots = `TABX 2
camera:
  snapshots:
    intro:
      position: [0, 6, 8]
      target: [0, 0, -10]
      fov: 50
      near: 0.1
      far: 200
      transitionMs: 600
    side:
      position: [4, 5, 10]
      target: [0, 0, -12]
      fov: 50
      near: 0.1
      far: 200
  defaults:
    snapshot: intro
  events:
    - at: { bar: 0, slot: 0 }
      snapshot: intro
    - at: { bar: 0, slot: 8 }
      snapshot: side
      transitionMs: 1200

tab: A
e|--0--0--0--0--|
B|---------------|
G|---------------|
D|---------------|
A|---------------|
E|---------------|

rhythm:
  resolution: 16
  bars: [16]
`;

  const out = parseTabx2Ascii(withCameraSnapshots);
  assert(out.errors.length === 0, 'camera snapshot block should parse');
  const converted = tabxSongToEvents(out.song!);
  assert(!!converted.cameraDefaults, 'camera defaults should be converted');
  assert((converted.cameraTimeline ?? []).length === 2, 'camera timeline events should convert to seconds');
  assert((converted.cameraTimeline ?? [])[1].config.position?.[0] === 4, 'snapshot reference should resolve event position');
}

{
  const badCameraSnapshotRef = `TABX 2
camera:
  defaults:
    snapshot: does-not-exist

tab: A
e|--0--|
B|-----|
G|-----|
D|-----|
A|-----|
E|-----|
`;

  const out = parseTabx2Ascii(badCameraSnapshotRef);
  assert(out.errors.some((e) => e.message.includes('Unknown camera snapshot')), 'unknown camera snapshot reference should error');
}

{
  const withFretFocus = `TABX 2
fretFocus:
  defaults: { min: 3, max: 15 }
  events:
    - at: { bar: 0, slot: 0 }
      min: 3
      max: 12
    - at: { bar: 0, slot: 8 }
      min: 10
      max: 17

tab: A
e|--0--0--0--0--|
B|---------------|
G|---------------|
D|---------------|
A|---------------|
E|---------------|

rhythm:
  resolution: 16
  bars: [16]
`;

  const out = parseTabx2Ascii(withFretFocus);
  assert(out.errors.length === 0, 'fretFocus block should parse');
  const converted = tabxSongToEvents(out.song!);
  assert(converted.fretFocusDefaults?.min === 3 && converted.fretFocusDefaults?.max === 15, 'fretFocus defaults should parse');
  assert((converted.fretFocusTimeline ?? []).length === 2, 'fretFocus timeline should convert to seconds');
  assert((converted.fretFocusTimeline ?? [])[1].min === 10, 'fretFocus event min should convert');
}

{
  const badFretFocus = `TABX 2
fretFocus:
  defaults: { min: 0, max: 30 }
  events:
    - at: { bar: 0, slot: 0 }
      min: 12
      max: 3

tab: A
e|--0--|
B|-----|
G|-----|
D|-----|
A|-----|
E|-----|
`;

  const out = parseTabx2Ascii(badFretFocus);
  assert(out.errors.some((e) => e.message.includes('fretFocus.defaults')), 'invalid fretFocus defaults should error');
  assert(out.errors.some((e) => e.message.includes('Fret-focus event bounds')), 'invalid fretFocus event bounds should error');
}


{
  const withDurations = `TABX 2

tab: A
e|--0-------0-------|
B|------------------|
G|------------------|
D|------------------|
A|------------------|
E|------------------|

rhythm:
  resolution: 16
  bars: [16, 16]

durations:
  - at: { bar: 0, slot: 0 }
    string: 1
    durationSlots: 4
  - at: { bar: 0, slot: 8 }
    string: 1
    durationSlots: 16
`;

  const out = parseTabx2Ascii(withDurations);
  assert(out.errors.length === 0, 'duration block should parse');
  const converted = tabxSongToEvents(out.song!);
  const first = converted.notes.find((n) => Math.abs(n.time - 0) < 1e-6);
  const second = converted.notes.find((n) => Math.abs(n.time - 1) < 1e-6);
  assert(!!first && !!second, 'expected two notes at slot 0 and slot 8');
  assert(Math.abs((first?.duration ?? 0) - 0.5) < 1e-6, '4 slots at 120bpm should be 0.5s');
  assert(Math.abs((second?.duration ?? 0) - 2) < 1e-6, '16-slot sustain across bar boundary should be 2s');
}

{
  const withTempoAndDurations = `TABX 2

tab: A
e|--0--0-----------|
B|-----------------|
G|-----------------|
D|-----------------|
A|-----------------|
E|-----------------|

rhythm:
  resolution: 16
  bars: [16]

tempo:
  - at: { bar: 0, slot: 0 }
    bpm: 120
  - at: { bar: 0, slot: 8 }
    bpm: 60

durations:
  - at: { bar: 0, slot: 0 }
    string: 1
    durationSlots: 12
`;

  const out = parseTabx2Ascii(withTempoAndDurations);
  assert(out.errors.length === 0, 'tempo + duration block should parse');
  const converted = tabxSongToEvents(out.song!);
  const first = converted.notes[0];
  assert(Math.abs((first.duration ?? 0) - 1.75) < 1e-6, 'duration should integrate bpm changes over sustain window');
}

{
  const badDurations = `TABX 2

tab: A
e|--0--|
B|-----|
G|-----|
D|-----|
A|-----|
E|-----|

rhythm:
  resolution: 8
  bars: [8]

durations:
  - at: { bar: 0, slot: 0 }
    string: 0
    durationSlots: 0
`;
  const out = parseTabx2Ascii(badDurations);
  assert(out.errors.some((e) => e.message.includes('string must be an integer in range 1..6')), 'duration string validation should error');
  assert(out.errors.some((e) => e.message.includes('durationSlots must be an integer greater than or equal to 1')), 'durationSlots validation should error');
}
