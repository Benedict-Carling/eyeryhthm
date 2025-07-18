'use client';

import { useState, useRef, useCallback } from 'react';

interface CameraState {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    stream: null,
    isLoading: false,
    error: null,
    hasPermission: false,
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      setState(prev => ({
        ...prev,
        stream,
        isLoading: false,
        hasPermission: true,
      }));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const error = err as Error;
      setState(prev => ({
        ...prev,
        error: error.name === 'NotAllowedError' 
          ? 'Camera permission denied' 
          : 'Failed to access camera',
        isLoading: false,
        hasPermission: false,
      }));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      setState(prev => ({
        ...prev,
        stream: null,
        hasPermission: false,
      }));
    }
  }, [state.stream]);

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera,
  };
}