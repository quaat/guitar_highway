import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Euler, MathUtils, PerspectiveCamera as PerspectiveCameraImpl, Quaternion, Vector3 } from 'three';
import { Highway } from './Highway';
import NoteObject from './NoteObject';
import { CameraConfig, HighwayConfig, NoteEvent, VisualSettings } from '../types';
import BackgroundScene from './effects/BackgroundScene';
import Particles from './effects/Particles';
import PostProcessing from './effects/PostProcessing';
import NoteEffects from './effects/NoteEffects';

interface SceneProps {
  notes: NoteEvent[];
  playheadRef: React.MutableRefObject<number>;
  config: HighwayConfig;
  cameraConfig: CameraConfig;
  onCameraConfigChange: (config: CameraConfig) => void;
  lockScriptedCamera: boolean;
  visuals: VisualSettings;
  bpm: number;
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

const CameraRig: React.FC<Pick<SceneProps, 'cameraConfig' | 'onCameraConfigChange' | 'lockScriptedCamera' | 'visuals' | 'bpm'> & {
  hitPulseRef: React.MutableRefObject<number>;
  sustainPulseRef: React.MutableRefObject<number>;
}> = ({
  cameraConfig,
  onCameraConfigChange,
  lockScriptedCamera,
  visuals,
  bpm,
  hitPulseRef,
  sustainPulseRef,
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

  useFrame(({ clock }) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const t = clock.elapsedTime;
    const motionEnabled = visuals.enableCameraMotion;
    const tempo = visuals.enableTempoReactiveLights ? bpm / 120 : 1;

    if (lockScriptedCamera) {
      controls.enabled = false;

      const transition = transitionRef.current;
      const elapsedSec = performance.now() / 1000 - transition.startTimeSec;
      const linearT = MathUtils.clamp(elapsedSec / Math.max(0.001, transition.durationSec), 0, 1);
      const easedT = linearT * linearT * (3 - 2 * linearT);

      camera.position.lerpVectors(transition.fromPos, transition.toPos, easedT);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, easedT);
      camera.quaternion.slerpQuaternions(transition.fromQuat, transition.toQuat, easedT);

      if (motionEnabled) {
        camera.position.x += Math.sin(t * 0.3 * tempo) * 0.04;
        camera.position.y += Math.sin(t * 0.5 * tempo) * 0.03;
        camera.position.z += sustainPulseRef.current * -0.12;
        camera.position.x += (Math.random() - 0.5) * 0.03 * hitPulseRef.current;
      }

      camera.fov = MathUtils.lerp(transition.fromFov, transition.toFov, easedT) - (motionEnabled ? sustainPulseRef.current * 0.45 : 0);
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
      <PerspectiveCamera ref={cameraRef} makeDefault position={cameraConfig.position} fov={cameraConfig.fov} near={cameraConfig.near} far={cameraConfig.far} />
      <OrbitControls ref={controlsRef} target={cameraConfig.target} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
    </>
  );
};


const EffectsStateDriver: React.FC<{
  hitPulseRef: React.MutableRefObject<number>;
  comboEnergyRef: React.MutableRefObject<number>;
  sustainPulseRef: React.MutableRefObject<number>;
}> = ({ hitPulseRef, comboEnergyRef, sustainPulseRef }) => {
  useFrame(() => {
    hitPulseRef.current = Math.max(0, hitPulseRef.current - 0.08);
    comboEnergyRef.current = Math.max(0, comboEnergyRef.current - 0.01);
    sustainPulseRef.current = Math.max(0, sustainPulseRef.current - 0.04);
  });

  return null;
};

const Scene: React.FC<SceneProps> = ({ notes, playheadRef, config, cameraConfig, onCameraConfigChange, lockScriptedCamera, visuals, bpm }) => {
  const hitPulseRef = useRef(0);
  const comboEnergyRef = useRef(0);
  const sustainPulseRef = useRef(0);


  const handleNoteCross = (isSustain: boolean) => {
    hitPulseRef.current = 1;
    comboEnergyRef.current = Math.min(1, comboEnergyRef.current + 0.08);
    if (isSustain) sustainPulseRef.current = Math.min(1, sustainPulseRef.current + 0.5);
  };

  return (
    <Canvas className="w-full h-full block bg-gray-900" shadows dpr={[1, 1.5]}>
      <Suspense fallback={null}>
        <EffectsStateDriver hitPulseRef={hitPulseRef} comboEnergyRef={comboEnergyRef} sustainPulseRef={sustainPulseRef} />
        <CameraRig
          cameraConfig={cameraConfig}
          onCameraConfigChange={onCameraConfigChange}
          lockScriptedCamera={lockScriptedCamera}
          visuals={visuals}
          bpm={bpm}
          hitPulseRef={hitPulseRef}
          sustainPulseRef={sustainPulseRef}
        />
        <Environment preset="night" />
        <BackgroundScene bpm={bpm} enabled={visuals.enableBackground} quality={visuals.visualQuality} tempoReactive={visuals.enableTempoReactiveLights} />
        <ambientLight intensity={0.35} />
        <pointLight position={[10, 12, 8]} intensity={0.9 + comboEnergyRef.current * 0.25} />
        <directionalLight position={[0, 8, 5]} intensity={1.2 + hitPulseRef.current * 0.3} castShadow />
        <fog attach="fog" args={['#0b1020', 8, config.viewDistance + 28]} />
        <color attach="background" args={['#090b15']} />
        <Highway config={config} notes={notes} playheadRef={playheadRef} />
        <NoteEffects enabled={visuals.enableNoteEffects} hitPulseRef={hitPulseRef} comboEnergyRef={comboEnergyRef} />
        <Particles enabled={visuals.enableParticles} quality={visuals.visualQuality} hitPulseRef={hitPulseRef} comboEnergyRef={comboEnergyRef} />
        <group>
          {notes.map((note) => (
            <NoteObject key={note.id} note={note} playheadRef={playheadRef} config={config} noteEffectsEnabled={visuals.enableNoteEffects} onCrossHitLine={handleNoteCross} />
          ))}
        </group>
        <PostProcessing enabled={visuals.enablePostProcessing} quality={visuals.visualQuality} hitPulseRef={hitPulseRef} comboEnergyRef={comboEnergyRef} />
      </Suspense>
    </Canvas>
  );
};

export default Scene;
