import test from 'node:test';
import assert from 'node:assert/strict';
import { worldPositionForEvent } from './mapping.ts';
import type { HighwayConfig, NoteEvent } from '../types.ts';

const config: HighwayConfig = {
  fretSpacing: 1,
  stringSpacing: 1,
  speed: 10,
  viewDistance: 100,
  laneWidth: 24,
  laneHeight: 6,
  hitLineZ: 0,
  hitHoldMs: 350,
};

test('maps fret to centered X coordinate', () => {
  const note: NoteEvent = { id: '1', fret: 12, string: 1, time: 0 };
  assert.equal(worldPositionForEvent(note, 0, config).x, -0.5);
});

test('maps string to centered Y coordinate', () => {
  const noteHighString: NoteEvent = { id: '1', fret: 1, string: 1, time: 0 };
  const noteLowString: NoteEvent = { id: '2', fret: 1, string: 6, time: 0 };

  assert.equal(worldPositionForEvent(noteHighString, 0, config).y, -2.5);
  assert.equal(worldPositionForEvent(noteLowString, 0, config).y, 2.5);
});

test('calculates Z depth based on time and speed', () => {
  const noteFuture: NoteEvent = { id: '1', fret: 1, string: 1, time: 5 };
  const pos = worldPositionForEvent(noteFuture, 0, config);

  assert.equal(pos.z, -50);
});

test('clamps notes to hitLineZ so they never pass it', () => {
  const notePast: NoteEvent = { id: '1', fret: 1, string: 1, time: 5 };
  const pos = worldPositionForEvent(notePast, 6, config);

  assert.equal(pos.z, 0);
});
