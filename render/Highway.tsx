import React, { useMemo } from 'react';
import { HighwayConfig, STRING_COLORS_MAP } from '../types';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

interface HighwayProps {
  config: HighwayConfig;
}

export const Highway: React.FC<HighwayProps> = ({ config }) => {
  const { fretSpacing, stringSpacing, viewDistance } = config;

  // X: 24 frets centered. Range approx [-12 * fretSpacing, 12 * fretSpacing]
  // Y: 6 strings centered. Range approx [-3 * stringSpacing, 3 * stringSpacing]
  const width = 24 * fretSpacing;
  const height = 6 * stringSpacing;

  const fretLines = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      // Fret boundaries: Fret 1 is index 0. Left edge is -12 * spacing.
      const x = (i - 12) * fretSpacing;
      
      return (
        <Line
          key={`fret-line-${i}`}
          points={[
             [x, -height/2, 0], 
             [x, height/2, 0],
             [x, height/2, -viewDistance],
             [x, -height/2, -viewDistance],
             [x, -height/2, 0]
          ]}
          color="#7a7a7a"
          lineWidth={1.5}
          opacity={0.35}
          transparent
        />
      );
    });
  }, [fretSpacing, height, viewDistance]);

  const stringLines = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const s = i + 1;
      const y = (s - 3.5) * stringSpacing;
      const color = STRING_COLORS_MAP[s];
      
      return (
         <React.Fragment key={`string-line-${s}`}>
            {/* String Line at Hit Line */}
            <Line
              points={[[-width/2, y, 0], [width/2, y, 0]]}
              color={color}
              lineWidth={3.5}
              opacity={0.95}
              transparent
            />
            {/* String Line at Far Distance */}
             <Line
              points={[[-width/2, y, -viewDistance], [width/2, y, -viewDistance]]}
              color={color}
              lineWidth={2}
              opacity={0.35}
              transparent
            />
            {/* Connecting Lines at Edges (Visual guide for depth) */}
            <Line
                points={[
                  [-width/2, y, 0], [-width/2, y, -viewDistance]
                ]}
                 color={color}
                 lineWidth={1}
                 opacity={0.05}
                 transparent
            />
             <Line
                points={[
                  [width/2, y, 0], [width/2, y, -viewDistance]
                ]}
                 color={color}
                 lineWidth={1}
                 opacity={0.05}
                 transparent
            />
         </React.Fragment>
      );
    });
  }, [stringSpacing, width, viewDistance]);
  
  const inlays = useMemo(() => {
    return INLAY_FRETS.map(fret => {
        const x = (fret - 12.5) * fretSpacing;
        const isDouble = DOUBLE_INLAYS.includes(fret);
        
        return (
          <group key={`inlay-${fret}`} position={[x, 0, 0.02]}>
             <Text
                position={[0, -height/2 - 0.5, 0]}
                fontSize={0.4}
                color="#666"
                anchorY="top"
             >
               {fret}
             </Text>
              {isDouble ? (
                 <>
                   <mesh position={[0, height/4, 0]}>
                     <circleGeometry args={[0.15, 16]} />
                     <meshBasicMaterial color="#333" />
                   </mesh>
                    <mesh position={[0, -height/4, 0]}>
                     <circleGeometry args={[0.15, 16]} />
                     <meshBasicMaterial color="#333" />
                   </mesh>
                 </>
              ) : (
                 <mesh>
                     <circleGeometry args={[0.15, 16]} />
                     <meshBasicMaterial color="#333" />
                 </mesh>
              )}
          </group>
        )
    })
  }, [fretSpacing, height]);

  return (
    <group>
        {/* Transparent Board Surface */}
        <mesh position={[0, 0, -viewDistance/2]}>
            <boxGeometry args={[width, height, viewDistance]} />
            <meshBasicMaterial color="#0f0f12" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        
        {fretLines}
        {stringLines}
        {inlays}
        
        {/* Hit Line Frame */}
        <Line 
            points={[
                [-width/2, -height/2, 0],
                [width/2, -height/2, 0],
                [width/2, height/2, 0],
                [-width/2, height/2, 0],
                [-width/2, -height/2, 0]
            ]}
            color="white"
            lineWidth={2}
        />
    </group>
  );
};
