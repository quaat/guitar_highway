import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Group, MathUtils, Mesh } from 'three';

interface BackgroundSceneProps {
  bpm: number;
  enabled: boolean;
  quality: 'low' | 'medium' | 'high';
  tempoReactive: boolean;
}

const QUALITY_MULTIPLIER = { low: 0.65, medium: 1, high: 1.4 } as const;

const BackgroundScene: React.FC<BackgroundSceneProps> = ({ bpm, enabled, quality, tempoReactive }) => {
  const gridRef = useRef<Group>(null);
  const horizonRef = useRef<Group>(null);
  const particleRefs = useRef<Array<Mesh | null>>([]);

  const particles = useMemo(() => {
    if (!enabled) return [];
    const count = Math.floor(40 * QUALITY_MULTIPLIER[quality]);
    return Array.from({ length: count }).map((_, idx) => ({
      id: idx,
      x: MathUtils.randFloatSpread(45),
      y: MathUtils.randFloat(-2, 14),
      z: -MathUtils.randFloat(10, 210),
      scale: MathUtils.randFloat(0.02, 0.1),
      speed: MathUtils.randFloat(0.4, 1.1),
    }));
  }, [enabled, quality]);

  useFrame(({ clock }, delta) => {
    if (!enabled) return;

    const beat = tempoReactive ? bpm / 120 : 1;
    const t = clock.elapsedTime;

    if (gridRef.current) {
      gridRef.current.position.z = -120 + ((t * 9 * beat) % 12);
      gridRef.current.rotation.z = Math.sin(t * 0.12 * beat) * 0.02;
    }

    if (horizonRef.current) {
      horizonRef.current.position.y = 2.8 + Math.sin(t * 0.5 * beat) * 0.2;
      horizonRef.current.scale.setScalar(1 + Math.sin(t * 0.8 * beat) * 0.015);
    }

    particleRefs.current.forEach((mesh, idx) => {
      const p = particles[idx];
      if (!mesh || !p) return;
      mesh.position.z += delta * (2.5 + p.speed * beat);
      if (mesh.position.z > 6) mesh.position.z = -210;
    });
  });

  if (!enabled) return null;

  return (
    <group>
      <group ref={gridRef}>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={`bg-grid-${i}`} position={[0, -3 + i * 0.6, -120 - i * 10]} rotation={[-Math.PI / 2.8, 0, 0]}>
            <planeGeometry args={[80, 0.03]} />
            <meshBasicMaterial color="#7c3aed" transparent opacity={0.08} />
          </mesh>
        ))}
      </group>

      <group ref={horizonRef} position={[0, 3, -160]}>
        <mesh>
          <planeGeometry args={[90, 8]} />
          <meshBasicMaterial color={new Color('#0f172a')} transparent opacity={0.65} />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[90, 0.6]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} />
        </mesh>
      </group>

      {particles.map((particle, idx) => (
        <mesh
          key={`bg-particle-${particle.id}`}
          ref={(mesh) => {
            particleRefs.current[idx] = mesh;
          }}
          position={[particle.x, particle.y, particle.z]}
        >
          <sphereGeometry args={[particle.scale, 6, 6]} />
          <meshBasicMaterial color="#a5b4fc" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
};

export default React.memo(BackgroundScene);
