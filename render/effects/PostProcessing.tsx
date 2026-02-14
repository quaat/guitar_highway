import React, { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

interface PostProcessingProps {
  enabled: boolean;
  quality: 'low' | 'medium' | 'high';
  hitPulseRef: React.MutableRefObject<number>;
  comboEnergyRef: React.MutableRefObject<number>;
}

const BASE_EXPOSURE = {
  low: 0.92,
  medium: 1,
  high: 1.08,
} as const;

const PostProcessing: React.FC<PostProcessingProps> = ({ enabled, quality, hitPulseRef, comboEnergyRef }) => {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMappingExposure = BASE_EXPOSURE[quality];
  }, [gl, quality]);

  useFrame(() => {
    if (!enabled) {
      gl.toneMappingExposure = BASE_EXPOSURE[quality];
      return;
    }

    gl.toneMappingExposure = BASE_EXPOSURE[quality] + hitPulseRef.current * 0.12 + comboEnergyRef.current * 0.08;
  });

  return null;
};

export default React.memo(PostProcessing);
