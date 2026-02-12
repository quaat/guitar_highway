import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial } from 'three';
import { NoteEvent, HighwayConfig, STRING_COLORS_MAP } from '../types';
import { worldPositionForEvent } from '../domain/mapping';

interface NoteObjectProps {
  note: NoteEvent;
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
}

const PREVIEW_LEAD_TIME_SEC = 2.0;
const PREVIEW_Z = 0.02;
const PREVIEW_FADE_OUT_SEC = 0.15;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const smoothstep = (value: number): number => value * value * (3 - 2 * value);

const NoteObject: React.FC<NoteObjectProps> = ({ note, playheadRef, config }) => {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const previewMeshRef = useRef<Mesh>(null);
  const previewMaterialRef = useRef<MeshStandardMaterial>(null);
  
  const color = useMemo(() => STRING_COLORS_MAP[note.string] || '#fff', [note.string]);

  // Reuse Vector3 to avoid GC; this keeps preview aligned with lane mapping at impact.
  const impactPosition = useMemo(
    () => worldPositionForEvent(note, note.time, config),
    [note, config]
  );

  useFrame(() => {
    if (!meshRef.current) return;

    // Calculate Z dynamically
    // We could optimize by only calculating Z, but the mapping function is cheap.
    // Let's manually do Z for perf:
    // const z = -(note.time - playheadRef.current) * config.speed;
    
    // Using the shared domain function ensures consistency
    const targetPos = worldPositionForEvent(note, playheadRef.current, config);
    
    meshRef.current.position.copy(targetPos);

    if (previewMeshRef.current) {
      // Slight positive z-offset avoids z-fighting with highway line geometry.
      previewMeshRef.current.position.set(impactPosition.x, impactPosition.y, PREVIEW_Z);
    }

    const elapsed = playheadRef.current - note.time;
    const timeUntilHit = note.time - playheadRef.current;
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

    if (previewMeshRef.current && previewMaterialRef.current) {
      const previewVisible = timeUntilHit <= PREVIEW_LEAD_TIME_SEC && timeUntilHit >= -PREVIEW_FADE_OUT_SEC;

      let previewOpacity = 0;
      if (timeUntilHit >= 0) {
        const t = clamp(1 - timeUntilHit / PREVIEW_LEAD_TIME_SEC, 0, 1);
        // Smoothstep eases in/out so the ghost note fades naturally.
        previewOpacity = smoothstep(t);
      } else {
        const fadeOut = clamp((-timeUntilHit) / PREVIEW_FADE_OUT_SEC, 0, 1);
        previewOpacity = 1 - fadeOut;
      }

      previewMaterialRef.current.opacity = previewOpacity;
      previewMeshRef.current.visible = previewVisible;
    }
  });

  // Calculate dimensions based on spacing to fit in lane
  const width = config.fretSpacing * 0.8;
  const height = config.stringSpacing * 0.6;
  const depth = 0.5; // Fixed thickness

  return (
    <>
      <mesh ref={meshRef}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial ref={materialRef} color={color} roughness={0.3} metalness={0.1} />
      </mesh>

      <mesh ref={previewMeshRef}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          ref={previewMaterialRef}
          color={color}
          roughness={0.6}
          metalness={0}
          transparent={true}
          opacity={0}
        />
      </mesh>
    </>
  );
};

export default React.memo(NoteObject);
