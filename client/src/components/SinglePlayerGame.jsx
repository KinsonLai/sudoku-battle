import { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY = 0;

export default function SinglePlayerGame({ socket, playerName, difficulty, countdownSeconds, onComplete, onBack }) {
  // Puzzle and solution from server
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Board state: each cell { value: number, filledBy: 'given' | 'player' | null }
  const [board, setBoard] = useState(null);

  // Selection
  const [selRow, setSelRow] = useState(null);
  const [selCol, setSelCol] = useState(null);
  const [cellFlash, setCellFlash] = useState({});

  // Game state
  const [score, setScore] = useState(0);
  const [correctMoves, setCorrectMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [expired, setExpired] = useState(false);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const gameActiveRef = useRef(false);

  // Request puzzle from server
  useEffect(() => {
    if (!socket) {
      setLoadError('Not connected to server');
      setLoading(false);
      return;
    }

    const onStarted = (data) => {
      setPuzzle(data.puzzle);
      setSolution(data.solution);
      setBoard(data.puzzle.map((row) =>
        row.map((cell) => ({
          value: cell,
          filledBy: cell !== EMPTY ? 'given' : null,
        }))
      ));
      setLoading(false);
      gameActiveRef.current = true;
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    };

    const onError = (data) => {
      setLoadError(data.message || 'Failed to load puzzle');
      setLoading(false);
    };

    socket.on('singleplayer_started', onStarted);
    socket.on('singleplayer_error', onError);
    socket.emit('start_singleplayer', { difficulty });

    return () => {
      socket.off('singleplayer_started', onStarted);
      socket.off('singleplayer_error', onError);
    };
  }, [socket, difficulty]);

  // Countdown timer logic (runs alongside elapsed)
  const [countdownRemaining, setCountdownRemaining] = useState(countdownSeconds || 0);
  useEffect(() => {
    if (!countdownSeconds || loading || completed || expired) return;
    const interval = setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds, loading, completed, expired]);

  // Countdown expiry
  useEffect(() => {
    if (countdownRemaining === 0 && countdownSeconds && !completed && !expired && !loading) {
      setExpired(true);
      gameActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [countdownRemaining, countdownSeconds, completed, expired, loading]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Check completion
  useEffect(() => {
    if (!board || !solution || !puzzle || completed) return;
    let allCorrect = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c].value !== solution[r][c]) {
          allCorrect = false;
          break;
        }
      }
      if (!allCorrect) break;
    }
    if (allCorrect) {
      setCompleted(true);
      gameActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [board, solution, puzzle, completed]);

  // Fire onComplete when game ends
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    if (!completed && !expired) return;
    if (!solution || !puzzle || loading) return;
    firedRef.current = true;
    const finalTime = countdownSeconds
      ? countdownSeconds - countdownRemaining
      : Math.floor((Date.now() - startTimeRef.current) / 1000);
    const finalMoves = totalMoves;
    const record = {
      difficulty,
      score,
      accuracy: finalMoves > 0 ? Math.round((correctMoves / finalMoves) * 100) : 0,
      timeSeconds: Math.max(0, elapsed),
      correctMoves,
      mistakes,
      totalMoves: finalMoves,
      completed: completed && !expired,
      mode: countdownSeconds ? 'singleplayer_timed' : 'singleplayer',
    };
    onComplete?.(record);
  }, [completed, expired]);

  // Helpers
  const isGiven = (row, col) => puzzle?.[row]?.[col] !== EMPTY;
  const isSelected = (row, col) => selRow === row && selCol === col;
  const isEmpty = (row, col) => {
    const cell = board?.[row]?.[col];
    return !cell || cell.value === EMPTY;
  };

  const isRelated = (row, col) => {
    if (selRow === null || selCol === null) return false;
    if (row === selRow || col === selCol) return true;
    const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
    const sr = Math.floor(selRow / 3) * 3, sc = Math.floor(selCol / 3) * 3;
    return br === sr && bc === sc;
  };

  const hasSameValue = (row, col) => {
    if (selRow === null || selCol === null) return false;
    const cell = board?.[selRow]?.[selCol];
    if (!cell || cell.value === EMPTY) return false;
    return board?.[row]?.[col]?.value === cell.value && cell.value !== EMPTY;
  };

  const handleCellClick = (row, col) => {
    if (completed || expired) return;
    setSelRow((prev) => prev === row && selCol === col ? null : row);
    setSelCol((prev) => prev === row && selCol === col ? null : col);
  };

  const handleNumber = useCallback((num) => {
    if (selRow === null || selCol === null || completed || expired) return;
    if (isGiven(selRow, selCol)) return;

    const value = num === 'erase' ? EMPTY : num;

    // Erase current cell value
    if (value === EMPTY) {
      setBoard((prev) => {
        const next = prev.map((r) => [...r]);
        next[selRow][selCol] = { value: EMPTY, filledBy: null };
        return next;
      });
      return;
    }

    // Check against solution
    const correct = solution[selRow][selCol] === value;
    setTotalMoves((p) => p + 1);

    if (correct) {
      setScore((p) => p + 10);
      setCorrectMoves((p) => p + 1);
      setBoard((prev) => {
        const next = prev.map((r) => [...r]);
        next[selRow][selCol] = { value, filledBy: 'player' };
        return next;
      });
      setCellFlash((prev) => ({ ...prev, [`${selRow}-${selCol}`]: 'correct' }));
    } else {
      setMistakes((p) => p + 1);
      setCellFlash((prev) => ({ ...prev, [`${selRow}-${selCol}`]: 'invalid' }));
    }
    setTimeout(() => {
      setCellFlash((prev) => {
        const next = { ...prev };
        delete next[`${selRow}-${selCol}`];
        return next;
      });
    }, 400);
  }, [selRow, selCol, completed, expired, solution]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e) => {
      if (completed || expired) return;
      if (selRow === null || selCol === null) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          setSelRow(0); setSelCol(0); return;
        }
        return;
      }
      if (e.key >= '1' && e.key <= '9') { e.preventDefault(); handleNumber(parseInt(e.key)); return; }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); handleNumber('erase'); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelRow((r) => Math.max(0, r - 1)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelRow((r) => Math.min(8, r + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setSelCol((c) => Math.max(0, c - 1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setSelCol((c) => Math.min(8, c + 1)); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selRow, selCol, handleNumber, completed, expired]);

  // Number counts
  const numberCounts = {};
  for (let n = 1; n <= 9; n++) {
    let c = 0;
    if (board) {
      for (let r = 0; r < 9; r++)
        for (let cc = 0; cc < 9; cc++)
          if (board[r][cc].value === n) c++;
    }
    numberCounts[n] = 9 - c;
  }

  // Format time
  const ftime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  const displayTime = countdownSeconds ? countdownRemaining : elapsed;
  const timeWarning = countdownSeconds && countdownRemaining <= 30;

  // Cell class
  const getCellClass = (r, c) => {
    const cl = ['cell'];
    if (isGiven(r, c)) cl.push('cell-given');
    if (isSelected(r, c)) cl.push('cell-selected');
    else if (isRelated(r, c)) cl.push('cell-related');
    if (hasSameValue(r, c)) cl.push('cell-same-value');
    if (r % 3 === 0) cl.push('cell-row-divider-top');
    if (c % 3 === 0) cl.push('cell-col-divider-left');
    if (r === 8) cl.push('cell-row-divider-bottom');
    if (c === 8) cl.push('cell-col-divider-right');
    const k = `${r}-${c}`;
    if (cellFlash[k] === 'correct') cl.push('flash-correct');
    if (cellFlash[k] === 'invalid') cl.push('flash-invalid');
    return cl.join(' ');
  };

  // Loading
  if (loading) {
    return (
      <div className="sp-game-container">
        <div className="sp-loading">Loading puzzle...</div>
      </div>
    );
  }

  // Error
  if (loadError) {
    return (
      <div className="sp-game-container">
        <div className="sp-error">
          <p>{loadError}</p>
          <button className="btn btn-primary" onClick={onBack}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const accuracy = totalMoves > 0 ? Math.round((correctMoves / totalMoves) * 100) : 0;

  return (
    <div className="sp-game-container">
      <div className="sp-header">
        <button className="btn btn-secondary sp-back-btn" onClick={onBack}>← Back</button>
        <h2 className="sp-title">Singleplayer — {difficultyLabel}</h2>
        <div className={`sp-timer ${timeWarning ? 'sp-timer-warning' : ''}`}>
          {countdownSeconds ? '⏱ ' : '🕐 '}{ftime(displayTime)}
        </div>
      </div>

      <div className="sp-stats-row">
        <span className="sp-stat">Score: <strong>{score}</strong></span>
        <span className="sp-stat">Accuracy: <strong>{accuracy}%</strong></span>
        <span className="sp-stat">Mistakes: <strong>{mistakes}</strong></span>
      </div>

      {(completed || expired) && (
        <div className={`sp-result-banner ${completed ? 'sp-success' : 'sp-fail'}`}>
          {completed ? '🎉 Puzzle Complete!' : '⏰ Time\'s Up!'}
        </div>
      )}

      <div className="sudoku-grid">
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 9 }).map((__, c) => {
            const cell = board?.[r]?.[c];
            const val = cell?.value;
            return (
              <div key={`${r}-${c}`} className={getCellClass(r, c)} onClick={() => handleCellClick(r, c)}>
                <span className="cell-value">{val !== EMPTY ? val : ''}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="number-pad">
        <div className="number-pad-row">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              className={`num-button ${numberCounts[n] <= 0 ? 'num-depleted' : ''}`}
              onClick={() => handleNumber(n)}
              disabled={numberCounts[n] <= 0 || completed || expired}
            >
              <span className="num-value">{n}</span>
              <span className="num-count">{numberCounts[n]}</span>
            </button>
          ))}
        </div>
        <div className="number-pad-row">
          <button className="num-button num-erase" onClick={() => handleNumber('erase')} disabled={completed || expired}>
            <span className="num-value">Erase</span>
          </button>
        </div>
      </div>
    </div>
  );
}
