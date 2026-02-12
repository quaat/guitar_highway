import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GlowLaneProps {
  position: [number, number, number];
  length: number;
  thickness: number;
  color: THREE.ColorRepresentation;
  axis: 'x' | 'y' | 'z';
  baseEmissive?: number;
  pulseAmplitude?: number;
  pulseSpeed?: number;
  glowBoostNearHitLine?: boolean;
  transparent?: boolean;
  opacity?: number;
}

export const GlowLane: React.FC<GlowLaneProps> = ({
  position,
  length,
  thickness,
  color,
  axis,
  baseEmissive = 0.7,
  pulseAmplitude = 0.2,
  pulseSpeed = 1.2,
  glowBoostNearHitLine = false,
  transparent = false,
  opacity = 1,
}) => {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const geometryArgs = useMemo<[number, number, number]>(() => {
    if (axis === 'x') return [length, thickness, thickness * 0.6];
    if (axis === 'y') return [thickness, length, thickness * 0.6];
    return [thickness, thickness, length];
  }, [axis, length, thickness]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.elapsedTime;
    const pulse = Math.sin(t * pulseSpeed + position[0] * 0.25 + position[1] * 0.2) * pulseAmplitude;
    const hitLineBoost = glowBoostNearHitLine ? Math.max(0, 1 - Math.abs(position[2]) * 0.1) * 0.7 : 0;
    matRef.current.emissiveIntensity = baseEmissive + pulse + hitLineBoost;
  });

  return (
    <mesh position={position}>
      <boxGeometry args={geometryArgs} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={baseEmissive}
        roughness={0.25}
        metalness={0.2}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
};
