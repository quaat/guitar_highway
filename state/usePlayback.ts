import { useState, useRef, useEffect, useCallback } from 'react';

export const usePlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  // We use a ref for the actual time to avoid re-rendering components that just need to query time in a loop
  const playheadRef = useRef(0);
  const lastFrameTime = useRef(0);
  const requestRef = useRef<number>();

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        lastFrameTime.current = performance.now();
      }
      return !prev;
    });
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    playheadRef.current = 0;
  }, []);

  useEffect(() => {
    const animate = (time: number) => {
      if (isPlaying) {
        const delta = (time - lastFrameTime.current) / 1000;
        playheadRef.current += delta;
        lastFrameTime.current = time;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      lastFrameTime.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  return {
    isPlaying,
    playheadRef,
    togglePlay,
    reset,
  };
};
