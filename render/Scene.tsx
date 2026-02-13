import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Euler, PerspectiveCamera as PerspectiveCameraImpl, Quaternion, Vector3 } from 'three';
import { Highway } from './Highway';
import NoteObject from './NoteObject';
import { CameraConfig, HighwayConfig, NoteEvent } from '../types';

interface SceneProps {
  notes: NoteEvent[];
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
  cameraConfig: CameraConfig;
  onCameraConfigChange: (config: CameraConfig) => void;
  lockScriptedCamera: boolean;
}

const CameraRig: React.FC<Pick<SceneProps, 'cameraConfig' | 'onCameraConfigChange' | 'lockScriptedCamera'>> = ({
  cameraConfig,
  onCameraConfigChange,
  lockScriptedCamera,
}) => {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const fromPos = useRef(new Vector3(...cameraConfig.position));
  const toPos = useRef(new Vector3(...cameraConfig.position));
  const fromTarget = useRef(new Vector3(...cameraConfig.target));
  const toTarget = useRef(new Vector3(...cameraConfig.target));
  const transitionStartRef = useRef(performance.now());
  const transitionDurationRef = useRef(Math.max(1, cameraConfig.transitionMs ?? 600));

  const lastSentRef = useRef<CameraConfig>(cameraConfig);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    fromPos.current.copy(camera.position);
    fromTarget.current.copy(controls.target);
    toPos.current.set(...cameraConfig.position);
    toTarget.current.set(...cameraConfig.target);
    transitionStartRef.current = performance.now();
    transitionDurationRef.current = Math.max(1, cameraConfig.transitionMs ?? 600);

    camera.fov = cameraConfig.fov;
    camera.near = cameraConfig.near;
    camera.far = cameraConfig.far;

    if (cameraConfig.rotationEuler) {
      const [x, y, z] = cameraConfig.rotationEuler;
      const desiredQuaternion = new Quaternion().setFromEuler(new Euler(x, y, z, 'XYZ'));
      camera.quaternion.slerp(desiredQuaternion, 0.2);
    }
    camera.updateProjectionMatrix();
  }, [cameraConfig]);

  useFrame(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (lockScriptedCamera) {
      const elapsed = performance.now() - transitionStartRef.current;
      const alpha = Math.min(1, elapsed / transitionDurationRef.current);
      camera.position.lerpVectors(fromPos.current, toPos.current, alpha);
      controls.target.lerpVectors(fromTarget.current, toTarget.current, alpha);
      controls.enabled = false;
    } else {
      controls.enabled = true;
      const nextConfig: CameraConfig = {
        ...cameraConfig,
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      };
      const prev = lastSentRef.current;
      const drift =
        Math.abs(prev.position[0] - nextConfig.position[0]) +
        Math.abs(prev.position[1] - nextConfig.position[1]) +
        Math.abs(prev.position[2] - nextConfig.position[2]) +
        Math.abs(prev.target[0] - nextConfig.target[0]) +
        Math.abs(prev.target[1] - nextConfig.target[1]) +
        Math.abs(prev.target[2] - nextConfig.target[2]);
      if (drift > 0.001) {
        lastSentRef.current = nextConfig;
        onCameraConfigChange(nextConfig);
      }
    }

    controls.enableDamping = true;
    controls.dampingFactor = cameraConfig.damping ?? 0.1;
    controls.update();
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={cameraConfig.position} fov={cameraConfig.fov} near={cameraConfig.near} far={cameraConfig.far} />
      <OrbitControls ref={controlsRef} target={cameraConfig.target} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
    </>
  );
};

const Scene: React.FC<SceneProps> = ({ notes, playheadRef, config, cameraConfig, onCameraConfigChange, lockScriptedCamera }) => {
  return (
    <Canvas className="w-full h-full block bg-gray-900">
      <Suspense fallback={null}>
        <CameraRig cameraConfig={cameraConfig} onCameraConfigChange={onCameraConfigChange} lockScriptedCamera={lockScriptedCamera} />
        <Environment preset="night" />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[0, 5, 5]} intensity={1} castShadow />
        <fog attach="fog" args={['#111827', 5, config.viewDistance]} />
        <color attach="background" args={['#111827']} />
        <Highway config={config} notes={notes} playheadRef={playheadRef} />
        <group>
          {notes.map((note) => (
            <NoteObject key={note.id} note={note} playheadRef={playheadRef} config={config} />
          ))}
        </group>
      </Suspense>
    </Canvas>
  );
};

export default Scene;
