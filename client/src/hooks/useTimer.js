import { useState, useRef, useCallback, useEffect } from 'react';

export default function useTimer(gameStarted) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const startOffsetRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (offset = 0) => {
      clearTimer();
      startOffsetRef.current = Date.now() - offset * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startOffsetRef.current) / 1000));
      }, 200);
    },
    [clearTimer]
  );

  const stop = useCallback(() => {
    clearTimer();
    setElapsed((prev) => prev);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setElapsed(0);
    startOffsetRef.current = null;
  }, [clearTimer]);

  useEffect(() => {
    if (gameStarted) {
      start();
    } else {
      reset();
    }
    return clearTimer;
  }, [gameStarted]);

  const formattedTime = (() => {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  })();

  return { elapsed, formattedTime, start, stop, reset };
}
