import { useState, useRef, useCallback, useEffect } from 'react';

export default function useTimer(gameStarted, countdownSeconds, onExpire) {
  const [elapsed, setElapsed] = useState(countdownSeconds || 0);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef(null);
  const startOffsetRef = useRef(null);
  const isCountdown = typeof countdownSeconds === 'number' && countdownSeconds > 0;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (isCountdown) {
      setElapsed((prev) => {
        const next = Math.max(0, Math.ceil((startOffsetRef.current + countdownSeconds * 1000 - Date.now()) / 1000));
        if (next <= 0) {
          clearTimer();
          setIsExpired(true);
          onExpire?.();
          return 0;
        }
        return next;
      });
    } else {
      setElapsed(Math.floor((Date.now() - startOffsetRef.current) / 1000));
    }
  }, [isCountdown, countdownSeconds, onExpire, clearTimer]);

  const start = useCallback(
    (offset = 0) => {
      clearTimer();
      setIsExpired(false);
      if (isCountdown) {
        startOffsetRef.current = Date.now() - offset * 1000;
        setElapsed(countdownSeconds - offset);
      } else {
        startOffsetRef.current = Date.now() - offset * 1000;
        setElapsed(offset);
      }
      intervalRef.current = setInterval(tick, 200);
    },
    [clearTimer, isCountdown, countdownSeconds, tick]
  );

  const stop = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setElapsed(isCountdown ? countdownSeconds : 0);
    setIsExpired(false);
    startOffsetRef.current = null;
  }, [clearTimer, isCountdown, countdownSeconds]);

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

  return { elapsed, formattedTime, start, stop, reset, isExpired };
}
