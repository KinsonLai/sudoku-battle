const STORAGE_KEY = 'quiz-scoreboard';

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 10)
  );
}

export class Scoreboard {
  #records;

  constructor() {
    this.#records = this.#load();
  }

  addRecord(record) {
    const entry = {
      ...record,
      id: record.id || generateId(),
      date: record.date || new Date().toISOString(),
    };
    this.#records.push(entry);
    this.#save();
    return entry;
  }

  getRecords() {
    return [...this.#records];
  }

  getRecord(id) {
    return this.#records.find((r) => r.id === id) || null;
  }

  deleteRecord(id) {
    const index = this.#records.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.#records.splice(index, 1);
    this.#save();
    return true;
  }

  clearAll() {
    this.#records = [];
    this.#save();
  }

  getStats() {
    const totalQuizzes = this.#records.length;
    if (totalQuizzes === 0) {
      return {
        totalQuizzes: 0,
        avgScore: 0,
        avgAccuracy: 0,
        bestScore: 0,
        totalTime: 0,
        byCategory: {},
        byDifficulty: {},
        recentTrend: [],
      };
    }

    const totalScore = this.#records.reduce((s, r) => s + r.score, 0);
    const totalAccuracy = this.#records.reduce((s, r) => s + r.accuracy, 0);
    const bestScore = Math.max(...this.#records.map((r) => r.score));
    const totalTime = this.#records.reduce((s, r) => s + r.totalTime, 0);

    const byCategory = {};
    for (const r of this.#records) {
      if (!byCategory[r.category]) {
        byCategory[r.category] = { count: 0, totalScore: 0, totalAccuracy: 0 };
      }
      byCategory[r.category].count++;
      byCategory[r.category].totalScore += r.score;
      byCategory[r.category].totalAccuracy += r.accuracy;
    }
    for (const key of Object.keys(byCategory)) {
      byCategory[key].avgScore = Math.round(
        byCategory[key].totalScore / byCategory[key].count,
      );
      byCategory[key].avgAccuracy = Math.round(
        byCategory[key].totalAccuracy / byCategory[key].count,
      );
    }

    const byDifficulty = {};
    for (const r of this.#records) {
      if (!byDifficulty[r.difficulty]) {
        byDifficulty[r.difficulty] = { count: 0, totalScore: 0, totalAccuracy: 0 };
      }
      byDifficulty[r.difficulty].count++;
      byDifficulty[r.difficulty].totalScore += r.score;
      byDifficulty[r.difficulty].totalAccuracy += r.accuracy;
    }
    for (const key of Object.keys(byDifficulty)) {
      byDifficulty[key].avgScore = Math.round(
        byDifficulty[key].totalScore / byDifficulty[key].count,
      );
      byDifficulty[key].avgAccuracy = Math.round(
        byDifficulty[key].totalAccuracy / byDifficulty[key].count,
      );
    }

    const sorted = [...this.#records].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
    const recentTrend = sorted.slice(0, 10).map((r) => r.score);

    return {
      totalQuizzes,
      avgScore: Math.round(totalScore / totalQuizzes),
      avgAccuracy: Math.round(totalAccuracy / totalQuizzes),
      bestScore,
      totalTime: Math.round(totalTime * 100) / 100,
      byCategory,
      byDifficulty,
      recentTrend,
    };
  }

  filterRecords(filters = {}) {
    let results = [...this.#records];

    if (filters.category) {
      results = results.filter((r) => r.category === filters.category);
    }
    if (filters.difficulty) {
      results = results.filter((r) => r.difficulty === filters.difficulty);
    }
    if (filters.minScore !== undefined) {
      results = results.filter((r) => r.score >= filters.minScore);
    }
    if (filters.maxScore !== undefined) {
      results = results.filter((r) => r.score <= filters.maxScore);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      results = results.filter((r) => new Date(r.date) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      results = results.filter((r) => new Date(r.date) <= end);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.category.toLowerCase().includes(term) ||
          r.difficulty.toLowerCase().includes(term),
      );
    }

    return results;
  }

  sortRecords(records, sortBy = 'date', order = 'desc') {
    const sorted = [...records];
    const multiplier = order === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'score':
        sorted.sort((a, b) => (a.score - b.score) * multiplier);
        break;
      case 'accuracy':
        sorted.sort((a, b) => (a.accuracy - b.accuracy) * multiplier);
        break;
      case 'time':
        sorted.sort((a, b) => (a.totalTime - b.totalTime) * multiplier);
        break;
      case 'date':
      default:
        sorted.sort(
          (a, b) =>
            (new Date(a.date).getTime() - new Date(b.date).getTime()) *
            multiplier,
        );
        break;
    }

    return sorted;
  }

  exportCSV() {
    if (this.#records.length === 0) {
      return 'id,date,category,difficulty,totalQuestions,correctAnswers,accuracy,totalTime,score,maxStreak';
    }

    const headers = [
      'id',
      'date',
      'category',
      'difficulty',
      'totalQuestions',
      'correctAnswers',
      'accuracy',
      'totalTime',
      'score',
      'maxStreak',
    ];

    const rows = this.#records.map((r) =>
      [
        r.id,
        r.date,
        `"${r.category}"`,
        `"${r.difficulty}"`,
        r.totalQuestions,
        r.correctAnswers,
        r.accuracy,
        r.totalTime,
        r.score,
        r.maxStreak,
      ].join(','),
    );

    return headers.join(',') + '\n' + rows.join('\n');
  }

  exportJSON() {
    return JSON.stringify(this.#records, null, 2);
  }

  #load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#records));
    } catch {
      // storage full or unavailable
    }
  }
}
