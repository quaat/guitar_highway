import { Vector3 } from 'three';
import { NoteEvent, HighwayConfig } from '../types';

/**
 * Maps a musical event to a 3D world position.
 * 
 * Coordinate System:
 * X: Frets. Center (0) is roughly fret 12. 
 *    -X (Left) = Lower frets (Headstock direction)
 *    +X (Right) = Higher frets (Body direction)
 *    This mimics a horizontal fretboard view.
 * 
 * Y: Strings.
 *    +Y = String 6 (Low E, Top)
 *    -Y = String 1 (High E, Bottom)
 * 
 * Z: Time/Depth.
 *    0 = The "Hit Line" / Camera plane
 *    -Z = Future (Into the screen)
 *    +Z = Past (Behind camera, usually clipped)
 */
export const worldPositionForEvent = (
  event: NoteEvent,
  playheadTime: number,
  config: HighwayConfig
): Vector3 => {
  // Center fretboard on X. 24 frets.
  // Fret 1 is at index 0 physically? Let's say Fret 1 is far left.
  // Width = 24 * spacing.
  // Center = 12.5.
  const x = (event.fret - 12.5) * config.fretSpacing;

  // Center strings on Y. 6 strings.
  // Center = 3.5.
  // String 6 (Top) -> (6 - 3.5) * spacing = 2.5 * spacing
  // String 1 (Bottom) -> (1 - 3.5) * spacing = -2.5 * spacing
  const y = (event.string - 3.5) * config.stringSpacing;

  // Depth based on time difference
  const timeDelta = event.time - playheadTime;
  
  // If speed is 20 units/sec:
  // 1 sec in future = 20 units away (-Z)
  const z = -(timeDelta * config.speed);

  return new Vector3(x, y, z);
};

export const isVisible = (
  event: NoteEvent,
  playheadTime: number,
  config: HighwayConfig
): boolean => {
  const z = -(event.time - playheadTime) * config.speed;
  // Visible if between near clip (slightly positive for "just passed") and far clip
  return z < 5 && z > -(config.viewDistance + 10);
};
