import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { HighwayConfig, NoteEvent, STRING_COLORS_MAP } from '../types';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import { HighwayGuideLines } from './HighwayGuideLines';
import { worldPositionForEvent } from '../domain/mapping';

const INLAY_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_INLAYS = [12, 24];

const GRID_OPACITY = 0.18;
const GUIDE_OPACITY = 0.45;
const FRET_THICKNESS = 0.09;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

interface HighwayProps {
  config: HighwayConfig;
  notes: NoteEvent[];
  playheadRef: React.MutableRefObject<number>;
}

export const Highway: React.FC<HighwayProps> = ({ config, notes, playheadRef }) => {
  const { fretSpacing, stringSpacing, viewDistance } = config;

  const stringGlowDistance = config.stringGlowDistance ?? 14;
  const laneGlowDistance = config.laneGlowDistance ?? 18;
  const maxStringGlowIntensity = config.maxStringGlowIntensity ?? 0.95;
  const maxLaneGlowIntensity = config.maxLaneGlowIntensity ?? 0.7;

  // X: 24 frets centered. Range approx [-12 * fretSpacing, 12 * fretSpacing]
  // Y: 6 strings centered. Range approx [-3 * stringSpacing, 3 * stringSpacing]
  const width = 24 * fretSpacing;
  const height = 6 * stringSpacing;

  const stringGlowMaterialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const laneGlowMaterialRefs = useRef<Array<THREE.MeshBasicMaterial | null>>([]);

  const fretLines = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      // Fret boundaries: Fret 1 is index 0. Left edge is -12 * spacing.
      const x = (i - 12) * fretSpacing;

      return (
        <Line
          key={`fret-line-${i}`}
          points={[
            [x, -height / 2, 0],
            [x, height / 2, 0],
            [x, height / 2, -viewDistance],
            [x, -height / 2, -viewDistance],
            [x, -height / 2, 0],
          ]}
          color="#5f636b"
          lineWidth={1.5}
          opacity={GRID_OPACITY}
          transparent
          depthWrite={false}
        />
      );
    });
  }, [fretSpacing, height, viewDistance]);

  const fretOverlays = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => {
      const x = (i - 12) * fretSpacing;

      return (
        <mesh key={`fret-overlay-${i}`} position={[x, 0, 0.04]} renderOrder={5}>
          <planeGeometry args={[FRET_THICKNESS, height]} />
          <meshBasicMaterial
            color="#e2e8f0"
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      );
    });
  }, [fretSpacing, height]);

  const stringLines = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const s = i + 1;
      const y = (s - 3.5) * stringSpacing;
      const color = STRING_COLORS_MAP[s];

      return (
        <React.Fragment key={`string-line-${s}`}>
          {/* String Line at Hit Line */}
          <Line
            points={[[-width / 2, y, 0], [width / 2, y, 0]]}
            color={color}
            lineWidth={3.5}
            opacity={0.8}
            transparent
            depthWrite={false}
          />
          {/* String Line at Far Distance */}
          <Line
            points={[[-width / 2, y, -viewDistance], [width / 2, y, -viewDistance]]}
            color={color}
            lineWidth={2}
            opacity={0.2}
            transparent
            depthWrite={false}
          />
          {/* Connecting Lines at Edges (Visual guide for depth) */}
          <Line
            points={[[-width / 2, y, 0], [-width / 2, y, -viewDistance]]}
            color={color}
            lineWidth={1}
            opacity={0.08}
            transparent
            depthWrite={false}
          />
          <Line
            points={[[width / 2, y, 0], [width / 2, y, -viewDistance]]}
            color={color}
            lineWidth={1}
            opacity={0.08}
            transparent
            depthWrite={false}
          />
        </React.Fragment>
      );
    });
  }, [stringSpacing, width, viewDistance]);

  const inlays = useMemo(() => {
    return INLAY_FRETS.map((fret) => {
      const x = (fret - 12.5) * fretSpacing;
      const isDouble = DOUBLE_INLAYS.includes(fret);

      return (
        <group key={`inlay-${fret}`} position={[x, 0, 0.02]}>
          <Text
            position={[0, -height / 2 - 0.5, 0]}
            fontSize={0.4}
            color="#bfc5d2"
            anchorY="top"
          >
            {fret}
          </Text>
          {isDouble ? (
            <>
              <mesh position={[0, height / 4, 0]}>
                <circleGeometry args={[0.15, 16]} />
                <meshBasicMaterial color="#d6dbe5" />
              </mesh>
              <mesh position={[0, -height / 4, 0]}>
                <circleGeometry args={[0.15, 16]} />
                <meshBasicMaterial color="#d6dbe5" />
              </mesh>
            </>
          ) : (
            <mesh>
              <circleGeometry args={[0.15, 16]} />
              <meshBasicMaterial color="#d6dbe5" />
            </mesh>
          )}
        </group>
      );
    });
  }, [fretSpacing, height]);

  useFrame(() => {
    const closestByString = new Array<number>(6).fill(Number.POSITIVE_INFINITY);
    const closestByLane = new Array<number>(24).fill(Number.POSITIVE_INFINITY);
    const now = playheadRef.current;

    for (const note of notes) {
      const notePos = worldPositionForEvent(note, now, config);
      if (notePos.z > 0) continue;

      const distanceToHit = Math.abs(notePos.z);
      const stringIndex = note.string - 1;
      const laneIndex = note.fret - 1;

      if (stringIndex >= 0 && stringIndex < closestByString.length) {
        closestByString[stringIndex] = Math.min(closestByString[stringIndex], distanceToHit);
      }

      if (laneIndex >= 0 && laneIndex < closestByLane.length) {
        closestByLane[laneIndex] = Math.min(closestByLane[laneIndex], distanceToHit);
      }
    }

    for (let i = 0; i < 6; i += 1) {
      const mat = stringGlowMaterialRefs.current[i];
      if (!mat) continue;

      const distance = closestByString[i];
      const proximity = Number.isFinite(distance)
        ? clamp01(1 - (distance / stringGlowDistance))
        : 0;
      const intensity = proximity * maxStringGlowIntensity;

      mat.opacity = 0.03 + intensity * 0.75;
      mat.color.set(STRING_COLORS_MAP[i + 1]).multiplyScalar(1 + intensity * 0.65);
    }

    for (let i = 0; i < 24; i += 1) {
      const mat = laneGlowMaterialRefs.current[i];
      if (!mat) continue;

      const distance = closestByLane[i];
      const proximity = Number.isFinite(distance)
        ? clamp01(1 - (distance / laneGlowDistance))
        : 0;
      const intensity = proximity * maxLaneGlowIntensity;

      mat.opacity = intensity * 0.5;
      mat.color.set('#cbd5e1').multiplyScalar(1 + intensity * 0.7);
    }
  });

  useEffect(() => {
    const highwayBox = {
      min: {
        x: -width / 2,
        y: -height / 2,
        z: -viewDistance,
      },
      max: {
        x: width / 2,
        y: height / 2,
        z: 0,
      },
    };

    const laneGuides = {
      min: {
        x: -width / 2,
        y: -height / 2,
        z: -viewDistance,
      },
      max: {
        x: width / 2,
        y: -height / 2,
        z: 0.03,
      },
    };

    console.debug('[Highway] Extents', {
      highwayBox,
      laneGuides,
    });
  }, [height, viewDistance, width]);

  // Existing objects kept intact; only material visibility is tuned.
  // Added overlays: near-hit fret strips + lower-depth highway guides.
  return (
    <group>
      {/* Transparent Board Surface */}
      <mesh position={[0, 0, -viewDistance / 2]}>
        <boxGeometry args={[width, height, viewDistance]} />
        <meshBasicMaterial
          color="#0f0f12"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {fretLines}
      {stringLines}
      {inlays}

      <group renderOrder={4.5}>
        {Array.from({ length: 24 }).map((_, laneIndex) => {
          const fret = laneIndex + 1;
          const fretProbeEvent: NoteEvent = {
            id: `lane-glow-${fret}`,
            string: 1,
            fret,
            time: 0,
          };
          const pos = worldPositionForEvent(fretProbeEvent, 0, config);

          return (
            <mesh key={`lane-glow-${fret}`} position={[pos.x, -height / 2, -viewDistance / 2 + 0.03]}>
              <boxGeometry args={[FRET_THICKNESS * 1.25, 0.055, viewDistance]} />
              <meshBasicMaterial
                ref={(material) => {
                  laneGlowMaterialRefs.current[laneIndex] = material;
                }}
                color="#cbd5e1"
                transparent
                opacity={0}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>

      <HighwayGuideLines
        config={config}
        guideOpacity={GUIDE_OPACITY}
        guideLengthZ={viewDistance}
        lowerEdgeY={-height / 2}
      />

      {fretOverlays}

      <group renderOrder={6}>
        {Array.from({ length: 6 }).map((_, i) => {
          const s = i + 1;
          const y = (s - 3.5) * stringSpacing;

          return (
            <mesh key={`string-glow-${s}`} position={[0, y, 0.045]}>
              <planeGeometry args={[width, 0.07]} />
              <meshBasicMaterial
                ref={(material) => {
                  stringGlowMaterialRefs.current[i] = material;
                }}
                color={STRING_COLORS_MAP[s]}
                transparent
                opacity={0.03}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>

      {/* Hit Line Frame */}
      <Line
        points={[
          [-width / 2, -height / 2, 0],
          [width / 2, -height / 2, 0],
          [width / 2, height / 2, 0],
        ]}
        color="white"
        lineWidth={2}
      />
      <Line
        points={[
          [-width / 2, -height / 2, 0],
          [-width / 2, height / 2, 0],
        ]}
        color="white"
        lineWidth={2}
      />
    </group>
  );
};
