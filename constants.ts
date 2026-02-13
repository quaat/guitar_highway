import { HighwayConfig, CameraConfig } from './types';

export const DEFAULT_HIGHWAY_CONFIG: HighwayConfig = {
  fretSpacing: 1.2,
  stringSpacing: 1.0,
  speed: 20, // World units per second
  viewDistance: 100,
  laneWidth: 30, // derived approx from fretSpacing * 24
  laneHeight: 6, // derived approx from stringSpacing * 6
  stringGlowDistance: 14,
  laneGlowDistance: 18,
  maxStringGlowIntensity: 0.95,
  maxLaneGlowIntensity: 0.7,
  minFret: 1,
  maxFret: 24,
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 50,
  near: 0.1,
  far: 200,
  position: [0, 6, 8],
  target: [0, 0, -10],
  damping: 0.1,
  transitionMs: 600,
};
