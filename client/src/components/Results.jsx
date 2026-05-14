import { useState } from 'react';

export default function Results({ result, playerName, mode, onRematch, onLeave }) {
  const [rematching, setRematching] = useState(false);

  const isBattle = mode === 'battle';
  const isCoop = mode === 'coop';
  const winner = result?.winner;
  const isWinner = winner === playerName || (winner && result?.players?.find((p) => p.name === winner && p.name === playerName));

  if (!result) {
    return (
      <div className="results-container">
        <div className="results-card">
          <h2>Game Over</h2>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  const players = result.players || result.leaderboard || [];
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  const handleRematch = () => {
    setRematching(true);
    onRematch?.();
  };

  return (
    <div className="results-container">
      <div className="results-card">
        {isBattle ? (
          <>
            <div className={`results-header ${isWinner ? 'victory' : 'defeat'}`}>
              {isWinner ? 'Victory!' : 'Defeat!'}
            </div>
            <p className="results-subtitle">
              {isWinner
                ? 'You won the battle!'
                : `${winner || 'Someone else'} won the battle`}
            </p>
          </>
        ) : (
          <>
            <div className="results-header victory">Puzzle Complete!</div>
            <p className="results-subtitle">Team solved it together!</p>
          </>
        )}

        {isBattle && sortedPlayers.length >= 3 && (
          <div className="podium">
            {sortedPlayers[1] && (
              <div className="podium-spot podium-second">
                <div className="podium-face">
                  <div className="podium-avatar">{sortedPlayers[1]?.name?.charAt(0) || '?'}</div>
                </div>
                <div className="podium-name">{sortedPlayers[1]?.name || '???'}</div>
                <div className="podium-bar">2nd</div>
              </div>
            )}
            {sortedPlayers[0] && (
              <div className="podium-spot podium-first">
                <div className="podium-face">
                  <div className="podium-avatar gold">{sortedPlayers[0]?.name?.charAt(0) || '?'}</div>
                </div>
                <div className="podium-name">{sortedPlayers[0]?.name || '???'}</div>
                <div className="podium-bar gold">1st</div>
              </div>
            )}
            {sortedPlayers[2] && (
              <div className="podium-spot podium-third">
                <div className="podium-face">
                  <div className="podium-avatar">{sortedPlayers[2]?.name?.charAt(0) || '?'}</div>
                </div>
                <div className="podium-name">{sortedPlayers[2]?.name || '???'}</div>
                <div className="podium-bar">3rd</div>
              </div>
            )}
          </div>
        )}

        <div className="results-table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Cells</th>
                <th>Mistakes</th>
                {isCoop && <th>Hints Used</th>}
                {isCoop && <th>Correct</th>}
                {isCoop && <th>Mistakes</th>}
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, i) => (
                <tr
                  key={p.id || p.name || i}
                  className={p.name === playerName ? 'results-row-self' : ''}
                >
                  <td className="results-rank">#{i + 1}</td>
                  <td>{p.name || '???'}</td>
                  <td>{p.score || 0}</td>
                  <td>{p.cellsCompleted || 0}</td>
                  <td>{p.mistakes || 0}</td>
                  {isCoop && <td>{p.hintsUsed || 0}</td>}
                  {isCoop && <td>{p.coopCorrectMoves ?? p.correctMoves ?? 0}</td>}
                  {isCoop && <td>{p.coopMistakes ?? p.mistakes ?? 0}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result.completionTime && (
          <div className="results-time">
            Completion time: <strong>{result.completionTime}</strong>
          </div>
        )}

        <div className="results-actions">
          <button
            className="btn btn-primary"
            onClick={handleRematch}
            disabled={rematching}
          >
            {rematching ? 'Requesting...' : 'Rematch'}
          </button>
          <button className="btn btn-secondary" onClick={onLeave}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
