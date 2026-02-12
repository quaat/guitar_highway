import { parseTabx } from './parseTabx';

const source = `TABX 1

section: A
|1|
e|----------------|
B|----------------|
G|------0---2-----|
D|--0-------------|
A|----------------|
E|----------------|
`;

const result = parseTabx(source);
if (result.errors.length > 0 || !result.song) {
  throw new Error('parseTabx smoke test failed');
}
