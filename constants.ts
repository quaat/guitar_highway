import { HighwayConfig, CameraConfig } from './types';

export const DEFAULT_HIGHWAY_CONFIG: HighwayConfig = {
  fretSpacing: 1.2,
  stringSpacing: 1.0,
  speed: 20, // World units per second
  viewDistance: 100,
  laneWidth: 30, // derived approx from fretSpacing * 24
  laneHeight: 6, // derived approx from stringSpacing * 6
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 45,
  position: [0, 8, 15],
  target: [0, 0, -20],
};
