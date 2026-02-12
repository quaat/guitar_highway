import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { HighwayConfig, NoteEvent } from '../types';
import { worldPositionForEvent } from '../domain/mapping';

interface HighwayGuideLinesProps {
  config: HighwayConfig;
  guideOpacity: number;
  guideLengthZ: number;
}

/**
 * Added overlay-only guide lines: one per string lane.
 * Alignment is derived from existing worldPositionForEvent mapping so lane Y positions
 * exactly match note placement at the hit line.
 */
export const HighwayGuideLines: React.FC<HighwayGuideLinesProps> = ({
  config,
  guideOpacity,
  guideLengthZ,
}) => {
  const guideSegments = useMemo(() => {
    const playheadTime = 0;
    const hitTime = 0;
    const zStart = 0.03; // Small offset above hit plane to reduce z-fighting.
    const zEnd = -guideLengthZ;

    return Array.from({ length: 6 }, (_, index) => {
      const string = index + 1;
      const laneProbeEvent: NoteEvent = {
        id: `guide-lane-${string}`,
        string,
        fret: 12,
        time: hitTime,
      };
      const lanePos = worldPositionForEvent(laneProbeEvent, playheadTime, config);

      return {
        key: `guide-${string}`,
        points: [
          [-12 * config.fretSpacing, lanePos.y, zStart],
          [12 * config.fretSpacing, lanePos.y, zStart],
          [12 * config.fretSpacing, lanePos.y, zEnd],
          [-12 * config.fretSpacing, lanePos.y, zEnd],
          [-12 * config.fretSpacing, lanePos.y, zStart],
        ] as [number, number, number][],
      };
    });
  }, [config, guideLengthZ]);

  return (
    <group renderOrder={4}>
      {guideSegments.map((segment) => (
        <Line
          key={segment.key}
          points={segment.points}
          color="#cbd5e1"
          lineWidth={2}
          transparent
          opacity={guideOpacity}
          depthWrite={false}
        />
      ))}
    </group>
  );
};
