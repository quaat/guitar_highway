import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshStandardMaterial } from 'three';
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
  const groupRef = useRef<Group>(null);
  const beadRef = useRef<Mesh>(null);
  const beadMaterialRef = useRef<MeshStandardMaterial>(null);
  const previewMeshRef = useRef<Mesh>(null);
  const previewMaterialRef = useRef<MeshStandardMaterial>(null);
  const rodRef = useRef<Mesh>(null);
  const trailRef = useRef<Mesh>(null);

  const color = useMemo(() => STRING_COLORS_MAP[note.string] || '#fff', [note.string]);

  const width = config.fretSpacing * 0.8;
  const height = config.stringSpacing * 0.6;
  const depth = 0.5;
  const sustainLength = Math.max(0, (note.duration ?? 0) * config.speed);

  const impactPosition = useMemo(
    () => worldPositionForEvent(note, note.time, config),
    [note, config]
  );

  useFrame(() => {
    if (!groupRef.current || !beadRef.current) return;

    const targetPos = worldPositionForEvent(note, playheadRef.current, config);
    groupRef.current.position.copy(targetPos);

    if (previewMeshRef.current) {
      previewMeshRef.current.position.set(impactPosition.x, impactPosition.y, PREVIEW_Z);
    }

    const elapsed = playheadRef.current - note.time;
    const timeUntilHit = note.time - playheadRef.current;
    const popProgress = Math.max(0, Math.min(1, elapsed / 0.12));

    if (elapsed >= 0 && elapsed <= 0.12) {
      const glow = (1 - popProgress) * 2.4;
      const scale = 1 + (1 - popProgress) * 0.45;
      beadRef.current.scale.set(scale, scale, scale);

      if (beadMaterialRef.current) {
        beadMaterialRef.current.emissive.set(color);
        beadMaterialRef.current.emissiveIntensity = glow;
      }
    } else {
      beadRef.current.scale.set(1, 1, 1);

      if (beadMaterialRef.current) {
        beadMaterialRef.current.emissiveIntensity = 0;
      }
    }

    const minFret = config.minFret ?? 1;
    const maxFret = config.maxFret ?? 24;
    const inFretRange = note.fret >= minFret && note.fret <= maxFret;

    const nearZ = 0.6;
    const farZ = -(config.viewDistance + 20);
    const headZ = targetPos.z;
    const tailZ = targetPos.z - sustainLength - depth * 0.5;
    const sustainIntersectsView = headZ >= farZ && tailZ <= nearZ;
    const visible = inFretRange && sustainIntersectsView;

    groupRef.current.visible = visible;

    if (rodRef.current) {
      const highwaySurfaceY = -(config.stringSpacing * 6) / 2;
      const rodHeight = Math.max(0.01, targetPos.y - highwaySurfaceY);
      rodRef.current.scale.y = rodHeight;
      // Keep the rod explicitly pointing downward to the highway floor from note position.
      rodRef.current.position.y = -rodHeight * 0.5;
      rodRef.current.visible = visible;
    }

    if (trailRef.current) {
      trailRef.current.visible = visible && sustainLength > 0.001;
    }

    if (previewMeshRef.current && previewMaterialRef.current) {
      const previewVisible = inFretRange && timeUntilHit <= PREVIEW_LEAD_TIME_SEC && timeUntilHit >= -PREVIEW_FADE_OUT_SEC;

      let previewOpacity = 0;
      if (timeUntilHit >= 0) {
        const t = clamp(1 - timeUntilHit / PREVIEW_LEAD_TIME_SEC, 0, 1);
        previewOpacity = smoothstep(t);
      } else {
        const fadeOut = clamp((-timeUntilHit) / PREVIEW_FADE_OUT_SEC, 0, 1);
        previewOpacity = 1 - fadeOut;
      }

      previewMaterialRef.current.opacity = previewOpacity;
      previewMeshRef.current.visible = previewVisible;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {sustainLength > 0.001 && (
          <mesh ref={trailRef} position={[0, 0, -(depth * 0.5 + sustainLength * 0.5)]}>
            <boxGeometry args={[width * 0.9, height * 0.9, sustainLength]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.8}
              roughness={0.35}
              metalness={0.08}
              emissive={color}
              emissiveIntensity={0.06}
            />
          </mesh>
        )}

        <mesh ref={beadRef}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial ref={beadMaterialRef} color={color} roughness={0.3} metalness={0.1} />
        </mesh>

        {note.string < 6 && (
          <mesh ref={rodRef} position={[0, -0.5, 0]}>
            <boxGeometry args={[Math.max(0.035, config.fretSpacing * 0.045), 1, Math.max(0.03, depth * 0.08)]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.5}
              roughness={0.6}
              metalness={0.05}
            />
          </mesh>
        )}
      </group>

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
