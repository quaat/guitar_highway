import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Matrix4, Object3D } from 'three';

interface ParticlesProps {
  enabled: boolean;
  quality: 'low' | 'medium' | 'high';
  hitPulseRef: React.MutableRefObject<number>;
  comboEnergyRef: React.MutableRefObject<number>;
}

const DUMMY = new Object3D();
const MATRIX = new Matrix4();

const Particles: React.FC<ParticlesProps> = ({ enabled, quality, hitPulseRef, comboEnergyRef }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const base = useMemo(() => {
    const count = quality === 'low' ? 36 : quality === 'medium' ? 64 : 96;
    return Array.from({ length: count }).map((_, i) => ({
      angle: (i / count) * Math.PI * 2,
      radius: 14 + (i % 9) * 1.6,
      y: -2 + (i % 17) * 0.45,
      speed: 0.2 + (i % 7) * 0.08,
      size: 0.03 + (i % 5) * 0.01,
    }));
  }, [quality]);

  useFrame(({ clock }) => {
    if (!enabled || !meshRef.current) return;
    const t = clock.elapsedTime;
    const intensity = 1 + comboEnergyRef.current * 0.8 + hitPulseRef.current * 0.4;

    base.forEach((entry, idx) => {
      DUMMY.position.set(
        Math.cos(t * entry.speed + entry.angle) * entry.radius,
        entry.y + Math.sin(t * 0.6 + idx) * 0.08,
        -40 - ((t * 10 * entry.speed + idx * 3) % 180),
      );
      const s = entry.size * intensity;
      DUMMY.scale.set(s, s, s);
      DUMMY.updateMatrix();
      MATRIX.copy(DUMMY.matrix);
      meshRef.current!.setMatrixAt(idx, MATRIX);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    const material = meshRef.current.material;
    if ('opacity' in material) {
      material.opacity = 0.25 + comboEnergyRef.current * 0.18 + hitPulseRef.current * 0.1;
    }
    if ('color' in material) {
      material.color = new Color('#93c5fd').lerp(new Color('#a78bfa'), comboEnergyRef.current * 0.8);
    }
  });

  if (!enabled) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, base.length]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#93c5fd" transparent opacity={0.3} depthWrite={false} />
    </instancedMesh>
  );
};

export default React.memo(Particles);
