import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HighwayGridProps {
  width: number;
  height: number;
  viewDistance: number;
  spacing?: number;
}

export const HighwayGrid: React.FC<HighwayGridProps> = ({
  width,
  height,
  viewDistance,
  spacing = 4,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const lines = useMemo(() => {
    const count = Math.ceil(viewDistance / spacing) + 6;
    return Array.from({ length: count }, (_, i) => i);
  }, [spacing, viewDistance]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.z += delta * 6;
    if (groupRef.current.position.z > spacing) {
      groupRef.current.position.z -= spacing;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -spacing]}>
      {lines.map((index) => (
        <mesh key={`depth-grid-${index}`} position={[0, 0, -index * spacing]}>
          <boxGeometry args={[width, 0.025, 0.025]} />
          <meshStandardMaterial
            color="#6ee7ff"
            emissive="#6ee7ff"
            emissiveIntensity={0.18}
            transparent
            opacity={0.2}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, -viewDistance * 0.5]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#0a0f1c" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
};
