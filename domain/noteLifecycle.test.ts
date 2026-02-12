import test from 'node:test';
import assert from 'node:assert/strict';
import type { HighwayConfig, NoteEvent } from '../types.ts';
import { clampedNoteDepth, noteDepthForTime, updateRuntimeStateMap } from './noteLifecycle.ts';

const config: HighwayConfig = {
  fretSpacing: 1,
  stringSpacing: 1,
  speed: 10,
  viewDistance: 100,
  laneWidth: 24,
  laneHeight: 6,
  hitLineZ: 0,
  hitHoldMs: 400,
};

test('clamps z at hit line', () => {
  const rawPastLine = noteDepthForTime(1, 2, config.speed);
  assert.equal(rawPastLine, 10);
  assert.equal(clampedNoteDepth(rawPastLine, config.hitLineZ), 0);
});

test('transitions incoming -> atHitLine -> expired', () => {
  const note: NoteEvent = { id: 'single', fret: 3, string: 2, time: 1 };

  const incoming = updateRuntimeStateMap([note], 0.8, new Map(), config).get(note.id);
  assert.equal(incoming?.state, 'incoming');

  const atHitLine = updateRuntimeStateMap([note], 1.1, new Map([[note.id, incoming!]]), config).get(note.id);
  assert.equal(atHitLine?.state, 'atHitLine');
  assert.equal(atHitLine?.hitAtTime, 1.1);

  const expired = updateRuntimeStateMap([note], 1.6, new Map([[note.id, atHitLine!]]), config).get(note.id);
  assert.equal(expired?.state, 'expired');
});

test('chord notes hit and expire together', () => {
  const chord: NoteEvent[] = [
    { id: 'c-1', fret: 3, string: 1, time: 2 },
    { id: 'c-2', fret: 3, string: 2, time: 2 },
    { id: 'c-3', fret: 3, string: 3, time: 2 },
  ];

  const atHitLine = updateRuntimeStateMap(chord, 2, new Map(), config);
  chord.forEach((note) => {
    assert.equal(atHitLine.get(note.id)?.state, 'atHitLine');
    assert.equal(atHitLine.get(note.id)?.expiresAtTime, 2.4);
  });

  const expired = updateRuntimeStateMap(chord, 2.41, atHitLine, config);
  chord.forEach((note) => {
    assert.equal(expired.get(note.id)?.state, 'expired');
  });
});
