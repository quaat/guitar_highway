import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import * as THREE from 'three';
import { Highway } from './Highway';
import NoteObject from './NoteObject';
import { NoteEvent, HighwayConfig } from '../types';

interface SceneProps {
  notes: NoteEvent[];
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
}

const CameraRig: React.FC = () => {
  const rigRef = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (!rigRef.current) return;
    const t = clock.elapsedTime;
    rigRef.current.position.x = Math.sin(t * 0.22) * 0.08;
    rigRef.current.position.y = Math.sin(t * 0.31) * 0.06;
    rigRef.current.rotation.z = THREE.MathUtils.damp(rigRef.current.rotation.z, Math.sin(t * 0.2) * 0.012, 4, delta);
  });

  return (
    <group ref={rigRef}>
      <PerspectiveCamera makeDefault position={[0, 4.6, 7.5]} fov={48} />
    </group>
  );
};

const PostEffects: React.FC = () => {
  const { gl, scene, camera, size } = useThree();

  const bloomPass = useMemo(
    () => new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 1.15, 0.45, 0.25),
    [size.height, size.width],
  );

  const composer = useMemo(() => {
    const effectComposer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const vignetteUniforms = THREE.UniformsUtils.clone(VignetteShader.uniforms);
    vignetteUniforms.offset.value = 1.15;
    vignetteUniforms.darkness.value = 1.05;
    const vignettePass = new ShaderPass({ ...VignetteShader, uniforms: vignetteUniforms });

    effectComposer.addPass(renderPass);
    effectComposer.addPass(bloomPass);
    effectComposer.addPass(vignettePass);
    return effectComposer;
  }, [bloomPass, camera, gl, scene]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size.height, size.width]);

  useFrame((_, delta) => {
    bloomPass.strength = THREE.MathUtils.damp(bloomPass.strength, 1.15, 2.4, delta);
    composer.render(delta);
  }, 1);

  return null;
};

const Scene: React.FC<SceneProps> = ({ notes, playheadRef, config }) => {
  return (
    <Canvas
      className="w-full h-full block"
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={({ gl }) => {
        gl.physicallyCorrectLights = true;
      }}
    >
      <Suspense fallback={null}>
        <CameraRig />
        <OrbitControls target={[0, 0, -12]} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.1} />

        <color attach="background" args={['#04060d']} />
        <fogExp2 attach="fog" args={['#050913', 0.028]} />

        <ambientLight intensity={0.11} color="#91a7ff" />
        <hemisphereLight intensity={0.33} color="#9dd5ff" groundColor="#090c15" position={[0, 10, 0]} />
        <directionalLight position={[0, 5, 8]} intensity={1.35} color="#a5f3fc" />
        <pointLight position={[0, 0.1, 1]} intensity={4.6} distance={15} decay={2} color="#67e8f9" />

        <Environment preset="night" />

        <Highway config={config} />

        <group>
          {notes.map((note) => (
            <NoteObject key={note.id} note={note} playheadRef={playheadRef} config={config} />
          ))}
        </group>

        <PostEffects />
      </Suspense>
    </Canvas>
  );
};

export default Scene;
