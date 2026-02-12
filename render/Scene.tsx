import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Highway } from './Highway';
import NoteObject from './NoteObject';
import { NoteEvent, HighwayConfig } from '../types';

interface SceneProps {
  notes: NoteEvent[];
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
}

const Scene: React.FC<SceneProps> = ({ notes, playheadRef, config }) => {
  return (
    <Canvas className="w-full h-full block bg-gray-900">
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[0, 6, 8]} fov={50} />
        <OrbitControls
          target={[0, 0, -10]}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[0, 5, 5]} intensity={1} castShadow />

        {/* Fog for Depth */}
        <fog attach="fog" args={['#111827', 5, config.viewDistance]} />
        <color attach="background" args={['#111827']} />

        {/* The Highway Structure */}
        <Highway config={config} notes={notes} playheadRef={playheadRef} />

        {/* Notes */}
        <group>
          {notes.map((note) => (
            <NoteObject
              key={note.id}
              note={note}
              playheadRef={playheadRef}
              config={config}
            />
          ))}
        </group>

      </Suspense>
    </Canvas>
  );
};

export default Scene;
