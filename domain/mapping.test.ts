import { worldPositionForEvent } from './mapping';
import { NoteEvent, HighwayConfig } from '../types';
import { DEFAULT_HIGHWAY_CONFIG } from '../constants';
import { Vector3 } from 'three';

// Mock suite execution if running in a real test runner
// Since this is a generated file, we simulate the structure.

// Fix: Add dummy declarations for test globals to avoid TS errors in non-test env
declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void) => void;
declare const expect: (actual: any) => { toBe: (expected: any) => void };

describe('Domain: Mapping Logic', () => {
  const config: HighwayConfig = {
    ...DEFAULT_HIGHWAY_CONFIG,
    fretSpacing: 1,
    stringSpacing: 1,
    speed: 10,
  };

  test('Calculates X position correctly for fret centering', () => {
    // Center is 12.5. Fret 12 should be slightly left (-0.5), Fret 13 slightly right (0.5)
    const noteLeft: NoteEvent = { id: '1', fret: 12, string: 1, time: 0 };
    const posLeft = worldPositionForEvent(noteLeft, 0, config);
    
    const noteRight: NoteEvent = { id: '2', fret: 13, string: 1, time: 0 };
    const posRight = worldPositionForEvent(noteRight, 0, config);

    expect(posLeft.x).toBe(-0.5);
    expect(posRight.x).toBe(0.5);
  });

  test('Calculates Y position correctly for string height', () => {
    // Center is 3.5. 
    // String 6 (Top) -> 6 - 3.5 = 2.5
    // String 1 (Bottom) -> 1 - 3.5 = -2.5
    const noteHighString: NoteEvent = { id: '1', fret: 1, string: 1, time: 0 };
    const noteLowString: NoteEvent = { id: '2', fret: 1, string: 6, time: 0 };
    
    expect(worldPositionForEvent(noteHighString, 0, config).y).toBe(-2.5);
    expect(worldPositionForEvent(noteLowString, 0, config).y).toBe(2.5);
  });

  test('Calculates Z depth based on time and speed', () => {
    // Speed 10.
    // Note time 5. Playhead 0. Delta +5. Z should be -50 (Future, into screen).
    const noteFuture: NoteEvent = { id: '1', fret: 1, string: 1, time: 5 };
    const pos = worldPositionForEvent(noteFuture, 0, config);
    
    expect(pos.z).toBe(-50);
  });

  test('Calculates Z depth when note is past', () => {
    // Note time 5. Playhead 6. Delta -1. Z should be +10 (Behind camera).
    const notePast: NoteEvent = { id: '1', fret: 1, string: 1, time: 5 };
    const pos = worldPositionForEvent(notePast, 6, config);
    
    expect(pos.z).toBe(10);
  });
});