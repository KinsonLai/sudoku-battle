const ACHIEVEMENTS = [
  {
    id: 'first-quiz',
    name: 'First Quiz',
    description: 'Complete your first quiz',
    icon: '🎯',
    check(records) {
      return records.length >= 1;
    },
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Achieve 100% accuracy on any quiz',
    icon: '🏆',
    check(records) {
      return records.some((r) => r.accuracy === 100);
    },
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a quiz in under 45 seconds',
    icon: '⚡',
    check(records) {
      return records.some((r) => r.totalTime < 45);
    },
  },
  {
    id: 'consistent-performer',
    name: 'Consistent Performer',
    description: 'Complete 3 quizzes with >80% accuracy',
    icon: '📊',
    check(records) {
      const highAccuracy = records.filter((r) => r.accuracy > 80);
      return highAccuracy.length >= 3;
    },
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: 'Achieve a 5+ answer streak in a quiz',
    icon: '🔥',
    check(records) {
      return records.some((r) => r.maxStreak >= 5);
    },
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Score over 1000 points in a single quiz',
    icon: '💯',
    check(records) {
      return records.some((r) => r.score > 1000);
    },
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Complete 10 quizzes',
    icon: '🎓',
    check(records) {
      return records.length >= 10;
    },
  },
  {
    id: 'marathon',
    name: 'Marathon',
    description: 'Complete a quiz with 15+ questions',
    icon: '🏃',
    check(records) {
      return records.some((r) => r.totalQuestions >= 15);
    },
  },
  {
    id: 'flawless-victory',
    name: 'Flawless Victory',
    description: 'Get a perfect score on hard difficulty',
    icon: '👑',
    check(records) {
      return records.some(
        (r) => r.accuracy === 100 && r.difficulty === 'hard',
      );
    },
  },
  {
    id: 'jack-of-all-trades',
    name: 'Jack of All Trades',
    description: 'Complete a quiz in all 5 categories',
    icon: '🃏',
    check(records) {
      const categories = new Set(records.map((r) => r.category));
      return categories.size >= 5;
    },
  },
];

export function getAllAchievements() {
  return ACHIEVEMENTS.map(({ check, ...rest }) => ({ ...rest }));
}

export function checkAchievements(scoreboard) {
  const records = scoreboard.getRecords();

  return ACHIEVEMENTS.filter((achievement) => achievement.check(records)).map(
    (achievement) => {
      const earnedAt = records
        .slice()
        .reverse()
        .find((r) => {
          const temp = [r];
          return achievement.check(temp);
        });

      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        earnedAt: earnedAt ? earnedAt.date : records[records.length - 1]?.date,
      };
    },
  );
}
