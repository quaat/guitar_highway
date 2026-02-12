import { parseTabx } from '../import/tabx/parseTabx';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const valid = `TABX 1

meta:
  title: Example Riff
  artist: Unknown
  bpm: 120
  time: 4/4
  tuning: E2 A2 D3 G3 B3 E4
  capo: 0

section: Intro

|1|
e|----------------|
B|----------------|
G|------0---2-----|
D|--0-------------|
A|----------------|
E|----------------|
`;

const tests: Array<{ name: string; run: () => void }> = [
  { name: 'valid file', run: () => { const out = parseTabx(valid); assert(out.errors.length === 0, 'should parse'); assert(out.song?.sections.length === 1, 'section count'); } },
  { name: 'bad header', run: () => { const out = parseTabx(valid.replace('TABX 1', 'TABX v1')); assert(out.errors.some((e) => e.message.includes('TABX 1')), 'header error'); } },
  { name: 'wrong indentation in meta', run: () => { const out = parseTabx(valid.replace('  bpm: 120', ' bpm: 120')); assert(out.errors.length > 0, 'indentation error'); } },
  { name: 'non-sequential bars', run: () => { const out = parseTabx(valid.replace('|1|', '|2|')); assert(out.errors.some((e) => e.message.includes('out of sequence')), 'sequence error'); } },
  { name: 'wrong string labels/order', run: () => { const out = parseTabx(valid.replace('B|----------------|', 'X|----------------|')); assert(out.errors.some((e) => e.message.includes('Expected string line')), 'label error'); } },
  { name: 'malformed frets', run: () => { const out = parseTabx(valid.replace('------0---2-----', '----[x]---[100]-')); assert(out.errors.some((e) => e.message.includes('Bracketed fret')), 'fret error'); } },
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
