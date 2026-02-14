import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshStandardMaterial, MathUtils } from 'three';
import { NoteEvent, HighwayConfig, STRING_COLORS_MAP } from '../types';
import { worldPositionForEvent } from '../domain/mapping';

interface NoteObjectProps {
  note: NoteEvent;
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
  noteEffectsEnabled?: boolean;
  onCrossHitLine?: (isSustain: boolean) => void;
}

const PREVIEW_LEAD_TIME_SEC = 2.0;
const PREVIEW_Z = 0.02;
const PREVIEW_FADE_OUT_SEC = 0.15;
const CUT_PLANE_Z = 0;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const smoothstep = (value: number): number => value * value * (3 - 2 * value);
const rangesIntersect = (aMin: number, aMax: number, bMin: number, bMax: number): boolean => aMax >= bMin && aMin <= bMax;

const NoteObject: React.FC<NoteObjectProps> = ({ note, playheadRef, config, noteEffectsEnabled = true, onCrossHitLine }) => {
  const groupRef = useRef<Group>(null);
  const beadRef = useRef<Mesh>(null);
  const beadMaterialRef = useRef<MeshStandardMaterial>(null);
  const previewMeshRef = useRef<Mesh>(null);
  const previewMaterialRef = useRef<MeshStandardMaterial>(null);
  const rodRef = useRef<Mesh>(null);
  const trailRef = useRef<Mesh>(null);
  const prevDeltaRef = useRef(note.time - playheadRef.current);

  const color = useMemo(() => STRING_COLORS_MAP[note.string] || '#fff', [note.string]);

  const width = config.fretSpacing * 0.8;
  const height = config.stringSpacing * 0.6;
  const depth = 0.5;
  const sustainLength = Math.max(0, (note.duration ?? 0) * config.speed);
  const impactPosition = useMemo(() => worldPositionForEvent(note, note.time, config), [note, config]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !beadRef.current) return;

    const targetPos = worldPositionForEvent(note, playheadRef.current, config);
    groupRef.current.position.copy(targetPos);

    if (previewMeshRef.current) {
      previewMeshRef.current.position.set(impactPosition.x, impactPosition.y, PREVIEW_Z);
    }

    const elapsed = playheadRef.current - note.time;
    const timeUntilHit = note.time - playheadRef.current;
    const popProgress = Math.max(0, Math.min(1, elapsed / 0.12));
    const movementPulse = noteEffectsEnabled ? 1 + Math.sin(clock.elapsedTime * 6 + note.time * 3) * 0.04 : 1;

    if (elapsed >= 0 && elapsed <= 0.12) {
      const glow = (1 - popProgress) * 2.4;
      const scale = 1 + (1 - popProgress) * 0.45;
      beadRef.current.scale.set(scale * movementPulse, scale * movementPulse, scale * movementPulse);

      if (beadMaterialRef.current) {
        beadMaterialRef.current.emissive.set(color);
        beadMaterialRef.current.emissiveIntensity = noteEffectsEnabled ? glow + 0.35 : glow;
      }
    } else {
      beadRef.current.scale.set(movementPulse, movementPulse, movementPulse);
      if (beadMaterialRef.current) beadMaterialRef.current.emissiveIntensity = noteEffectsEnabled ? 0.35 : 0;
    }

    const prevDelta = prevDeltaRef.current;
    if (prevDelta > 0 && timeUntilHit <= 0) onCrossHitLine?.((note.duration ?? 0) > 0.2);
    prevDeltaRef.current = timeUntilHit;

    const minFret = config.minFret ?? 1;
    const maxFret = config.maxFret ?? 24;
    const inFretRange = note.fret >= minFret && note.fret <= maxFret;

    const nearZ = CUT_PLANE_Z;
    const farZ = -(config.viewDistance + 20);
    const beadMinZ = targetPos.z - depth * 0.5;
    const beadMaxZ = targetPos.z + depth * 0.5;

    const trailWorldEndZ = targetPos.z - depth * 0.5;
    const trailWorldStartZ = trailWorldEndZ - sustainLength;
    const clippedTrailEndZ = Math.min(trailWorldEndZ, CUT_PLANE_Z);
    const clippedTrailLength = Math.max(0, clippedTrailEndZ - trailWorldStartZ);

    const beadVisible = inFretRange && rangesIntersect(beadMinZ, beadMaxZ, farZ, nearZ);
    const trailVisible = inFretRange && clippedTrailLength > 0.001 && rangesIntersect(trailWorldStartZ, clippedTrailEndZ, farZ, nearZ);

    groupRef.current.visible = beadVisible || trailVisible;
    beadRef.current.visible = beadVisible;

    if (rodRef.current) {
      const highwaySurfaceY = -(config.stringSpacing * 6) / 2;
      const noteBottomY = targetPos.y - height * 0.5;
      const rodHeight = Math.max(0.01, noteBottomY - highwaySurfaceY);
      rodRef.current.scale.y = rodHeight;
      rodRef.current.position.y = -height * 0.5 - rodHeight * 0.5;
      rodRef.current.visible = beadVisible;
    }

    if (trailRef.current) {
      const localTrailMidZ = ((trailWorldStartZ + clippedTrailEndZ) * 0.5) - targetPos.z;
      trailRef.current.position.set(0, 0, localTrailMidZ);
      trailRef.current.scale.set(1, 1, clippedTrailLength);
      trailRef.current.visible = trailVisible;
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
        <mesh ref={trailRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
          <boxGeometry args={[width * 0.9, height * 0.9, 1]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.82}
            roughness={0.26}
            metalness={0.2}
            emissive={color}
            emissiveIntensity={noteEffectsEnabled ? 0.32 : 0.06}
          />
        </mesh>

        <mesh ref={beadRef}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial ref={beadMaterialRef} color={color} roughness={0.24} metalness={0.28} emissive={color} emissiveIntensity={noteEffectsEnabled ? 0.28 : 0} />
        </mesh>

        {(note.duration ?? 0) > 0.2 && noteEffectsEnabled && (
          <mesh position={[0, 0, -MathUtils.clamp(sustainLength * 0.4, 0.2, 2.2)]}>
            <cylinderGeometry args={[0.04, 0.04, Math.max(0.6, sustainLength * 0.8), 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.32} depthWrite={false} />
          </mesh>
        )}

        <mesh ref={rodRef} position={[0, -0.5, 0]}>
          <boxGeometry args={[Math.max(0.035, config.fretSpacing * 0.045), 1, Math.max(0.03, depth * 0.08)]} />
          <meshStandardMaterial color={color} transparent opacity={0.5} roughness={0.6} metalness={0.05} />
        </mesh>
      </group>

      <mesh ref={previewMeshRef}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial ref={previewMaterialRef} color={color} roughness={0.6} metalness={0} transparent={true} opacity={0} />
      </mesh>
    </>
  );
};

export default React.memo(NoteObject);
