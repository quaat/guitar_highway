import { parseTabx2Ascii } from './parseTabx';

const source = `TABX 2

tab: A
e|--0--|
B|--1--|
G|--0--|
D|--2--|
A|--3--|
E|-----|

rhythm:
  resolution: 16
  bars: [16]
`;

const result = parseTabx2Ascii(source);
if (result.errors.length > 0 || !result.song) {
  throw new Error('parseTabx2Ascii smoke test failed');
}
