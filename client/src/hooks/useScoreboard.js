import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sudoku-scoreboard';
const MAX_RECORDS = 500;

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch { /* storage full */ }
}

export function clearAllRecords() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function useScoreboard() {
  const [records, setRecords] = useState(loadRecords);
  const [filters, setFilters] = useState({ difficulty: 'all', sort: 'date-desc', search: '' });

  useEffect(() => { saveRecords(records); }, [records]);

  const addRecord = useCallback((record) => {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      difficulty: record.difficulty || 'medium',
      score: record.score || 0,
      accuracy: record.accuracy ?? (record.totalMoves > 0 ? Math.round((record.correctMoves / record.totalMoves) * 100) : 0),
      timeSeconds: record.timeSeconds || 0,
      correctMoves: record.correctMoves || 0,
      mistakes: record.mistakes || 0,
      totalMoves: record.totalMoves || 0,
      completed: record.completed ?? true,
      mode: record.mode || 'singleplayer',
    };
    setRecords((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const deleteRecord = useCallback((id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
  }, []);

  // Derived stats
  const filteredRecords = (() => {
    let list = [...records];
    if (filters.difficulty !== 'all') {
      list = list.filter((r) => r.difficulty === filters.difficulty);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((r) => r.difficulty.includes(q) || r.mode.includes(q));
    }
    switch (filters.sort) {
      case 'date-asc': list.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
      case 'date-desc': list.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
      case 'score-desc': list.sort((a, b) => b.score - a.score); break;
      case 'score-asc': list.sort((a, b) => a.score - b.score); break;
      case 'time-asc': list.sort((a, b) => a.timeSeconds - b.timeSeconds); break;
      case 'time-desc': list.sort((a, b) => b.timeSeconds - a.timeSeconds); break;
      case 'accuracy-desc': list.sort((a, b) => b.accuracy - a.accuracy); break;
      default: list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return list;
  })();

  const stats = {
    totalGames: records.length,
    totalCompleted: records.filter((r) => r.completed).length,
    completedRecords: records.filter((r) => r.completed),
    averageScore: records.length > 0 ? Math.round(records.reduce((s, r) => s + r.score, 0) / records.length) : 0,
    averageAccuracy: records.length > 0 ? Math.round(records.reduce((s, r) => s + r.accuracy, 0) / records.length) : 0,
    averageTime: records.length > 0 ? Math.round(records.reduce((s, r) => s + r.timeSeconds, 0) / records.length) : 0,
    bestScore: records.length > 0 ? Math.max(...records.map((r) => r.score)) : 0,
    bestTime: records.length > 0 ? Math.min(...records.filter(r => r.completed).map((r) => r.timeSeconds)) : 0,
    bestAccuracy: records.length > 0 ? Math.max(...records.map((r) => r.accuracy)) : 0,
    totalCorrectMoves: records.reduce((s, r) => s + r.correctMoves, 0),
    totalMistakes: records.reduce((s, r) => s + r.mistakes, 0),
  };

  const personalBests = {
    byDifficulty: {},
  };
  ['easy', 'medium', 'hard', 'expert'].forEach((diff) => {
    const diffRecords = records.filter((r) => r.difficulty === diff && r.completed);
    if (diffRecords.length > 0) {
      personalBests.byDifficulty[diff] = {
        bestScore: Math.max(...diffRecords.map((r) => r.score)),
        bestTime: Math.min(...diffRecords.map((r) => r.timeSeconds)),
        bestAccuracy: Math.max(...diffRecords.map((r) => r.accuracy)),
        gamesPlayed: diffRecords.length,
      };
    }
  });

  const isPersonalBest = (record) => {
    const sameDiff = records.filter((r) => r.difficulty === record.difficulty && r.completed && r.id !== record.id);
    if (sameDiff.length === 0) return true;
    return record.score >= Math.max(...sameDiff.map((r) => r.score)) ||
           record.timeSeconds <= Math.min(...sameDiff.map((r) => r.timeSeconds));
  };

  // Last 10 records for trend chart data
  const trendData = filteredRecords.slice(0, 10).reverse().map((r, i) => ({
    index: i + 1,
    score: r.score,
    time: r.timeSeconds,
    accuracy: r.accuracy,
    date: new Date(r.date).toLocaleDateString(),
  }));

  return {
    records: filteredRecords,
    allRecords: records,
    stats,
    personalBests,
    trendData,
    filters,
    setFilters,
    addRecord,
    deleteRecord,
    clearAll,
    isPersonalBest,
  };
}
