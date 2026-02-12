import { Vector3 } from 'three';
import type { NoteEvent, HighwayConfig } from '../types.ts';
import { clampedNoteDepth, noteDepthForTime } from './noteLifecycle.ts';

export const worldPositionForEvent = (
  event: NoteEvent,
  playheadTime: number,
  config: HighwayConfig,
): Vector3 => {
  const x = (event.fret - 12.5) * config.fretSpacing;
  const y = (event.string - 3.5) * config.stringSpacing;
  const rawZ = noteDepthForTime(event.time, playheadTime, config.speed);
  const z = clampedNoteDepth(rawZ, config.hitLineZ);

  return new Vector3(x, y, z);
};

export const isVisible = (
  event: NoteEvent,
  playheadTime: number,
  config: HighwayConfig,
): boolean => {
  const z = clampedNoteDepth(noteDepthForTime(event.time, playheadTime, config.speed), config.hitLineZ);
  return z <= config.hitLineZ && z > -(config.viewDistance + 10);
};
