import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { NoteEvent, HighwayConfig, STRING_COLORS_MAP } from '../types';
import { worldPositionForEvent } from '../domain/mapping';

interface NoteObjectProps {
  note: NoteEvent;
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
}

const NoteObject: React.FC<NoteObjectProps> = ({ note, playheadRef, config }) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  
  // Memoize static geometry props if needed, but here simple args are fine.
  // We calculate static X/Y once to avoid recalculating everything.
  // Actually, worldPositionForEvent does X/Y/Z. We can optimize.
  
  const color = useMemo(() => STRING_COLORS_MAP[note.string] || '#fff', [note.string]);
  
  // Reuse Vector3 to avoid GC
  const posVec = useMemo(() => new Vector3(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    // Calculate Z dynamically
    // We could optimize by only calculating Z, but the mapping function is cheap.
    // Let's manually do Z for perf:
    // const z = -(note.time - playheadRef.current) * config.speed;
    
    // Using the shared domain function ensures consistency
    const targetPos = worldPositionForEvent(note, playheadRef.current, config);
    
    meshRef.current.position.copy(targetPos);

    const elapsed = playheadRef.current - note.time;
    const popProgress = Math.max(0, Math.min(1, elapsed / 0.12));

    if (elapsed >= 0 && elapsed <= 0.12) {
      const glow = (1 - popProgress) * 2.4;
      const scale = 1 + (1 - popProgress) * 0.45;
      meshRef.current.scale.set(scale, scale, scale);

      if (materialRef.current) {
        materialRef.current.emissive.set(color);
        materialRef.current.emissiveIntensity = glow;
      }
    } else {
      meshRef.current.scale.set(1, 1, 1);

      if (materialRef.current) {
        materialRef.current.emissiveIntensity = 0;
      }
    }

    const dist = targetPos.z;
    const visible = dist < 0.6 && dist > -(config.viewDistance + 20);
    meshRef.current.visible = visible;
  });

  // Calculate dimensions based on spacing to fit in lane
  const width = config.fretSpacing * 0.8;
  const height = config.stringSpacing * 0.6;
  const depth = 0.5; // Fixed thickness

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial ref={materialRef} color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
};

export default React.memo(NoteObject);
