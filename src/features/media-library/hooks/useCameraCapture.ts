'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

export function useCameraCapture() {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'unsupported' | 'error'>(
    'idle',
  );

  const stop = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setStream(null);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera capture is not supported in this browser. Upload an image instead.');
      setStatus('unsupported');
      return null;
    }
    stopStream(streamRef.current);
    setError(null);
    setStatus('requesting');
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = nextStream;
      setStream(nextStream);
      setStatus('ready');
      return nextStream;
    } catch (cameraError) {
      const denied = cameraError instanceof DOMException && cameraError.name === 'NotAllowedError';
      setError(
        denied
          ? 'Camera permission was denied. Allow access or upload an image instead.'
          : 'The camera could not be started. Upload an image instead.',
      );
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { error, start, status, stop, stream };
}
