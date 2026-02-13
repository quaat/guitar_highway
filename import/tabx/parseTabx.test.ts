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
  const withCamera = `TABX 2
camera:
  defaults:
    position: [0, 6, 8]
    target: [0, 0, -10]
    fov: 50
    near: 0.1
    far: 200
    transitionMs: 600
  events:
    - at: { bar: 0, slot: 0 }
      position: [1, 6, 8]
      target: [0, 0, -11]
    - at: { bar: 0, slot: 8 }
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
  const out = parseTabx2Ascii(withCamera);
  assert(out.errors.length === 0, 'camera block should parse');
  const converted = tabxSongToEvents(out.song!);
  assert(!!converted.cameraDefaults, 'camera defaults should be converted');
  assert((converted.cameraTimeline ?? []).length === 2, 'camera timeline events should convert to seconds');
}

{
  const badCamera = `TABX 2
camera:
  defaults:
    position: [0, 6]
  events:
    - at: { bar: -1, slot: 0 }
      position: [1, 2, 3]

tab: A
e|--0--|
B|-----|
G|-----|
D|-----|
A|-----|
E|-----|
`;

  const out = parseTabx2Ascii(badCamera);
  assert(out.errors.some((e) => e.message.includes('camera.defaults')), 'missing required camera defaults should error');
  assert(out.errors.some((e) => e.message.includes('non-negative')), 'negative camera event position should error');
}
