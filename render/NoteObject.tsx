import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { NoteEvent, HighwayConfig, STRING_COLORS_MAP } from '../types';
import { worldPositionForEvent } from '../domain/mapping';

interface NoteObjectProps {
  note: NoteEvent;
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
}

const NoteObject: React.FC<NoteObjectProps> = ({ note, playheadRef, config }) => {
  const groupRef = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  const bodyMatRef = useRef<MeshStandardMaterial>(null);
  const capMatRef = useRef<MeshStandardMaterial>(null);
  const trailMatRef = useRef<MeshStandardMaterial>(null);

  const baseColor = useMemo(() => STRING_COLORS_MAP[note.string] || '#ffffff', [note.string]);
  const posVec = useMemo(() => new Vector3(), []);

  const width = config.fretSpacing * 0.58;
  const height = config.stringSpacing * 0.42;
  const length = 0.82;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const targetPos = worldPositionForEvent(note, playheadRef.current, config);
    posVec.copy(targetPos);
    groupRef.current.position.copy(posVec);

    const visible = targetPos.z < 6 && targetPos.z > -(config.viewDistance + 18);
    groupRef.current.visible = visible;
    if (!visible) return;

    const nearHitLine = Math.max(0, 1 - Math.abs(targetPos.z) / 15);
    const eased = nearHitLine * nearHitLine;
    const scale = 1 + eased * 0.18;
    groupRef.current.scale.setScalar(scale);

    const pulse = Math.sin(performance.now() * 0.002 + note.string) * 0.08;

    if (bodyMatRef.current) {
      bodyMatRef.current.emissiveIntensity = 1.35 + eased * 1.2 + pulse;
    }

    if (capMatRef.current) {
      capMatRef.current.emissiveIntensity = 0.8 + eased * 0.7;
    }

    if (trailMatRef.current) {
      trailMatRef.current.emissiveIntensity = 0.35 + eased * 0.4;
      trailMatRef.current.opacity = 0.22 + eased * 0.28;
    }

    groupRef.current.rotation.z += delta * 0.05;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef}>
        <capsuleGeometry args={[Math.min(width, height) * 0.45, length, 8, 16]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.28}
        />
      </mesh>

      <mesh position={[0, height * 0.16, 0.1]}>
        <sphereGeometry args={[Math.min(width, height) * 0.22, 12, 10]} />
        <meshStandardMaterial
          ref={capMatRef}
          color="#f8fafc"
          emissive="#e2e8f0"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.42}
        />
      </mesh>

      <mesh position={[0, 0, -0.65]} scale={[0.78, 0.55, 1.5]}>
        <capsuleGeometry args={[Math.min(width, height) * 0.34, 0.6, 6, 8]} />
        <meshStandardMaterial
          ref={trailMatRef}
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.35}
          transparent
          opacity={0.28}
          roughness={0.45}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
};

export default React.memo(NoteObject);
