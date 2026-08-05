import { useCallback, useEffect, useState } from 'react';
import { loadReadableMode, saveReadableMode } from '../utils/storage';

/** Preferencia de modo legible (texto grande + alto contraste). */
export function useReadableMode() {
  const [readableMode, setReadableModeState] = useState(() => loadReadableMode());

  useEffect(() => {
    document.documentElement.dataset.readable = readableMode ? 'true' : 'false';
  }, [readableMode]);

  const setReadableMode = useCallback((enabled: boolean) => {
    setReadableModeState(enabled);
    saveReadableMode(enabled);
  }, []);

  return { readableMode, setReadableMode };
}
