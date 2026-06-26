import { useState, useEffect, useCallback } from 'react';

export const useTimer = (initialTimeSeconds, onTimeout, turn) => {
  const [redTime, setRedTime] = useState(() => {
    const saved = localStorage.getItem('checkers_red_time');
    return saved !== null ? parseInt(saved) : initialTimeSeconds;
  });
  const [blackTime, setBlackTime] = useState(() => {
    const saved = localStorage.getItem('checkers_black_time');
    return saved !== null ? parseInt(saved) : initialTimeSeconds;
  });
  
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;

    if (isActive) {
      interval = setInterval(() => {
        if (turn === 1) {
          setRedTime(prev => {
            if (prev <= 1) {
              onTimeout(1); // Red timed out
              return 0;
            }
            return prev - 1;
          });
        } else if (turn === 2) {
          setBlackTime(prev => {
            if (prev <= 1) {
              onTimeout(2); // Black timed out
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (!isActive && interval) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, turn, onTimeout]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('checkers_red_time', redTime);
    localStorage.setItem('checkers_black_time', blackTime);
  }, [redTime, blackTime]);

  const resetTimers = useCallback((newTimeSeconds) => {
    const time = newTimeSeconds || initialTimeSeconds;
    setRedTime(time);
    setBlackTime(time);
    localStorage.setItem('checkers_red_time', time);
    localStorage.setItem('checkers_black_time', time);
  }, [initialTimeSeconds]);

  const setTimersDirectly = useCallback((red, black) => {
    setRedTime(red);
    setBlackTime(black);
  }, []);

  const formatTime = (totalSeconds) => {
    if (totalSeconds === Infinity) return "∞";
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
    redTime,
    blackTime,
    redTimeFormatted: formatTime(redTime),
    blackTimeFormatted: formatTime(blackTime),
    setIsActive,
    resetTimers,
    setTimersDirectly,
  };
};
