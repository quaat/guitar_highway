import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBasicMaterial } from 'three';

interface NoteEffectsProps {
  enabled: boolean;
  hitPulseRef: React.MutableRefObject<number>;
  comboEnergyRef: React.MutableRefObject<number>;
}

const NoteEffects: React.FC<NoteEffectsProps> = ({ enabled, hitPulseRef, comboEnergyRef }) => {
  const flashRef = useRef<MeshBasicMaterial>(null);
  const comboRef = useRef<MeshBasicMaterial>(null);

  useFrame(() => {
    if (!enabled) return;
    if (flashRef.current) flashRef.current.opacity = hitPulseRef.current * 0.2;
    if (comboRef.current) comboRef.current.opacity = comboEnergyRef.current * 0.08;
  });

  if (!enabled) return null;

  return (
    <group renderOrder={7}>
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[40, 0.8]} />
        <meshBasicMaterial ref={flashRef} color="#ffffff" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.09]}>
        <planeGeometry args={[42, 7.2]} />
        <meshBasicMaterial ref={comboRef} color="#a78bfa" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
};

export default React.memo(NoteEffects);
