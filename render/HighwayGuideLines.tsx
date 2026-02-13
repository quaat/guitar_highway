import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { HighwayConfig, NoteEvent } from '../types';
import { worldPositionForEvent } from '../domain/mapping';

interface HighwayGuideLinesProps {
  config: HighwayConfig;
  guideOpacity: number;
  guideLengthZ: number;
  lowerEdgeY: number;
}

/**
 * Added overlay-only guide lines: one per fret (1..24).
 * X alignment is derived from existing worldPositionForEvent mapping using dummy hit-time
 * events so the fret position matches note mapping logic exactly.
 */
export const HighwayGuideLines: React.FC<HighwayGuideLinesProps> = ({
  config,
  guideOpacity,
  guideLengthZ,
  lowerEdgeY,
}) => {
  const guideSegments = useMemo(() => {
    const playheadTime = 0;
    const hitTime = 0;
    const zStart = 0.03; // Small offset above hit plane to reduce z-fighting.
    const zEnd = -guideLengthZ;

    const minFret = config.minFret ?? 1;
    const maxFret = config.maxFret ?? 24;
    return Array.from({ length: Math.max(1, maxFret - minFret + 1) }, (_, index) => {
      const fret = index + minFret;
      const fretProbeEvent: NoteEvent = {
        id: `guide-fret-${fret}`,
        string: 1,
        fret,
        time: hitTime,
      };
      const fretPos = worldPositionForEvent(fretProbeEvent, playheadTime, config);

      return {
        key: `fret-guide-${fret}`,
        points: [
          [fretPos.x, lowerEdgeY, zStart],
          [fretPos.x, lowerEdgeY, zEnd],
        ] as [number, number, number][],
      };
    });
  }, [config, guideLengthZ, lowerEdgeY]);

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
