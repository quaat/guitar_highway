import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MeshBasicMaterial } from 'three';
import { HighwayConfig } from '../../types';

interface HighwayEffectsProps {
  config: HighwayConfig;
  enabled: boolean;
  hitPulseRef: React.MutableRefObject<number>;
  comboEnergyRef: React.MutableRefObject<number>;
  quality: 'low' | 'medium' | 'high';
}

const HighwayEffects: React.FC<HighwayEffectsProps> = ({ config, enabled, hitPulseRef, comboEnergyRef, quality }) => {
  const streakRefs = useRef<Array<MeshBasicMaterial | null>>([]);
  const markerRefs = useRef<Array<MeshBasicMaterial | null>>([]);
  const laneFlashRef = useRef<MeshBasicMaterial>(null);

  const minFret = config.minFret ?? 1;
  const maxFret = config.maxFret ?? 24;
  const fretCount = Math.max(1, maxFret - minFret + 1);
  const width = fretCount * config.fretSpacing;
  const height = 6 * config.stringSpacing;

  const streakCount = quality === 'low' ? 4 : quality === 'medium' ? 7 : 10;

  const fretMarkers = useMemo(
    () => Array.from({ length: Math.max(1, Math.floor(fretCount / 2)) }).map((_, i) => minFret + i * 2),
    [fretCount, minFret],
  );

  useFrame(({ clock }) => {
    if (!enabled) return;
    const t = clock.elapsedTime;

    streakRefs.current.forEach((mat, idx) => {
      if (!mat) return;
      const phase = t * 1.8 + idx * 0.45;
      mat.opacity = 0.05 + Math.max(0, Math.sin(phase)) * 0.1 + comboEnergyRef.current * 0.06;
    });

    markerRefs.current.forEach((mat, idx) => {
      if (!mat) return;
      const pulse = 0.18 + Math.abs(Math.sin(t * 1.6 + idx * 0.4)) * 0.16;
      mat.opacity = pulse + comboEnergyRef.current * 0.12;
      mat.color.copy(new Color('#22d3ee')).lerp(new Color('#f472b6'), comboEnergyRef.current * 0.65);
    });

    if (laneFlashRef.current) {
      laneFlashRef.current.opacity = hitPulseRef.current * 0.22 + comboEnergyRef.current * 0.06;
    }
  });

  if (!enabled) return null;

  return (
    <group renderOrder={3.5}>
      {Array.from({ length: streakCount }).map((_, idx) => {
        const zOffset = -(idx / streakCount) * config.viewDistance;
        return (
          <mesh key={`highway-streak-${idx}`} position={[0, -height / 2 + 0.015, zOffset]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, config.viewDistance / streakCount]} />
            <meshBasicMaterial
              ref={(mat) => {
                streakRefs.current[idx] = mat;
              }}
              color="#60a5fa"
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {fretMarkers.map((fret, idx) => {
        const x = (fret - (minFret + maxFret) / 2) * config.fretSpacing;
        return (
          <mesh key={`fret-marker-glow-${fret}`} position={[x, 0, 0.05]}>
            <planeGeometry args={[0.15, height * 0.95]} />
            <meshBasicMaterial
              ref={(mat) => {
                markerRefs.current[idx] = mat;
              }}
              color="#22d3ee"
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={laneFlashRef} color="#f8fafc" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

export default React.memo(HighwayEffects);
