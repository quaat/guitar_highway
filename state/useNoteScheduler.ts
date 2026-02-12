import { useEffect, useRef } from 'react';
import { NoteEvent } from '../types';
import { OutputDevice } from '../audio/outputDevice';

interface SchedulerParams {
  notes: NoteEvent[];
  isPlaying: boolean;
  playheadRef: React.MutableRefObject<number>;
  outputDevice: OutputDevice;
  resetToken: number;
}

export const useNoteScheduler = ({ notes, isPlaying, playheadRef, outputDevice, resetToken }: SchedulerParams) => {
  const nextIndexRef = useRef(0);
  const rafRef = useRef<number>();
  const lookaheadSec = 0.1;

  useEffect(() => {
    nextIndexRef.current = notes.findIndex((n) => n.time >= playheadRef.current);
    if (nextIndexRef.current < 0) nextIndexRef.current = notes.length;
  }, [notes, playheadRef, resetToken]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const start = playheadRef.current;
      const end = start + lookaheadSec;
      while (nextIndexRef.current < notes.length) {
        const note = notes[nextIndexRef.current];
        if (note.time > end) break;
        if (note.time >= start) {
          outputDevice.playNote(note.midi ?? 60, 95, 120);
        }
        nextIndexRef.current += 1;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, notes, outputDevice, playheadRef]);
};
