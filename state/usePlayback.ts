import { useState, useRef, useEffect, useCallback } from 'react';

interface StartOptions {
  delayMs?: number;
  onStart?: () => void;
}

export const usePlayback = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const playheadRef = useRef(0);
  const lastFrameTime = useRef(0);
  const requestRef = useRef<number>();
  const startTimeoutRef = useRef<number>();

  const clearPendingStart = useCallback(() => {
    if (startTimeoutRef.current) {
      window.clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = undefined;
    }
    setIsStarting(false);
  }, []);

  const start = useCallback((options?: StartOptions) => {
    if (isPlaying || isStarting) return;

    const delayMs = Math.max(0, options?.delayMs ?? 0);
    setIsStarting(true);
    startTimeoutRef.current = window.setTimeout(() => {
      startTimeoutRef.current = undefined;
      setIsStarting(false);
      lastFrameTime.current = performance.now();
      setIsPlaying(true);
      options?.onStart?.();
    }, delayMs);
  }, [isPlaying, isStarting]);

  const pause = useCallback(() => {
    clearPendingStart();
    setIsPlaying(false);
  }, [clearPendingStart]);

  const reset = useCallback(() => {
    clearPendingStart();
    setIsPlaying(false);
    playheadRef.current = 0;
    setResetToken((prev) => prev + 1);
  }, [clearPendingStart]);

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
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying]);

  useEffect(() => () => clearPendingStart(), [clearPendingStart]);

  return {
    isPlaying,
    isStarting,
    playheadRef,
    start,
    pause,
    reset,
    resetToken,
  };
};
