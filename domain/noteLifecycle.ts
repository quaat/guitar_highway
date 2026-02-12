import type { HighwayConfig, NoteEvent, RuntimeNoteState } from '../types.ts';

export const noteDepthForTime = (noteTime: number, playheadTime: number, speed: number): number => {
  const timeDelta = noteTime - playheadTime;
  return -(timeDelta * speed);
};

export const clampedNoteDepth = (rawZ: number, hitLineZ: number): number => {
  return Math.min(rawZ, hitLineZ);
};

export const updateRuntimeStateMap = (
  notes: NoteEvent[],
  playheadTime: number,
  previousStates: Map<string, RuntimeNoteState>,
  config: HighwayConfig,
): Map<string, RuntimeNoteState> => {
  const nextStates = new Map<string, RuntimeNoteState>();
  const holdSeconds = config.hitHoldMs / 1000;

  notes.forEach((note) => {
    const previous = previousStates.get(note.id);

    if (previous?.state === 'expired') {
      nextStates.set(note.id, previous);
      return;
    }

    if (previous?.state === 'atHitLine') {
      const expiresAtTime = previous.expiresAtTime ?? (previous.hitAtTime ?? playheadTime) + holdSeconds;
      const expired = playheadTime >= expiresAtTime;

      nextStates.set(note.id, {
        id: note.id,
        state: expired ? 'expired' : 'atHitLine',
        hitAtTime: previous.hitAtTime ?? playheadTime,
        expiresAtTime,
      });
      return;
    }

    const rawZ = noteDepthForTime(note.time, playheadTime, config.speed);

    if (rawZ >= config.hitLineZ) {
      nextStates.set(note.id, {
        id: note.id,
        state: 'atHitLine',
        hitAtTime: playheadTime,
        expiresAtTime: playheadTime + holdSeconds,
      });
      return;
    }

    nextStates.set(note.id, {
      id: note.id,
      state: 'incoming',
    });
  });

  return nextStates;
};
