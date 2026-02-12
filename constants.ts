import { HighwayConfig, CameraConfig } from './types';

export const DEFAULT_HIGHWAY_CONFIG: HighwayConfig = {
  fretSpacing: 1.2,
  stringSpacing: 1.0,
  speed: 20,
  viewDistance: 100,
  laneWidth: 30,
  laneHeight: 6,
  hitLineZ: 0,
  hitHoldMs: 350,
  hitVisual: {
    emissiveBoost: 1.3,
    pulse: true,
  },
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 45,
  position: [0, 8, 15],
  target: [0, 0, -20],
};
