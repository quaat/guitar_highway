import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Highway } from './Highway';
import NoteObject from './NoteObject';
import { HighwayConfig, NoteEvent, RuntimeNoteState } from '../types';
import { updateRuntimeStateMap } from '../domain/noteLifecycle';

interface SceneProps {
  notes: NoteEvent[];
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
}

const RuntimeStateController: React.FC<{
  notes: NoteEvent[];
  playheadRef: React.MutableRefObject<number>;
  runtimeStatesRef: React.MutableRefObject<Map<string, RuntimeNoteState>>;
  config: HighwayConfig;
}> = ({ notes, playheadRef, runtimeStatesRef, config }) => {
  useFrame(() => {
    runtimeStatesRef.current = updateRuntimeStateMap(
      notes,
      playheadRef.current,
      runtimeStatesRef.current,
      config,
    );
  });

  return null;
};

const Scene: React.FC<SceneProps> = ({ notes, playheadRef, config }) => {
  const runtimeStatesRef = useRef<Map<string, RuntimeNoteState>>(new Map());

  useEffect(() => {
    runtimeStatesRef.current = new Map();
  }, [notes]);

  return (
    <Canvas className="w-full h-full block bg-gray-900">
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[0, 6, 8]} fov={50} />
        <OrbitControls target={[0, 0, -10]} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />

        <ambientLight intensity={0.55} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[0, 5, 5]} intensity={0.8} />

        <fog attach="fog" args={['#111827', config.viewDistance * 0.8, config.viewDistance * 1.5]} />
        <color attach="background" args={['#111827']} />

        <RuntimeStateController
          notes={notes}
          playheadRef={playheadRef}
          runtimeStatesRef={runtimeStatesRef}
          config={config}
        />

        <Highway config={config} />

        <group>
          {notes.map((note) => (
            <NoteObject
              key={note.id}
              note={note}
              playheadRef={playheadRef}
              runtimeStatesRef={runtimeStatesRef}
              config={config}
            />
          ))}
        </group>
      </Suspense>
    </Canvas>
  );
};

export default Scene;
