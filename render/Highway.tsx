import React, { useMemo } from 'react';
import { HighwayConfig, STRING_COLORS_MAP } from '../types';
import { Line, Text } from '@react-three/drei';

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

interface HighwayProps {
  config: HighwayConfig;
}

export const Highway: React.FC<HighwayProps> = ({ config }) => {
  const { fretSpacing, stringSpacing, viewDistance, hitLineZ } = config;
  const width = 24 * fretSpacing;
  const height = 6 * stringSpacing;
  const lineZOffset = -0.02;

  const fretLines = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const x = (i - 12) * fretSpacing;

      return (
        <Line
          key={`fret-line-${i}`}
          points={[
            [x, -height / 2, hitLineZ + lineZOffset],
            [x, height / 2, hitLineZ + lineZOffset],
            [x, height / 2, -viewDistance],
            [x, -height / 2, -viewDistance],
            [x, -height / 2, hitLineZ + lineZOffset],
          ]}
          color="#3f3f46"
          lineWidth={1}
          opacity={0.07}
          transparent
          depthWrite={false}
        />
      );
    });
  }, [fretSpacing, height, viewDistance, hitLineZ]);

  const stringLines = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const s = i + 1;
      const y = (s - 3.5) * stringSpacing;
      const color = STRING_COLORS_MAP[s];

      return (
        <React.Fragment key={`string-line-${s}`}>
          <Line
            points={[
              [-width / 2, y, hitLineZ + lineZOffset],
              [width / 2, y, hitLineZ + lineZOffset],
            ]}
            color={color}
            lineWidth={1.8}
            opacity={0.3}
            transparent
            depthWrite={false}
          />
          <Line
            points={[
              [-width / 2, y, -viewDistance],
              [width / 2, y, -viewDistance],
            ]}
            color={color}
            lineWidth={1.4}
            opacity={0.1}
            transparent
            depthWrite={false}
          />
        </React.Fragment>
      );
    });
  }, [stringSpacing, width, viewDistance, hitLineZ]);

  const inlays = useMemo(() => {
    return INLAY_FRETS.map((fret) => {
      const x = (fret - 12.5) * fretSpacing;
      const isDouble = DOUBLE_INLAYS.includes(fret);

      return (
        <group key={`inlay-${fret}`} position={[x, 0, hitLineZ + 0.01]}>
          <Text position={[0, -height / 2 - 0.5, 0]} fontSize={0.35} color="#6b7280" anchorY="top">
            {fret}
          </Text>
          {isDouble ? (
            <>
              <mesh position={[0, height / 4, 0]}>
                <circleGeometry args={[0.12, 16]} />
                <meshBasicMaterial color="#4b5563" transparent opacity={0.45} depthWrite={false} />
              </mesh>
              <mesh position={[0, -height / 4, 0]}>
                <circleGeometry args={[0.12, 16]} />
                <meshBasicMaterial color="#4b5563" transparent opacity={0.45} depthWrite={false} />
              </mesh>
            </>
          ) : (
            <mesh>
              <circleGeometry args={[0.12, 16]} />
              <meshBasicMaterial color="#4b5563" transparent opacity={0.45} depthWrite={false} />
            </mesh>
          )}
        </group>
      );
    });
  }, [fretSpacing, height, hitLineZ]);

  return (
    <group>
      {fretLines}
      {stringLines}
      {inlays}

      <Line
        points={[
          [-width / 2, -height / 2, hitLineZ],
          [width / 2, -height / 2, hitLineZ],
          [width / 2, height / 2, hitLineZ],
          [-width / 2, height / 2, hitLineZ],
          [-width / 2, -height / 2, hitLineZ],
        ]}
        color="white"
        lineWidth={2.2}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </group>
  );
};
