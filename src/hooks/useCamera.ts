'use client';

import { useState, useRef, useCallback } from 'react';

interface CameraState {
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
}

interface CameraOptions {
  facingMode?: 'user' | 'environment';
}

export function useCamera(options: CameraOptions = {}) {
  const { facingMode = 'user' } = options;

  const [state, setState] = useState<CameraState>({
    stream: null,
    isLoading: false,
    error: null,
    hasPermission: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep a ref to the stream to avoid stale closure issues in stopCamera
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false,
      });

      // Listen for track ended event (e.g., when OS kills camera during sleep)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('[Camera] Video track ended unexpectedly (system suspend or camera disconnect)');
          // Clear the ref
          streamRef.current = null;
          setState(prev => ({
            ...prev,
            stream: null,
            hasPermission: false,
            error: 'Camera disconnected',
          }));
          // Clean up video element
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        };
      }

      // Store stream in ref for reliable access in stopCamera
      streamRef.current = stream;

      setState(prev => ({
        ...prev,
        stream,
        isLoading: false,
        hasPermission: true,
      }));

      // Set video attributes for compatibility
      if (videoRef.current) {
        const video = videoRef.current;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.autoplay = true;
        video.muted = true;
        video.srcObject = stream;
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
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    // Use ref to avoid stale closure - streamRef always has current stream
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });

      // Clear the ref
      streamRef.current = null;

      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setState(prev => ({
        ...prev,
        stream: null,
        hasPermission: false,
      }));
    }
  }, []); // No dependencies - uses ref for stream access

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera,
  };
}