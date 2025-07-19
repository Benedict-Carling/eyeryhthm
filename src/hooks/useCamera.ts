'use client';

import { useState, useRef, useCallback } from 'react';

interface CameraState {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
}

interface CameraOptions {
  onVideoReady?: () => void;
  facingMode?: 'user' | 'environment';
}

export function useCamera(options: CameraOptions = {}) {
  const { onVideoReady, facingMode = 'user' } = options;
  
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
        video: { facingMode },
        audio: false,
      });

      setState(prev => ({
        ...prev,
        stream,
        isLoading: false,
        hasPermission: true,
      }));

      // Use requestAnimationFrame to ensure video element is rendered
      requestAnimationFrame(() => {
        if (videoRef.current) {
          const video = videoRef.current;
          
          // Set required attributes for iOS/Safari compatibility
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.autoplay = true;
          video.muted = true;
          
          // Set up event handler for when metadata is loaded
          video.onloadedmetadata = () => {
            // Small delay to ensure video is ready
            setTimeout(() => {
              video.play().catch(console.error);
              onVideoReady?.();
            }, 100);
          };
          
          // Set the stream
          video.srcObject = stream;
        }
      });
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
  }, [facingMode, onVideoReady]);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      
      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.onloadedmetadata = null;
      }
      
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