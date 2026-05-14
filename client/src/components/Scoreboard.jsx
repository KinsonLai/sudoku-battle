import { useState, useMemo } from 'react';
import useScoreboard, { clearAllRecords } from '../hooks/useScoreboard';

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTime(seconds) {
  if (seconds == null) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDifficulty(d) {
  return d.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard', 'expert', 'hell_no'];
const DIFFICULTY_COLORS = {
  easy: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  medium: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
  hard: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  expert: { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' },
  hell_no: { bg: '#f3e5f5', text: '#7b1fa2', border: '#ce93d8' },
};

const DARK_DIFFICULTY_COLORS = {
  easy: { bg: '#1b3a1b', text: '#66bb6a', border: '#2e7d32' },
  medium: { bg: '#1a2a3f', text: '#5a9bd5', border: '#2a4a6a' },
  hard: { bg: '#3e2710', text: '#ffa726', border: '#6d4c00' },
  expert: { bg: '#3e1515', text: '#ef5350', border: '#6d2020' },
  hell_no: { bg: '#2a1535', text: '#ce93d8', border: '#4a2060' },
};

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'score-desc', label: 'Highest Score' },
  { value: 'score-asc', label: 'Lowest Score' },
  { value: 'time-asc', label: 'Fastest' },
  { value: 'time-desc', label: 'Slowest' },
  { value: 'accuracy-desc', label: 'Best Accuracy' },
];

function computeStreaks(records) {
  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  let currentStreak = 0;
  let bestStreak = 0;
  for (const r of sorted) {
    if (r.completed) {
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }
  return { currentStreak, bestStreak };
}

export default function Scoreboard({ onBack }) {
  const {
    records,
    allRecords,
    stats,
    personalBests,
    trendData,
    filters,
    setFilters,
    deleteRecord,
    clearAll,
    isPersonalBest,
  } = useScoreboard();

  const [tab, setTab] = useState('history');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const completionRate = stats.totalGames > 0
    ? Math.round((stats.totalCompleted / stats.totalGames) * 100)
    : 0;

  const { currentStreak, bestStreak } = useMemo(
    () => computeStreaks(allRecords),
    [allRecords],
  );

  const handleClearAll = () => {
    clearAll();
    clearAllRecords();
    setShowClearConfirm(false);
  };

  const difficultyOptions = DIFFICULTIES.map((d) => ({
    value: d,
    label: d === 'all' ? 'All' : formatDifficulty(d),
  }));

  const chartData = [...trendData];
  const maxScore = chartData.length > 0 ? Math.max(...chartData.map((d) => d.score), 1) : 1;

  const accuracyPoints = chartData.map((d) => d.accuracy);

  return (
    <div className="scoreboard-container">
      <div className="scoreboard-card">
        <div className="scoreboard-header">
          <button className="btn-back" onClick={onBack}>
            &larr; Back
          </button>
          <h1 className="scoreboard-title">Scoreboard</h1>
          <div className="scoreboard-spacer" />
        </div>

        <div className="tab-bar">
          <button
            className={`tab-button ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
          >
            History
          </button>
          <button
            className={`tab-button ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
        </div>

        {tab === 'history' && (
          <div className="tab-content">
            <div className="filter-bar">
              <div className="filter-group">
                <select
                  className="filter-select"
                  value={filters.difficulty}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, difficulty: e.target.value }))
                  }
                >
                  {difficultyOptions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <select
                  className="filter-select"
                  value={filters.sort}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, sort: e.target.value }))
                  }
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group filter-search-group">
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Search difficulty or mode..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                />
              </div>
              <button
                className="btn btn-secondary btn-clear-all"
                onClick={() => setShowClearConfirm(true)}
                disabled={allRecords.length === 0}
              >
                Clear All
              </button>
            </div>

            {records.length === 0 ? (
              <p className="empty-state">
                No records yet. Play some games to see your history!
              </p>
            ) : (
              <div className="records-list">
                {records.map((record) => (
                  <div key={record.id} className="record-card">
                    <div className="record-left">
                      <div className="record-date">{formatDate(record.date)}</div>
                      <div className="record-badges">
                        <span
                          className="badge badge-record-difficulty"
                          style={{
                            '--diff-bg': DIFFICULTY_COLORS[record.difficulty]?.bg,
                            '--diff-text': DIFFICULTY_COLORS[record.difficulty]?.text,
                            '--diff-border': DIFFICULTY_COLORS[record.difficulty]?.border,
                            '--diff-bg-dark': DARK_DIFFICULTY_COLORS[record.difficulty]?.bg,
                            '--diff-text-dark': DARK_DIFFICULTY_COLORS[record.difficulty]?.text,
                            '--diff-border-dark': DARK_DIFFICULTY_COLORS[record.difficulty]?.border,
                          }}
                        >
                          {formatDifficulty(record.difficulty)}
                        </span>
                        <span className="badge badge-record-mode">
                          {record.mode === 'timed' ? 'Timed' : 'Singleplayer'}
                        </span>
                      </div>
                    </div>
                    <div className="record-stats">
                      <div className="record-stat">
                        <span className="record-stat-value record-score">{record.score}</span>
                        <span className="record-stat-label">Score</span>
                      </div>
                      <div className="record-stat">
                        <span className="record-stat-value">{record.accuracy}%</span>
                        <span className="record-stat-label">Accuracy</span>
                      </div>
                      <div className="record-stat">
                        <span className="record-stat-value">
                          {formatTime(record.timeSeconds)}
                        </span>
                        <span className="record-stat-label">Time</span>
                      </div>
                      <div className="record-stat">
                        <span className="record-stat-value">{record.mistakes}</span>
                        <span className="record-stat-label">Mistakes</span>
                      </div>
                    </div>
                    <div className="record-right">
                      {isPersonalBest(record) && (
                        <span className="record-pb" title="Personal Best">
                          &#9733;
                        </span>
                      )}
                      <button
                        className="btn-record-delete"
                        onClick={() => deleteRecord(record.id)}
                        title="Delete record"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'overview' && (
          <div className="tab-content">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.totalGames}</span>
                <span className="stat-label">Total Games Played</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.averageScore}</span>
                <span className="stat-label">Average Score</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{completionRate}%</span>
                <span className="stat-label">Completion Rate</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">
                  {stats.bestTime ? formatTime(stats.bestTime) : '--'}
                </span>
                <span className="stat-label">Best Time</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.averageAccuracy}%</span>
                <span className="stat-label">Average Accuracy</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.totalCorrectMoves}</span>
                <span className="stat-label">Total Correct Moves</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.totalMistakes}</span>
                <span className="stat-label">Total Mistakes</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">
                  {stats.totalGames > 0 ? currentStreak : '--'}
                </span>
                <span className="stat-label">Current Streak</span>
              </div>
            </div>

            <div className="section">
              <h2 className="section-title">Performance by Difficulty</h2>
              <div className="difficulty-table-wrapper">
                <table className="difficulty-table">
                  <thead>
                    <tr>
                      <th>Difficulty</th>
                      <th>Games</th>
                      <th>Best Score</th>
                      <th>Best Time</th>
                      <th>Best Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIFFICULTIES.slice(1).map((diff) => {
                      const pb = personalBests.byDifficulty[diff];
                      return (
                        <tr key={diff}>
                          <td>
                            <span
                              className="difficulty-table-label"
                              style={{
                                '--diff-bg': DIFFICULTY_COLORS[diff]?.bg,
                                '--diff-text': DIFFICULTY_COLORS[diff]?.text,
                                '--diff-border': DIFFICULTY_COLORS[diff]?.border,
                                '--diff-bg-dark': DARK_DIFFICULTY_COLORS[diff]?.bg,
                                '--diff-text-dark': DARK_DIFFICULTY_COLORS[diff]?.text,
                                '--diff-border-dark': DARK_DIFFICULTY_COLORS[diff]?.border,
                              }}
                            >
                              {formatDifficulty(diff)}
                            </span>
                          </td>
                          <td>{pb ? pb.gamesPlayed : '--'}</td>
                          <td>{pb ? pb.bestScore : '--'}</td>
                          <td>{pb ? formatTime(pb.bestTime) : '--'}</td>
                          <td>{pb ? `${pb.bestAccuracy}%` : '--'}</td>
                        </tr>
                      );
                    })}
                    {Object.keys(personalBests.byDifficulty).length === 0 && (
                      <tr>
                        <td colSpan={5} className="empty-cell">
                          No completed games yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="section">
              <h2 className="section-title">Score Trends</h2>
              {chartData.length < 2 ? (
                <p className="empty-state">Play more games to see trends</p>
              ) : (
                <>
                  <div className="trend-chart">
                    <div className="trend-bars">
                      {chartData.map((d, i) => (
                        <div key={i} className="trend-bar-wrapper">
                          <div
                            className="trend-bar"
                            style={{ height: `${(d.score / maxScore) * 100}%` }}
                          >
                            <span className="trend-bar-value">{d.score}</span>
                          </div>
                          <span className="trend-bar-label">{d.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="accuracy-trend">
                    <h3 className="trend-subtitle">Accuracy Trend</h3>
                    <div className="accuracy-line-chart">
                      {accuracyPoints.map((acc, i) => {
                        if (i === accuracyPoints.length - 1) return null;
                        const maxIdx = Math.max(accuracyPoints.length - 1, 1);
                        const x1 = (i / maxIdx) * 100;
                        const x2 = ((i + 1) / maxIdx) * 100;
                        const y1 = 100 - accuracyPoints[i];
                        const y2 = 100 - Math.max(accuracyPoints[i + 1], 1);
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const length = Math.sqrt(dx * dx + dy * dy);
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        return (
                          <div
                            key={`seg-${i}`}
                            className="accuracy-segment"
                            style={{
                              width: `${length}%`,
                              left: `${x1}%`,
                              top: `${y1}%`,
                              transform: `rotate(${angle}deg)`,
                            }}
                          />
                        );
                      })}
                      {chartData.map((d, i) => (
                        <div
                          key={`dot-${i}`}
                          className="accuracy-dot"
                          style={{
                            left: `${(i / Math.max(chartData.length - 1, 1)) * 100}%`,
                            top: `${100 - Math.max(d.accuracy, 1)}%`,
                          }}
                        >
                          <span className="accuracy-dot-value">{d.accuracy}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="accuracy-dates">
                      {chartData.map((d, i) => (
                        <span key={i} className="accuracy-date">
                          {d.date}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="modal-message">
              Are you sure you want to delete all {allRecords.length} records? This
              cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary btn-danger" onClick={handleClearAll}>
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
