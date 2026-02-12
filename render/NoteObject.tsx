import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial } from 'three';
import { HighwayConfig, NoteEvent, RuntimeNoteState, STRING_COLORS_MAP } from '../types';
import { clampedNoteDepth, noteDepthForTime } from '../domain/noteLifecycle';

interface NoteObjectProps {
  note: NoteEvent;
  playheadRef: React.MutableRefObject<number>;
  runtimeStatesRef: React.MutableRefObject<Map<string, RuntimeNoteState>>;
  config: HighwayConfig;
}

const NoteObject: React.FC<NoteObjectProps> = ({ note, playheadRef, runtimeStatesRef, config }) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  const color = useMemo(() => STRING_COLORS_MAP[note.string] || '#fff', [note.string]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return;

    const runtime = runtimeStatesRef.current.get(note.id);

    if (!runtime || runtime.state === 'expired') {
      meshRef.current.visible = false;
      return;
    }

    meshRef.current.visible = true;

    const rawZ = noteDepthForTime(note.time, playheadRef.current, config.speed);
    const z = runtime.state === 'atHitLine' ? config.hitLineZ : clampedNoteDepth(rawZ, config.hitLineZ);

    meshRef.current.position.set(
      (note.fret - 12.5) * config.fretSpacing,
      (note.string - 3.5) * config.stringSpacing,
      z,
    );

    if (runtime.state === 'atHitLine') {
      const pulseEnabled = config.hitVisual?.pulse ?? true;
      const pulseScale = pulseEnabled ? 1 + Math.sin(clock.elapsedTime * 28) * 0.06 : 1;
      meshRef.current.scale.setScalar(pulseScale);

      materialRef.current.emissive.set(color);
      materialRef.current.emissiveIntensity = config.hitVisual?.emissiveBoost ?? 1.2;
      materialRef.current.roughness = 0.2;
      materialRef.current.metalness = 0.2;
      return;
    }

    meshRef.current.scale.setScalar(1);
    materialRef.current.emissive.set('#000000');
    materialRef.current.emissiveIntensity = 0;
    materialRef.current.roughness = 0.3;
    materialRef.current.metalness = 0.1;
  });

  const width = config.fretSpacing * 0.8;
  const height = config.stringSpacing * 0.6;
  const depth = 0.5;

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial ref={materialRef} color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
};

export default React.memo(NoteObject);
