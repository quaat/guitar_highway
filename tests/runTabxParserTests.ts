import { parseTabx2Ascii } from '../import/tabx/parseTabx';
import { tabxSongToEvents } from '../import/tabx/convertTabx';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const valid = `TABX 2

meta:
  title: Example
  bpm: 120
  time: 4/4
  tuning: E2 A2 D3 G3 B3 E4
  capo: 0

tab: Intro
e|--5h7---10b12--12*--|
B|---------------------|
G|---------------------|
D|---------------------|
A|---------------------|
E|---------------------|

rhythm:
  resolution: 16
  bars: [16]
`;

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: 'valid TABX 2 parse',
    run: () => {
      const out = parseTabx2Ascii(valid);
      assert(out.errors.length === 0, 'should parse');
      assert(out.song?.sections.length === 1, 'section count');
    },
  },
  {
    name: 'multi-digit frets and techniques are captured',
    run: () => {
      const out = parseTabx2Ascii(valid);
      assert(out.song, 'song exists');
      const notes = out.song!.sections[0].bars[0].events;
      assert(notes.some((n) => n.fret === 10), '10 fret parsed');
      assert(notes.some((n) => n.fret === 12), '12 fret parsed');
      assert(notes.some((n) => n.techniques?.some((t) => t.symbol === 'h')), 'hammer-on metadata');
      assert(notes.some((n) => n.techniques?.some((t) => t.symbol === 'b')), 'bend metadata');
      assert(notes.some((n) => n.techniques?.some((t) => t.symbol === '*')), 'harmonic metadata');
    },
  },
  {
    name: 'missing rhythm emits warning',
    run: () => {
      const out = parseTabx2Ascii(valid.replace(/\nrhythm:[\s\S]*$/, ''));
      assert(out.diagnostics.some((d) => d.severity === 'warning'), 'warning expected');
    },
  },
  {
    name: 'events conversion uses slot timing',
    run: () => {
      const out = parseTabx2Ascii(valid);
      assert(out.song, 'song exists');
      const converted = tabxSongToEvents(out.song!);
      assert(converted.totalNotes > 0, 'notes converted');
      assert(converted.notes.every((n) => Number.isFinite(n.time)), 'times are finite');
    },
  },
];

let failures = 0;
tests.forEach((test) => {
  try {
    test.run();
    console.log(`PASS ${test.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${test.name}`, error);
  }
});

if (failures > 0) {
  throw new Error(`${failures} tests failed`);
}
