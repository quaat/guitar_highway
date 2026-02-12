import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface HitLineProps {
  width: number;
  height: number;
}

export const HitLine: React.FC<HitLineProps> = ({ width, height }) => {
  const barRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!barRef.current) return;
    const pulse = 0.2 + (Math.sin(clock.elapsedTime * 2.2) + 1) * 0.15;
    barRef.current.emissiveIntensity = 1.4 + pulse;
  });

  return (
    <group position={[0, 0, 0.02]}>
      <mesh>
        <boxGeometry args={[width + 0.18, height + 0.18, 0.07]} />
        <meshStandardMaterial
          color="#8ed8ff"
          emissive="#7dd3fc"
          emissiveIntensity={1}
          transparent
          opacity={0.45}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[width, 0.1, 0.12]} />
        <meshStandardMaterial
          ref={barRef}
          color="#ecfeff"
          emissive="#67e8f9"
          emissiveIntensity={1.5}
          roughness={0.15}
          metalness={0.35}
        />
      </mesh>
    </group>
  );
};
