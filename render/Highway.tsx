import React, { useMemo, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HighwayConfig, STRING_COLORS_MAP } from '../types';
import { GlowLane } from './GlowLane';
import { HighwayGrid } from './HighwayGrid';
import { HitLine } from './HitLine';

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

interface HighwayProps {
  config: HighwayConfig;
}

const InlayMarker: React.FC<{ x: number; height: number; bright: boolean }> = ({ x, height, bright }) => {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const pulse = (Math.sin(clock.elapsedTime * 1.6 + x * 0.15) + 1) * 0.12;
    matRef.current.emissiveIntensity = (bright ? 1.25 : 0.65) + pulse;
  });

  return (
    <group position={[x, 0, 0.03]}>
      <mesh position={[0, 0, -0.01]}>
        <ringGeometry args={[0.11, 0.15, 24]} />
        <meshStandardMaterial color="#b5e9ff" emissive="#67e8f9" emissiveIntensity={0.45} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial
          ref={matRef}
          color={bright ? '#dbeafe' : '#a5f3fc'}
          emissive={bright ? '#22d3ee' : '#38bdf8'}
          emissiveIntensity={bright ? 1.2 : 0.7}
          roughness={0.25}
          metalness={0.25}
        />
      </mesh>
      {bright && (
        <>
          <mesh position={[0, height / 4, 0]}>
            <circleGeometry args={[0.1, 24]} />
            <meshStandardMaterial color="#dbeafe" emissive="#22d3ee" emissiveIntensity={1.35} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh position={[0, -height / 4, 0]}>
            <circleGeometry args={[0.1, 24]} />
            <meshStandardMaterial color="#dbeafe" emissive="#22d3ee" emissiveIntensity={1.35} roughness={0.3} metalness={0.2} />
          </mesh>
        </>
      )}
    </group>
  );
};

export const Highway: React.FC<HighwayProps> = ({ config }) => {
  const { fretSpacing, stringSpacing, viewDistance } = config;
  const width = 24 * fretSpacing;
  const height = 6 * stringSpacing;

  const fretLines = useMemo(
    () =>
      Array.from({ length: 25 }).map((_, i) => {
        const x = (i - 12) * fretSpacing;
        return (
          <GlowLane
            key={`fret-line-${i}`}
            position={[x, 0, -viewDistance / 2]}
            length={viewDistance}
            thickness={0.04}
            color="#60a5fa"
            axis="z"
            baseEmissive={0.55}
            pulseAmplitude={0.2}
            pulseSpeed={1.3}
            glowBoostNearHitLine
          />
        );
      }),
    [fretSpacing, viewDistance],
  );

  const stringLines = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => {
        const stringNumber = i + 1;
        const y = (stringNumber - 3.5) * stringSpacing;
        const color = new THREE.Color(STRING_COLORS_MAP[stringNumber]).offsetHSL(0.03 * i, -0.1, 0.05).getStyle();
        return (
          <GlowLane
            key={`string-line-${stringNumber}`}
            position={[0, y, -viewDistance / 2]}
            length={viewDistance}
            thickness={0.055}
            color={color}
            axis="z"
            baseEmissive={0.72}
            pulseAmplitude={0.1}
            pulseSpeed={0.75}
            glowBoostNearHitLine
            transparent
            opacity={0.95}
          />
        );
      }),
    [stringSpacing, viewDistance],
  );

  const fretNumbers = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, index) => {
        const fret = index + 1;
        const x = (fret - 12.5) * fretSpacing;
        return (
          <Billboard key={`fret-number-${fret}`} position={[x, -height / 2 - 0.45, -0.04]} follow lockX={false} lockY={false} lockZ={false}>
            <Text fontSize={0.3} color="#f4f9ff" outlineWidth={0.02} outlineColor="#38bdf8" anchorX="center" anchorY="middle">
              {fret}
            </Text>
          </Billboard>
        );
      }),
    [fretSpacing, height],
  );

  return (
    <group>
      <mesh position={[0, 0, -viewDistance / 2]}>
        <boxGeometry args={[width, height, viewDistance]} />
        <meshStandardMaterial
          color="#080c18"
          emissive="#0a1630"
          emissiveIntensity={0.22}
          transparent
          opacity={0.82}
          side={THREE.DoubleSide}
          roughness={0.9}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>

      <HighwayGrid width={width} height={height} viewDistance={viewDistance} />
      {fretLines}
      {stringLines}
      {fretNumbers}

      {INLAY_FRETS.map((fret) => {
        const x = (fret - 12.5) * fretSpacing;
        const isDouble = DOUBLE_INLAYS.includes(fret);
        if (isDouble) {
          return (
            <group key={`inlay-${fret}`}>
              <InlayMarker x={x} height={height} bright />
            </group>
          );
        }
        return <InlayMarker key={`inlay-${fret}`} x={x} height={height} bright={false} />;
      })}

      <HitLine width={width} height={height} />
    </group>
  );
};
