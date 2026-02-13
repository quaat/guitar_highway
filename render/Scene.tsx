import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Euler, MathUtils, PerspectiveCamera as PerspectiveCameraImpl, Quaternion, Vector3 } from 'three';
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

type CameraTransitionState = {
  fromPos: Vector3;
  toPos: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  fromQuat: Quaternion;
  toQuat: Quaternion;
  fromFov: number;
  toFov: number;
  fromNear: number;
  toNear: number;
  fromFar: number;
  toFar: number;
  startTimeSec: number;
  durationSec: number;
};

const clampTransitionSec = (transitionMs?: number): number => {
  const requestedMs = Number.isFinite(transitionMs) ? transitionMs! : 600;
  return MathUtils.clamp(requestedMs / 1000, 0.5, 2);
};

const CameraRig: React.FC<Pick<SceneProps, 'cameraConfig' | 'onCameraConfigChange' | 'lockScriptedCamera'>> = ({
  cameraConfig,
  onCameraConfigChange,
  lockScriptedCamera,
}) => {
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const scratchLookAt = useRef(new Vector3());

  const transitionRef = useRef<CameraTransitionState>({
    fromPos: new Vector3(...cameraConfig.position),
    toPos: new Vector3(...cameraConfig.position),
    fromTarget: new Vector3(...cameraConfig.target),
    toTarget: new Vector3(...cameraConfig.target),
    fromQuat: new Quaternion(),
    toQuat: new Quaternion(),
    fromFov: cameraConfig.fov,
    toFov: cameraConfig.fov,
    fromNear: cameraConfig.near,
    toNear: cameraConfig.near,
    fromFar: cameraConfig.far,
    toFar: cameraConfig.far,
    startTimeSec: 0,
    durationSec: clampTransitionSec(cameraConfig.transitionMs),
  });

  const lastSentRef = useRef<CameraConfig>(cameraConfig);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const transition = transitionRef.current;
    transition.fromPos.copy(camera.position);
    transition.fromTarget.copy(controls.target);
    transition.toPos.set(...cameraConfig.position);
    transition.toTarget.set(...cameraConfig.target);

    transition.fromQuat.copy(camera.quaternion);
    if (cameraConfig.rotationEuler) {
      const [x, y, z] = cameraConfig.rotationEuler;
      transition.toQuat.setFromEuler(new Euler(x, y, z, 'XYZ'));
    } else {
      scratchLookAt.current.copy(transition.toTarget);
      camera.position.copy(transition.toPos);
      camera.lookAt(scratchLookAt.current);
      transition.toQuat.copy(camera.quaternion);
      camera.position.copy(transition.fromPos);
      camera.quaternion.copy(transition.fromQuat);
    }

    transition.fromFov = camera.fov;
    transition.toFov = cameraConfig.fov;
    transition.fromNear = camera.near;
    transition.toNear = cameraConfig.near;
    transition.fromFar = camera.far;
    transition.toFar = cameraConfig.far;
    transition.startTimeSec = performance.now() / 1000;
    transition.durationSec = clampTransitionSec(cameraConfig.transitionMs);
  }, [cameraConfig]);

  useFrame(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (lockScriptedCamera) {
      controls.enabled = false;

      const transition = transitionRef.current;
      const elapsedSec = performance.now() / 1000 - transition.startTimeSec;
      const linearT = MathUtils.clamp(elapsedSec / Math.max(0.001, transition.durationSec), 0, 1);
      const easedT = linearT * linearT * (3 - 2 * linearT); // smoothstep

      camera.position.lerpVectors(transition.fromPos, transition.toPos, easedT);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, easedT);
      camera.quaternion.slerpQuaternions(transition.fromQuat, transition.toQuat, easedT);

      camera.fov = MathUtils.lerp(transition.fromFov, transition.toFov, easedT);
      camera.near = MathUtils.lerp(transition.fromNear, transition.toNear, easedT);
      camera.far = MathUtils.lerp(transition.fromFar, transition.toFar, easedT);
      camera.updateProjectionMatrix();
    } else {
      controls.enabled = true;
      const nextConfig: CameraConfig = {
        ...cameraConfig,
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
      };
      const prev = lastSentRef.current;
      const drift =
        Math.abs(prev.position[0] - nextConfig.position[0]) +
        Math.abs(prev.position[1] - nextConfig.position[1]) +
        Math.abs(prev.position[2] - nextConfig.position[2]) +
        Math.abs(prev.target[0] - nextConfig.target[0]) +
        Math.abs(prev.target[1] - nextConfig.target[1]) +
        Math.abs(prev.target[2] - nextConfig.target[2]) +
        Math.abs(prev.fov - nextConfig.fov);

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
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={cameraConfig.position}
        fov={cameraConfig.fov}
        near={cameraConfig.near}
        far={cameraConfig.far}
      />
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
