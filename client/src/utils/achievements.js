export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Victory', description: 'Complete your first puzzle', icon: '🏆', check: (stats) => stats.totalCompleted >= 1 },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a puzzle in under 3 minutes', icon: '⚡', check: (stats, records) => records.some(r => r.completed && r.timeSeconds < 180) },
  { id: 'perfectionist', name: 'Perfectionist', description: 'Complete a puzzle with 100% accuracy', icon: '💯', check: (stats, records) => records.some(r => r.completed && r.accuracy === 100) },
  { id: 'sharp_shooter', name: 'Sharp Shooter', description: 'Complete a puzzle with 90%+ accuracy', icon: '🎯', check: (stats, records) => records.some(r => r.completed && r.accuracy >= 90) },
  { id: 'on_fire', name: 'On Fire', description: 'Win 5 games in a row', icon: '🔥', check: (stats, records) => {
    if (records.length < 5) return false;
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    for (const r of sorted) {
      if (r.completed) { streak++; if (streak >= 5) return true; }
      else { streak = 0; }
    }
    return false;
  }},
  { id: 'marathon', name: 'Marathon Runner', description: 'Complete 10 puzzles', icon: '🏃', check: (stats) => stats.totalCompleted >= 10 },
  { id: 'centurion', name: 'Centurion', description: 'Score 500+ points in a single game', icon: '👑', check: (stats, records) => records.some(r => r.score >= 500) },
  { id: 'all_around', name: 'All-Around', description: 'Complete a puzzle on every difficulty', icon: '🌟', check: (stats, records) => {
    const diffs = new Set(records.filter(r => r.completed).map(r => r.difficulty));
    return diffs.has('easy') && diffs.has('medium') && diffs.has('hard') && diffs.has('expert') && diffs.has('hell_no');
  }},
  { id: 'no_mistakes', name: 'Flawless', description: 'Complete a hard or expert puzzle with zero mistakes', icon: '💎', check: (stats, records) => records.some(r => r.completed && r.mistakes === 0 && (r.difficulty === 'hard' || r.difficulty === 'expert')) },
  { id: 'hundred_games', name: 'Veteran', description: 'Play 50 games', icon: '🎖️', check: (stats) => stats.totalGames >= 50 },
  { id: 'under_pressure', name: 'Under Pressure', description: 'Complete a puzzle with a countdown timer', icon: '⏰', check: (stats, records) => records.some(r => r.completed && r.timeSeconds > 0 && r.mode === 'singleplayer_timed') },
  { id: 'dedication', name: 'Dedication', description: 'Play 25 games', icon: '📅', check: (stats) => stats.totalGames >= 25 },
  { id: 'brain_drain', name: 'Brain Drain', description: 'Use 5 or more hints in a single game', icon: '🧠', check: (stats, records) => records.some(r => (r.hintsUsed || 0) >= 5) },
];

export function checkAchievements(stats, records) {
  const unlocked = [];
  const allUnlocked = JSON.parse(localStorage.getItem('sudoku-achievements') || '[]');
  for (const ach of ACHIEVEMENTS) {
    if (!allUnlocked.includes(ach.id) && ach.check(stats, records)) {
      unlocked.push(ach);
    }
  }
  if (unlocked.length > 0) {
    localStorage.setItem('sudoku-achievements', JSON.stringify([...allUnlocked, ...unlocked.map(a => a.id)]));
  }
  return unlocked;
}

export function getUnlockedAchievements() {
  const ids = JSON.parse(localStorage.getItem('sudoku-achievements') || '[]');
  return ACHIEVEMENTS.filter(a => ids.includes(a.id));
}

export function getAllAchievements() {
  const ids = JSON.parse(localStorage.getItem('sudoku-achievements') || '[]');
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: ids.includes(a.id) }));
}
