import { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY = 0;
const PLAYER_COLORS = ['#4a90d9', '#e67e22', '#27ae60', '#9b59b6'];

export default function GameBoard({
  puzzle,
  board,
  room,
  socket,
  onGameOver,
  playerId,
  mode,
  formattedTime,
  elapsed,
}) {
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedCol, setSelectedCol] = useState(null);
  const [cellFlash, setCellFlash] = useState({});
  const [myBoard, setMyBoard] = useState(null);
  const [sketchMode, setSketchMode] = useState(false);
  const [sketchMarks, setSketchMarks] = useState({});
  const [lockedWrongCell, setLockedWrongCell] = useState(null);
  const [scoreFloats, setScoreFloats] = useState([]);
  const [hintHighlight, setHintHighlight] = useState(null);

  const boardRef = useRef(null);
  const previousPuzzleRef = useRef(null);
  const floatIdRef = useRef(0);

  const credits = room?.players?.find((p) => p.id === playerId)?.credits || 0;

  useEffect(() => {
    if (puzzle && puzzle !== previousPuzzleRef.current) {
      previousPuzzleRef.current = puzzle;
      setMyBoard(
        puzzle.map((row, r) =>
          row.map((cell, c) => ({
            value: cell,
            filledBy: cell !== EMPTY ? 'given' : null,
          }))
        )
      );
      setSelectedRow(null);
      setSelectedCol(null);
      setCellFlash({});
      setSketchMarks({});
      setLockedWrongCell(null);
      setScoreFloats([]);
      setHintHighlight(null);
      setSketchMode(false);
    }
  }, [puzzle]);

  useEffect(() => {
    if (!board || !puzzle) return;
    setMyBoard((prev) => {
      if (!prev) return prev;
      return prev.map((row, r) =>
        row.map((cell, c) => {
          if (puzzle[r][c] !== EMPTY) return cell;
          return {
            ...cell,
            value: board[r]?.[c] ?? cell.value,
            filledBy: board[r]?.[c] !== EMPTY
              ? (board._authors?.[r]?.[c] || playerId || room?.players?.[0]?.id)
              : cell.filledBy,
          };
        })
      );
    });
  }, [board, puzzle, playerId, room?.players]);

  useEffect(() => {
    if (!board || !puzzle) return;
    setSketchMarks((prev) => {
      let changed = false;
      const next = { ...prev };
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r]?.[c] !== EMPTY && next[`${r}-${c}`]) {
            delete next[`${r}-${c}`];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [board, puzzle]);

  useEffect(() => {
    if (!socket) return;

    const onMoveResult = (data) => {
      const { row, col, correct, erased } = data;
      const flashKey = `${row}-${col}`;

      if (erased) {
        setCellFlash((prev) => ({ ...prev, [flashKey]: 'erased' }));
        setSketchMarks((prev) => {
          const next = { ...prev };
          delete next[flashKey];
          return next;
        });
        setLockedWrongCell(null);
        setTimeout(() => {
          setCellFlash((prev) => {
            const next = { ...prev };
            delete next[flashKey];
            return next;
          });
        }, 400);
      } else if (correct) {
        setCellFlash((prev) => ({ ...prev, [flashKey]: 'correct' }));
        setSketchMarks((prev) => {
          const next = { ...prev };
          delete next[flashKey];
          return next;
        });
        setLockedWrongCell(null);
        const floatId = floatIdRef.current++;
        setScoreFloats((prev) => [
          ...prev,
          { id: floatId, row, col, text: '+10', type: 'correct' },
        ]);
        setTimeout(() => {
          setCellFlash((prev) => {
            const next = { ...prev };
            delete next[flashKey];
            return next;
          });
        }, 400);
        setTimeout(() => {
          setScoreFloats((prev) => prev.filter((f) => f.id !== floatId));
        }, 800);
      } else {
        setCellFlash((prev) => ({ ...prev, [flashKey]: 'invalid' }));
        setLockedWrongCell({ row, col });
        setSelectedRow(row);
        setSelectedCol(col);
        if (mode === 'battle') {
          const floatId = floatIdRef.current++;
          setScoreFloats((prev) => [
            ...prev,
            { id: floatId, row, col, text: '-5', type: 'wrong' },
          ]);
          setTimeout(() => {
            setScoreFloats((prev) => prev.filter((f) => f.id !== floatId));
          }, 800);
        }
        setTimeout(() => {
          setCellFlash((prev) => {
            const next = { ...prev };
            delete next[flashKey];
            return next;
          });
        }, 400);
      }
    };

    const onHintResult = (data) => {
      const { row, col, value } = data;
      if (row === undefined || col === undefined || value === undefined) return;
      setMyBoard((prev) => {
        if (!prev) return prev;
        return prev.map((rArr, r) =>
          rArr.map((cell, c) => {
            if (r === row && c === col) {
              return { ...cell, value, filledBy: 'hint' };
            }
            return cell;
          })
        );
      });
      setHintHighlight(`${row}-${col}`);
      setSketchMarks((prev) => {
        const next = { ...prev };
        delete next[`${row}-${col}`];
        return next;
      });
      setTimeout(() => {
        setHintHighlight(null);
      }, 1500);
    };

    const onGameOverEvent = (data) => {
      onGameOver?.(data);
    };

    socket.on('move_result', onMoveResult);
    socket.on('hint_result', onHintResult);
    socket.on('game_over', onGameOverEvent);

    return () => {
      socket.off('move_result', onMoveResult);
      socket.off('hint_result', onHintResult);
      socket.off('game_over', onGameOverEvent);
    };
  }, [socket, onGameOver, mode]);

  const isGiven = (row, col) => {
    if (!puzzle) return false;
    return puzzle[row]?.[col] !== EMPTY;
  };

  const isSelected = (row, col) => selectedRow === row && selectedCol === col;

  const isRelated = (row, col) => {
    if (selectedRow === null || selectedCol === null) return false;
    if (row === selectedRow) return true;
    if (col === selectedCol) return true;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const selBoxRow = Math.floor(selectedRow / 3) * 3;
    const selBoxCol = Math.floor(selectedCol / 3) * 3;
    return boxRow === selBoxRow && boxCol === selBoxCol;
  };

  const hasSameValue = (row, col) => {
    if (selectedRow === null || selectedCol === null) return false;
    const cell = myBoard?.[selectedRow]?.[selectedCol];
    if (!cell || cell.value === EMPTY) return false;
    const target = myBoard?.[row]?.[col];
    return target?.value === cell.value && target?.value !== EMPTY;
  };

  const handleCellClick = (row, col) => {
    if (lockedWrongCell) {
      if (row === lockedWrongCell.row && col === lockedWrongCell.col) {
        setSelectedRow(row);
        setSelectedCol(col);
      }
      return;
    }
    if (selectedRow === row && selectedCol === col) {
      setSelectedRow(null);
      setSelectedCol(null);
    } else {
      setSelectedRow(row);
      setSelectedCol(col);
    }
  };

  const handleNumberInput = useCallback(
    (num) => {
      if (selectedRow === null || selectedCol === null) return;
      if (isGiven(selectedRow, selectedCol)) return;

      if (lockedWrongCell) {
        if (
          selectedRow !== lockedWrongCell.row ||
          selectedCol !== lockedWrongCell.col
        )
          return;
        if (num !== 'erase') return;
      }

      if (sketchMode && num !== 'erase') {
        const key = `${selectedRow}-${selectedCol}`;
        setSketchMarks((prev) => {
          const next = { ...prev };
          const marks = next[key] ? [...next[key]] : [];
          const idx = marks.indexOf(num);
          if (idx >= 0) {
            marks.splice(idx, 1);
          } else {
            marks.push(num);
            marks.sort((a, b) => a - b);
          }
          if (marks.length === 0) {
            delete next[key];
          } else {
            next[key] = marks;
          }
          return next;
        });
        return;
      }

      const value = num === 'erase' ? EMPTY : num;
      socket?.emit('make_move', { row: selectedRow, col: selectedCol, value });
    },
    [selectedRow, selectedCol, socket, puzzle, sketchMode, lockedWrongCell]
  );

  const handleErase = useCallback(() => {
    handleNumberInput('erase');
  }, [handleNumberInput]);

  const handleHint = useCallback(() => {
    socket?.emit('request_hint');
  }, [socket]);

  const toggleSketchMode = useCallback(() => {
    setSketchMode((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lockedWrongCell && selectedRow !== null && selectedCol !== null) {
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
          if (
            selectedRow === lockedWrongCell.row &&
            selectedCol === lockedWrongCell.col
          ) {
            e.preventDefault();
            handleNumberInput('erase');
          }
        }
        return;
      }

      if (selectedRow === null || selectedCol === null) {
        if (
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'
        ) {
          e.preventDefault();
          setSelectedRow(0);
          setSelectedCol(0);
        }
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handleNumberInput('erase');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedRow((r) => Math.max(0, r - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedRow((r) => Math.min(8, r + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCol((c) => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedCol((c) => Math.min(8, c + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRow, selectedCol, handleNumberInput, lockedWrongCell]);

  const getPlayerName = (id) => {
    if (id === 'given') return '';
    if (id === 'hint') return '';
    const player = room?.players?.find((p) => p.id === id);
    return player?.name?.charAt(0) || '';
  };

  const getPlayerColor = (id) => {
    if (id === 'given') return 'transparent';
    if (id === 'hint') return 'transparent';
    const idx = room?.players?.findIndex((p) => p.id === id);
    return idx >= 0 ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : '#888';
  };

  const numberCounts = {};
  for (let n = 1; n <= 9; n++) {
    let count = 0;
    if (myBoard) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (myBoard[r][c].value === n) count++;
        }
      }
    }
    numberCounts[n] = 9 - count;
  }

  const getCellClass = (row, col) => {
    const classes = ['cell'];
    if (isGiven(row, col)) classes.push('cell-given');
    if (isSelected(row, col)) classes.push('cell-selected');
    else if (isRelated(row, col)) classes.push('cell-related');
    if (hasSameValue(row, col)) classes.push('cell-same-value');
    if (!isGiven(row, col) && isSelected(row, col)) classes.push('cell-editable');

    if (row % 3 === 0) classes.push('cell-row-divider-top');
    if (col % 3 === 0) classes.push('cell-col-divider-left');
    if (row === 8) classes.push('cell-row-divider-bottom');
    if (col === 8) classes.push('cell-col-divider-right');

    const flashKey = `${row}-${col}`;
    const flashType = cellFlash[flashKey];
    if (flashType === 'correct') {
      classes.push('flash-correct');
      classes.push('cell-pop');
    }
    if (flashType === 'invalid') {
      classes.push('flash-invalid');
      classes.push('cell-shake');
    }
    if (flashType === 'erased') {
      classes.push('flash-correct');
    }

    if (hintHighlight === flashKey) {
      classes.push('cell-hint-glow');
    }

    if (
      lockedWrongCell &&
      lockedWrongCell.row === row &&
      lockedWrongCell.col === col
    ) {
      classes.push('cell-locked-wrong');
    }

    return classes.join(' ');
  };

  const players = room?.players || [];

  return (
    <div className="game-container">
      <div className="game-board-wrapper">
        <div className="game-timer-row">
          <span className="game-mode-badge">
            {mode === 'battle' ? 'Battle' : 'Cooperative'}
          </span>
          <span className="game-credits">
            Credits: {credits}
          </span>
        </div>

        <div className="sudoku-grid" ref={boardRef}>
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 9 }).map((__, col) => {
              const cell = myBoard?.[row]?.[col];
              const value = cell?.value;
              const displayValue = value !== EMPTY ? value : '';
              const filledBy = cell?.filledBy;
              const marks = sketchMarks[`${row}-${col}`] || [];
              const showMarks = marks.length > 0 && value === EMPTY;

              return (
                <div
                  key={`${row}-${col}`}
                  className={getCellClass(row, col)}
                  onClick={() => handleCellClick(row, col)}
                >
                  {showMarks ? (
                    <div className="sketch-marks-grid">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span
                          key={n}
                          className={`sketch-mark ${marks.includes(n) ? 'sketch-mark-visible' : ''}`}
                        >
                          {marks.includes(n) ? n : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="cell-value">{displayValue}</span>
                  )}
                  {mode === 'coop' && filledBy && filledBy !== 'given' && filledBy !== 'hint' && (
                    <span
                      className="cell-player-dot"
                      style={{ backgroundColor: getPlayerColor(filledBy) }}
                      title={getPlayerName(filledBy)}
                    />
                  )}
                </div>
              );
            })
          )}

          {scoreFloats.map((f) => (
            <div
              key={f.id}
              className={`score-float score-float-${f.type}`}
              style={{
                top: `${(f.row / 9) * 100}%`,
                left: `${(f.col / 9) * 100}%`,
              }}
            >
              {f.text}
            </div>
          ))}
        </div>

        <div className="game-toolbar">
          <button
            className={`toolbar-btn sketch-btn ${sketchMode ? 'active' : ''}`}
            onClick={toggleSketchMode}
            title="Toggle sketch mode"
          >
            ✏️ Sketch
          </button>
          <button
            className="toolbar-btn hint-btn"
            onClick={handleHint}
            disabled={credits <= 0}
            title="Request a hint"
          >
            💡 Hint ({credits})
          </button>
          <button
            className="toolbar-btn erase-btn"
            onClick={handleErase}
            disabled={selectedRow === null || selectedCol === null}
            title="Erase selected cell"
          >
            🧹 Erase
          </button>
        </div>

        {lockedWrongCell && (
          <div className="locked-warning">Clear the red cell first!</div>
        )}

        <div className="number-pad">
          <div className="number-pad-row">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className={`num-button ${numberCounts[num] <= 0 ? 'num-depleted' : ''} ${sketchMode ? 'num-sketch-mode' : ''}`}
                onClick={() => handleNumberInput(num)}
                disabled={numberCounts[num] <= 0 && !sketchMode}
              >
                <span className="num-value">{num}</span>
                {!sketchMode && (
                  <span className="num-count">{numberCounts[num]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="player-sidebar">
        <h3 className="sidebar-title">
          {mode === 'battle' ? 'Leaderboard' : 'Team'}
        </h3>
        <div className="sidebar-players">
          {players
            .slice()
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((player, index) => (
              <div
                key={player.id}
                className={`sidebar-player ${player.id === playerId ? 'is-self' : ''}`}
              >
                <div className="sidebar-player-rank">#{index + 1}</div>
                <div className="sidebar-player-info">
                  <div className="sidebar-player-name">
                    <span
                      className={`sidebar-player-status ${player.connected !== false ? 'connected' : 'disconnected'}`}
                    />
                    {player.name}
                  </div>
                  <div className="sidebar-player-stats">
                    <span>Score: {player.score || 0}</span>
                    <span>Cells: {player.cellsCompleted || 0}</span>
                    <span>Mistakes: {player.mistakes || 0}</span>
                  </div>
                </div>
                <div
                  className="sidebar-player-color"
                  style={{
                    backgroundColor:
                      PLAYER_COLORS[index % PLAYER_COLORS.length],
                  }}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
