import { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY = 0;

export default function SinglePlayerGame({ socket, playerName, difficulty, countdownSeconds, onComplete, onBack }) {
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [board, setBoard] = useState(null);

  const [selRow, setSelRow] = useState(null);
  const [selCol, setSelCol] = useState(null);
  const [cellFlash, setCellFlash] = useState({});

  const [score, setScore] = useState(0);
  const [correctMoves, setCorrectMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const gameActiveRef = useRef(false);

  const [sketchMode, setSketchMode] = useState(false);
  const [sketchMarks, setSketchMarks] = useState({});
  const [credits, setCredits] = useState(3);
  const [lockedWrongCell, setLockedWrongCell] = useState(null);
  const [scoreFloats, setScoreFloats] = useState([]);
  const floatIdRef = useRef(0);

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

  useEffect(() => {
    if (countdownRemaining === 0 && countdownSeconds && !completed && !expired && !loading) {
      setExpired(true);
      gameActiveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [countdownRemaining, countdownSeconds, completed, expired, loading]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      hintsUsed,
    };
    onComplete?.(record);
  }, [completed, expired]);

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
    if (lockedWrongCell) {
      if (row !== lockedWrongCell.row || col !== lockedWrongCell.col) return;
    }
    setSelRow((prev) => prev === row && selCol === col ? null : row);
    setSelCol((prev) => prev === row && selCol === col ? null : col);
  };

  const handleNumber = useCallback((num) => {
    if (completed || expired) return;

    const value = num === 'erase' ? EMPTY : num;

    if (lockedWrongCell && value !== EMPTY) return;

    let targetRow = selRow;
    let targetCol = selCol;

    if (value === EMPTY && lockedWrongCell) {
      targetRow = lockedWrongCell.row;
      targetCol = lockedWrongCell.col;
      setSelRow(targetRow);
      setSelCol(targetCol);
    }

    if (targetRow === null || targetCol === null) return;
    if (isGiven(targetRow, targetCol)) return;

    const key = `${targetRow}-${targetCol}`;

    if (value === EMPTY) {
      setBoard((prev) => {
        const next = prev.map((r) => [...r]);
        next[targetRow][targetCol] = { value: EMPTY, filledBy: null };
        return next;
      });
      setSketchMarks((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setLockedWrongCell(null);
      return;
    }

    if (sketchMode) {
      setSketchMarks((prev) => {
        const current = prev[key] || [];
        if (current.includes(value)) {
          const filtered = current.filter((n) => n !== value);
          if (filtered.length === 0) {
            const next = { ...prev };
            delete next[key];
            return next;
          }
          return { ...prev, [key]: filtered };
        }
        return { ...prev, [key]: [...current, value].sort((a, b) => a - b) };
      });
      return;
    }

    const correct = solution[targetRow][targetCol] === value;
    setTotalMoves((p) => p + 1);

    if (correct) {
      setScore((p) => p + 10);
      setCorrectMoves((p) => p + 1);
      setBoard((prev) => {
        const next = prev.map((r) => [...r]);
        next[targetRow][targetCol] = { value, filledBy: 'player' };
        return next;
      });
      setSketchMarks((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      const fid = ++floatIdRef.current;
      setScoreFloats((prev) => [...prev, { id: fid, row: targetRow, col: targetCol }]);
      setTimeout(() => setScoreFloats((prev) => prev.filter((f) => f.id !== fid)), 800);
      setCellFlash((prev) => ({ ...prev, [key]: 'correct' }));
      setTimeout(() => setCellFlash((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      }), 400);
    } else {
      setMistakes((p) => p + 1);
      setBoard((prev) => {
        const next = prev.map((r) => [...r]);
        next[targetRow][targetCol] = { value, filledBy: 'player' };
        return next;
      });
      setLockedWrongCell({ row: targetRow, col: targetCol });
      setSelRow(targetRow);
      setSelCol(targetCol);
      setCellFlash((prev) => ({ ...prev, [key]: 'invalid' }));
      setTimeout(() => setCellFlash((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      }), 400);
    }
  }, [selRow, selCol, completed, expired, solution, lockedWrongCell, sketchMode]);

  const handleHint = useCallback(() => {
    if (completed || !board || !solution) return;

    const emptyCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c].value === EMPTY) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    if (emptyCells.length === 0) return;

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];
    const key = `${row}-${col}`;

    setBoard((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = { value: solution[row][col], filledBy: 'player' };
      return next;
    });

    setSketchMarks((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

    setCredits((p) => p - 1);

    setCellFlash((prev) => ({ ...prev, [key]: 'hint' }));
    setTimeout(() => setCellFlash((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    }), 3000);
  }, [completed, board, solution]);

  useEffect(() => {
    const handleKey = (e) => {
      if (completed || expired) return;

      if (lockedWrongCell) {
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
          e.preventDefault();
          handleNumber('erase');
          return;
        }
        e.preventDefault();
        return;
      }

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
  }, [selRow, selCol, handleNumber, completed, expired, lockedWrongCell]);

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

  const ftime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  const displayTime = countdownSeconds ? countdownRemaining : elapsed;
  const timeWarning = countdownSeconds && countdownRemaining <= 30;

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
    if (cellFlash[k] === 'correct') { cl.push('flash-correct'); cl.push('cell-pop'); }
    if (cellFlash[k] === 'invalid') { cl.push('flash-invalid'); cl.push('cell-shake'); }
    if (cellFlash[k] === 'hint') cl.push('cell-hint-glow');
    if (lockedWrongCell && lockedWrongCell.row === r && lockedWrongCell.col === c) cl.push('cell-locked-wrong');
    return cl.join(' ');
  };

  if (loading) {
    return (
      <div className="sp-game-container">
        <div className="sp-loading">Loading puzzle...</div>
      </div>
    );
  }

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

  const difficultyLabel = difficulty.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const accuracy = totalMoves > 0 ? Math.round((correctMoves / totalMoves) * 100) : 0;

  return (
    <div className="sp-game-container">
      <div className="sp-header">
        <button className="btn btn-secondary sp-back-btn" onClick={onBack}>← Back</button>
        <h2 className="sp-title">Singleplayer — {difficultyLabel}</h2>
        <div className="sp-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={`credits-display ${credits < 0 ? 'negative' : ''}`}>
            🪙 Credits: {credits}
          </div>
          <div className={`sp-timer ${timeWarning ? 'sp-timer-warning' : ''}`}>
            {countdownSeconds ? '⏱ ' : '🕐 '}{ftime(displayTime)}
          </div>
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
            const key = `${r}-${c}`;
            const marks = sketchMarks[key];
            const hasFloatingScore = scoreFloats.some((f) => f.row === r && f.col === c);

            return (
              <div key={key} className={getCellClass(r, c)} onClick={() => handleCellClick(r, c)}>
                {marks && marks.length > 0 && val === EMPTY ? (
                  <div className="cell-sketch-marks">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <span key={n} className="cell-sketch-mark">
                        {marks.includes(n) ? n : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="cell-value">{val !== EMPTY ? val : ''}</span>
                )}
                {hasFloatingScore && (
                  <span className="score-float positive">+10</span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="number-pad">
        <div className="number-pad-toolbar">
          <button
            className={`sketch-toggle ${sketchMode ? 'active' : ''}`}
            onClick={() => setSketchMode((p) => !p)}
          >
            ✏️ Sketch
          </button>
          <button
            className="btn-hint"
            onClick={handleHint}
            disabled={completed || expired}
          >
            💡 Hint ({credits})
          </button>
          <button
            className="btn-tool btn-tool-erase"
            onClick={() => handleNumber('erase')}
            disabled={completed || expired}
          >
            🧹 Erase
          </button>
        </div>

        {lockedWrongCell && (
          <div style={{
            color: 'var(--accent-coral)',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '4px 0 8px',
          }}>
            ⚠️ Clear the red cell first!
          </div>
        )}

        <div className="number-pad-row">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              className={`num-button ${!sketchMode && numberCounts[n] <= 0 ? 'num-depleted' : ''}`}
              onClick={() => handleNumber(n)}
              disabled={completed || expired || !!lockedWrongCell || (!sketchMode && numberCounts[n] <= 0)}
            >
              <span className="num-value">{n}</span>
              <span className="num-count">{numberCounts[n]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
