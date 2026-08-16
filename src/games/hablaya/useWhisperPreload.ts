import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isWhisperPipelineReady,
  preloadWhisperLocal,
  whisperDeviceLabel,
} from './whisperLocal';

export type WhisperGateStatus = 'loading' | 'ready' | 'error';

export function useWhisperPreload(enabled = true) {
  const [status, setStatus] = useState<WhisperGateStatus>(() =>
    isWhisperPipelineReady() ? 'ready' : 'loading',
  );
  const [progress, setProgress] = useState(() => (isWhisperPipelineReady() ? 100 : 0));
  const [message, setMessage] = useState(() =>
    isWhisperPipelineReady()
      ? whisperDeviceLabel() === 'webgpu'
        ? 'Whisper listo (WebGPU)'
        : 'Whisper listo en el dispositivo'
      : 'Preparando Whisper local…',
  );
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<'webgpu' | 'wasm' | null>(() => whisperDeviceLabel());
  const runId = useRef(0);

  const start = useCallback(() => {
    if (!enabled) return;
    if (isWhisperPipelineReady()) {
      setStatus('ready');
      setProgress(100);
      setError(null);
      setDevice(whisperDeviceLabel());
      setMessage(
        whisperDeviceLabel() === 'webgpu'
          ? 'Whisper listo (WebGPU)'
          : 'Whisper listo en el dispositivo',
      );
      return;
    }

    const id = ++runId.current;
    setStatus('loading');
    setProgress(0);
    setError(null);
    setMessage('Descargando Whisper en el dispositivo…');

    void preloadWhisperLocal({
      onStatus: (msg) => {
        if (runId.current !== id) return;
        setMessage(msg);
      },
      onProgress: (percent) => {
        if (runId.current !== id) return;
        setProgress(percent);
      },
    })
      .then((result) => {
        if (runId.current !== id) return;
        setDevice(result.device);
        setProgress(100);
        setStatus('ready');
        setMessage(
          result.device === 'webgpu'
            ? 'Whisper listo (WebGPU). Ya puedes jugar.'
            : 'Whisper listo en el dispositivo. Ya puedes jugar.',
        );
      })
      .catch((err: unknown) => {
        if (runId.current !== id) return;
        const detail = err instanceof Error ? err.message : 'Error desconocido';
        setStatus('error');
        setError(detail);
        setMessage('No se pudo descargar Whisper');
      });
  }, [enabled]);

  useEffect(() => {
    start();
  }, [start]);

  return {
    status,
    progress,
    message,
    error,
    device,
    ready: status === 'ready',
    retry: start,
  };
}
