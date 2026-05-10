export class QuizEngine {
  #questions;
  #settings;
  #currentIndex;
  #score;
  #streak;
  #maxStreak;
  #correctCount;
  #totalTime;
  #answers;
  #timerStart;
  #timeLimit;
  #timerId;
  #submitted;
  #questionOrder;

  constructor(questions, settings = {}) {
    this.#questions = questions;
    this.#settings = {
      difficulty: settings.difficulty || null,
      category: settings.category || null,
      questionCount: settings.questionCount || 10,
    };
    this.#currentIndex = -1;
    this.#score = 0;
    this.#streak = 0;
    this.#maxStreak = 0;
    this.#correctCount = 0;
    this.#totalTime = 0;
    this.#answers = [];
    this.#timerStart = 0;
    this.#timeLimit = 0;
    this.#timerId = null;
    this.#submitted = false;
    this.#questionOrder = [];
  }

  startQuiz() {
    const pool = this.#filterQuestions();
    const shuffled = this.#shuffle([...pool]);
    this.#questionOrder = shuffled.slice(0, this.#settings.questionCount);

    if (this.#questionOrder.length === 0) {
      return null;
    }

    this.#currentIndex = 0;
    this.#startTimer();
    this.#submitted = false;
    return this.#getCurrentQuestion();
  }

  submitAnswer(questionId, selectedIndex) {
    if (this.#submitted) {
      return null;
    }
    this.#submitted = true;
    this.#clearTimer();

    const question = this.#questions.find((q) => q.id === questionId);
    if (!question) {
      return null;
    }

    const timeSpent = (Date.now() - this.#timerStart) / 1000;
    const timeRemaining = Math.max(0, question.timeLimit - timeSpent);
    const correct = selectedIndex === question.correctIndex;

    if (correct) {
      this.#streak++;
      this.#maxStreak = Math.max(this.#maxStreak, this.#streak);
      this.#correctCount++;
    } else {
      this.#streak = 0;
    }

    const difficultyMultiplier =
      question.difficulty === 'hard'
        ? 2
        : question.difficulty === 'medium'
          ? 1.5
          : 1;
    const basePoints = 100 * difficultyMultiplier;
    const timeBonus = correct
      ? Math.floor(
          basePoints * (timeRemaining / question.timeLimit) * 0.5,
        )
      : 0;
    const streakMultiplier = correct
      ? Math.min(1 + (this.#streak - 1) * 0.15, 2.5)
      : 1;
    const earnedPoints = correct
      ? Math.floor((basePoints + timeBonus) * streakMultiplier)
      : 0;

    this.#score += earnedPoints;
    this.#totalTime += timeSpent;

    const isLastQuestion = this.#currentIndex >= this.#questionOrder.length - 1;

    this.#answers.push({
      questionId: question.id,
      selectedIndex,
      correct,
      timeSpent: Math.round(timeSpent * 100) / 100,
    });

    return {
      correct,
      correctIndex: question.correctIndex,
      earnedPoints,
      timeBonus,
      streakBonus: correct ? (streakMultiplier - 1) * 100 : 0,
      streak: this.#streak,
      isLastQuestion,
    };
  }

  nextQuestion() {
    if (this.#currentIndex >= this.#questionOrder.length - 1) {
      return null;
    }
    this.#currentIndex++;
    this.#submitted = false;
    this.#startTimer();
    return this.#getCurrentQuestion();
  }

  getProgress() {
    const secondsLeft = this.getTimeRemaining();
    const totalAnswered = this.#answers.length;
    return {
      current: totalAnswered,
      total: this.#questionOrder.length,
      score: this.#score,
      streak: this.#streak,
      accuracy: totalAnswered > 0
        ? Math.round((this.#correctCount / totalAnswered) * 100)
        : 0,
      timeRemaining: secondsLeft,
    };
  }

  getFinalResults() {
    const totalAnswered = this.#answers.length;
    return {
      totalScore: this.#score,
      correctAnswers: this.#correctCount,
      totalQuestions: totalAnswered,
      accuracy: totalAnswered > 0
        ? Math.round((this.#correctCount / totalAnswered) * 100)
        : 0,
      maxStreak: this.#maxStreak,
      totalTime: Math.round(this.#totalTime * 100) / 100,
      answers: [...this.#answers],
    };
  }

  getTimeRemaining() {
    if (!this.#timerStart) return 0;
    const elapsed = (Date.now() - this.#timerStart) / 1000;
    return Math.max(0, Math.ceil(this.#timeLimit - elapsed));
  }

  isTimeUp() {
    if (this.#submitted) return false;
    if (this.getTimeRemaining() <= 0) {
      const question = this.#getCurrentQuestion();
      if (question) {
        this.submitAnswer(question.id, -1);
      }
      return true;
    }
    return false;
  }

  #filterQuestions() {
    let pool = [...this.#questions];
    if (this.#settings.category) {
      pool = pool.filter((q) => q.category === this.#settings.category);
    }
    if (this.#settings.difficulty) {
      pool = pool.filter((q) => q.difficulty === this.#settings.difficulty);
    }
    return pool;
  }

  #shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  #getCurrentQuestion() {
    if (
      this.#currentIndex < 0 ||
      this.#currentIndex >= this.#questionOrder.length
    ) {
      return null;
    }
    const q = this.#questions.find(
      (item) => item.id === this.#questionOrder[this.#currentIndex],
    );
    return q || null;
  }

  #startTimer() {
    const question = this.#getCurrentQuestion();
    if (!question) return;
    this.#timeLimit = question.timeLimit;
    this.#timerStart = Date.now();
  }

  #clearTimer() {
    if (this.#timerId) {
      clearTimeout(this.#timerId);
      this.#timerId = null;
    }
  }
}
