import { NoteEvent } from '../types';

export const generateDemoSong = (): NoteEvent[] => {
  const events: NoteEvent[] = [];
  let idCounter = 0;

  // Create a 60-second loop of patterns
  for (let t = 2; t < 60; t += 0.5) {
    const beat = Math.floor(t * 2) % 16;
    
    // Simple ascending diagonal pattern
    if (beat < 8) {
       events.push({
         id: `note-${idCounter++}`,
         time: t,
         fret: 1 + beat, // 1 to 8
         string: 6 - (beat % 6), // 6 down to 1
       });
    } 
    // Chord stabs
    else if (beat === 8 || beat === 12) {
      events.push(
        { id: `note-${idCounter++}`, time: t, fret: 5, string: 6 },
        { id: `note-${idCounter++}`, time: t, fret: 7, string: 5 },
        { id: `note-${idCounter++}`, time: t, fret: 7, string: 4 }
      );
    }
    // High fret melody
    else {
       events.push({
         id: `note-${idCounter++}`,
         time: t,
         fret: 12 + (beat % 5),
         string: 1 + (beat % 3),
       });
    }
  }

  return events;
};
