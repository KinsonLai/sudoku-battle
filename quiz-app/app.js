import { questions } from './questions.js';
import { QuizEngine } from './quiz-engine.js';
import { Scoreboard } from './scoreboard.js';
import { checkAchievements, getAllAchievements } from './achievements.js';
import { renderProgressChart, renderTrendChart, renderCategoryChart } from './charts.js';

const state = {
  currentScreen: 'home',
  settings: { category: 'all', difficulty: 'all', questionCount: 10 },
  engine: null,
  timerInterval: null,
  timerRemaining: 0,
  timerTotal: 15,
  scoreboard: new Scoreboard(),
  pendingAction: null,
  lastResult: null
};

const dom = {
  screens: {},
  btnStartQuiz: null,
  btnViewScoreboard: null,
  btnViewAchievements: null,
  btnBeginQuiz: null,
  btnBackHome: null,
  btnHome: null,
  btnPlayAgain: null,
  btnHomeFromResults: null,
  btnSaveResult: null,
  categorySelect: null,
  difficultySelect: null,
  countSlider: null,
  countDisplay: null,
  questionText: null,
  questionIndicator: null,
  categoryBadge: null,
  difficultyBadge: null,
  scoreValue: null,
  streakValue: null,
  timeValue: null,
  timerBar: null,
  optionButtons: null,
  optionsContainer: null,
  resultScore: null,
  resultAccuracy: null,
  resultStreak: null,
  resultTime: null,
  breakdownList: null,
  recordsTbody: null,
  noRecords: null,
  scoreSearch: null,
  sortSelect: null,
  scoreStats: null,
  achievementsGrid: null,
  modal: null,
  modalTitle: null,
  modalMessage: null,
  modalCancel: null,
  modalConfirm: null,
  tabNav: null
};

function cacheDom() {
  const qs = (s, p) => (p || document).querySelector(s);
  const qsa = (s, p) => (p || document).querySelectorAll(s);

  dom.screens = {
    home: qs('#home-screen'),
    setup: qs('#setup-screen'),
    quiz: qs('#quiz-screen'),
    results: qs('#results-screen'),
    scoreboard: qs('#scoreboard-screen'),
    achievements: qs('#achievements-screen')
  };

  dom.btnStartQuiz = qs('#btn-start-quiz');
  dom.btnViewScoreboard = qs('#btn-view-scoreboard');
  dom.btnViewAchievements = qs('#btn-view-achievements');
  dom.btnBeginQuiz = qs('#btn-begin-quiz');
  dom.btnBackHome = qs('#btn-back-home');
  dom.btnHome = qs('#btn-home');
  dom.btnPlayAgain = qs('#btn-play-again');
  dom.btnHomeFromResults = qs('#btn-home-from-results');
  dom.btnSaveResult = qs('#btn-save-result');
  dom.categorySelect = qs('#category-select');
  dom.difficultySelect = qs('#difficulty-select');
  dom.countSlider = qs('#count-slider');
  dom.countDisplay = qs('#count-display');
  dom.questionText = qs('#question-text');
  dom.questionIndicator = qs('#question-indicator');
  dom.categoryBadge = qs('#category-badge');
  dom.difficultyBadge = qs('#difficulty-badge');
  dom.scoreValue = qs('#score-value');
  dom.streakValue = qs('#streak-value');
  dom.timeValue = qs('#time-value');
  dom.timerBar = qs('#timer-bar');
  dom.optionsContainer = qs('#options-container');
  dom.resultScore = qs('#result-score');
  dom.resultAccuracy = qs('#result-accuracy');
  dom.resultStreak = qs('#result-streak');
  dom.resultTime = qs('#result-time');
  dom.breakdownList = qs('#breakdown-list');
  dom.recordsTbody = qs('#records-tbody');
  dom.noRecords = qs('#no-records');
  dom.scoreSearch = qs('#score-search');
  dom.sortSelect = qs('#sort-select');
  dom.scoreStats = qs('#score-stats');
  dom.achievementsGrid = qs('#achievements-grid');
  dom.modal = qs('#confirm-modal');
  dom.modalTitle = qs('#modal-title');
  dom.modalMessage = qs('#modal-message');
  dom.modalCancel = qs('#modal-cancel');
  dom.modalConfirm = qs('#modal-confirm');
  dom.tabNav = qs('#tab-nav');
}

function showScreen(screen) {
  state.currentScreen = screen;
  Object.values(dom.screens).forEach(s => s.classList.remove('active'));
  dom.screens[screen].classList.add('active');

  const isRecord = screen === 'scoreboard' || screen === 'achievements';
  dom.tabNav.classList.toggle('hidden', !isRecord);
  dom.btnHome.classList.toggle('hidden', !isRecord);

  if (screen === 'scoreboard') {
    dom.tabNav.querySelector('[data-tab="scoreboard-screen"]').classList.add('active');
    dom.tabNav.querySelector('[data-tab="achievements-screen"]').classList.remove('active');
  } else if (screen === 'achievements') {
    dom.tabNav.querySelector('[data-tab="achievements-screen"]').classList.add('active');
    dom.tabNav.querySelector('[data-tab="scoreboard-screen"]').classList.remove('active');
  }

  if (screen === 'setup') startSetup();
  if (screen === 'scoreboard') renderScoreboard();
  if (screen === 'achievements') renderAchievements();
}

function startSetup() {
  const categories = [...new Set(questions.map(q => q.category))].sort();
  dom.categorySelect.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    dom.categorySelect.appendChild(opt);
  });

  const difficulties = [...new Set(questions.map(q => q.difficulty))].sort();
  dom.difficultySelect.innerHTML = '<option value="all">All Difficulties</option>';
  difficulties.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    dom.difficultySelect.appendChild(opt);
  });

  dom.categorySelect.value = state.settings.category;
  dom.difficultySelect.value = state.settings.difficulty;
  dom.countSlider.value = state.settings.questionCount;
  dom.countDisplay.textContent = state.settings.questionCount;
}

function startQuiz() {
  state.settings.category = dom.categorySelect.value;
  state.settings.difficulty = dom.difficultySelect.value;
  state.settings.questionCount = parseInt(dom.countSlider.value, 10);

  let pool = [...questions];
  if (state.settings.category !== 'all') {
    pool = pool.filter(q => q.category === state.settings.category);
  }
  if (state.settings.difficulty !== 'all') {
    pool = pool.filter(q => q.difficulty === state.settings.difficulty);
  }

  if (pool.length === 0) {
    alert('No questions match the selected filters. Please adjust your settings.');
    return;
  }

  state.engine = new QuizEngine({
    questions: pool,
    questionCount: Math.min(state.settings.questionCount, pool.length),
    timePerQuestion: 15
  });

  state.engine.start();

  dom.optionButtons = [...dom.optionsContainer.querySelectorAll('.option-btn')];
  showScreen('quiz');
  showCurrentQuestion();
  startTimer();
}

function showCurrentQuestion() {
  if (!state.engine || state.engine.isFinished()) return;

  const q = state.engine.getCurrentQuestion();
  if (!q) {
    endQuiz();
    return;
  }

  const progress = state.engine.getProgress();
  dom.questionIndicator.textContent = `Question ${progress.current} / ${progress.total}`;
  dom.questionText.textContent = q.question;
  dom.categoryBadge.textContent = q.category;
  dom.categoryBadge.style.display = '';
  dom.difficultyBadge.textContent = q.difficulty;
  dom.difficultyBadge.style.display = '';
  dom.scoreValue.textContent = state.engine.getScore();
  dom.streakValue.innerHTML = `&#128293; ${state.engine.getStreak()}`;

  dom.optionButtons.forEach((btn, i) => {
    btn.textContent = q.options[i] || '';
    btn.classList.remove('correct', 'wrong', 'disabled');
    btn.style.display = '';
    btn.disabled = false;
  });

  if (q.options.length < 4) {
    for (let i = q.options.length; i < 4; i++) {
      dom.optionButtons[i].style.display = 'none';
    }
  }
}

function selectOption(index) {
  if (!state.engine) return;

  dom.optionButtons.forEach(btn => btn.classList.add('disabled'));

  const result = state.engine.submitAnswer(index);
  const chosenBtn = dom.optionButtons[index];

  if (result.correct) {
    chosenBtn.classList.add('correct');
  } else {
    chosenBtn.classList.add('wrong');
    const correctIndex = state.engine.getCurrentQuestion().correctIndex;
    dom.optionButtons[correctIndex].classList.add('correct');
  }

  dom.scoreValue.textContent = state.engine.getScore();
  dom.streakValue.innerHTML = `&#128293; ${state.engine.getStreak()}`;

  state.timerRemaining = state.timerTotal;
  updateTimerBar();
  clearInterval(state.timerInterval);

  setTimeout(() => {
    if (state.engine.isFinished()) {
      endQuiz();
    } else {
      showCurrentQuestion();
      startTimer();
    }
  }, 800);
}

function startTimer() {
  state.timerRemaining = state.timerTotal;
  state.timerTotal = state.engine ? 15 : state.timerTotal;
  updateTimerBar();

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(handleTimerTick, 100);
}

function handleTimerTick() {
  state.timerRemaining -= 0.1;
  updateTimerBar();

  if (state.timerRemaining <= 0) {
    clearInterval(state.timerInterval);
    dom.optionButtons.forEach(btn => btn.classList.add('disabled'));
    const correctIndex = state.engine.getCurrentQuestion().correctIndex;
    dom.optionButtons[correctIndex].classList.add('correct');

    const result = state.engine.submitAnswer(-1);
    dom.scoreValue.textContent = state.engine.getScore();
    dom.streakValue.innerHTML = `&#128293; ${state.engine.getStreak()}`;

    setTimeout(() => {
      if (state.engine.isFinished()) {
        endQuiz();
      } else {
        showCurrentQuestion();
        startTimer();
      }
    }, 800);
  }
}

function updateTimerBar() {
  const pct = (state.timerRemaining / state.timerTotal) * 100;
  dom.timerBar.style.width = pct + '%';
  dom.timeValue.textContent = Math.max(0, Math.ceil(state.timerRemaining));

  dom.timerBar.classList.remove('warning', 'danger');
  if (pct <= 25) {
    dom.timerBar.classList.add('danger');
  } else if (pct <= 50) {
    dom.timerBar.classList.add('warning');
  }
}

function endQuiz() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;

  if (!state.engine) return;

  const stats = state.engine.getStats();
  state.lastResult = {
    date: new Date().toISOString(),
    category: state.settings.category,
    difficulty: state.settings.difficulty,
    score: stats.score,
    accuracy: stats.accuracy,
    totalTime: stats.totalTime,
    streak: stats.bestStreak,
    totalQuestions: stats.totalQuestions,
    correctCount: stats.correctCount,
    breakdown: stats.breakdown || []
  };

  dom.resultScore.textContent = stats.score;
  dom.resultAccuracy.textContent = Math.round(stats.accuracy) + '%';
  dom.resultStreak.textContent = stats.bestStreak;
  dom.resultTime.textContent = Math.round(stats.totalTime / 1000) + 's';

  dom.breakdownList.innerHTML = '';
  if (state.lastResult.breakdown.length > 0) {
    state.lastResult.breakdown.forEach(item => {
      const div = document.createElement('div');
      div.className = 'breakdown-item';
      const statusIcon = item.correct ? '&#9989;' : '&#10060;';
      div.innerHTML = `
        <span class="b-status">${statusIcon}</span>
        <span class="b-question">${escapeHtml(item.question)}</span>
        <span class="b-time">${item.time}s</span>
      `;
      dom.breakdownList.appendChild(div);
    });
  } else {
    dom.breakdownList.innerHTML = '<div class="empty-state">No breakdown data available.</div>';
  }

  showScreen('results');
}

function saveResult() {
  if (!state.lastResult) return;

  state.scoreboard.addRecord({
    date: state.lastResult.date,
    category: state.lastResult.category,
    difficulty: state.lastResult.difficulty,
    score: state.lastResult.score,
    accuracy: state.lastResult.accuracy,
    time: state.lastResult.totalTime,
    totalQuestions: state.lastResult.totalQuestions,
    correctCount: state.lastResult.correctCount,
    streak: state.lastResult.streak
  });

  dom.btnSaveResult.disabled = true;
  dom.btnSaveResult.textContent = 'Saved!';
  checkAchievements(state.scoreboard);

  setTimeout(() => {
    dom.btnSaveResult.disabled = false;
    dom.btnSaveResult.textContent = 'Save to Scoreboard';
  }, 2000);
}

function renderScoreboard() {
  const records = state.scoreboard.getRecords();
  const searchTerm = dom.scoreSearch.value.toLowerCase().trim();
  const sortBy = dom.sortSelect.value;

  let filtered = [...records];

  if (searchTerm) {
    filtered = filtered.filter(r =>
      r.category.toLowerCase().includes(searchTerm) ||
      r.difficulty.toLowerCase().includes(searchTerm)
    );
  }

  filtered.sort(sortFn(sortBy));

  dom.recordsTbody.innerHTML = '';
  dom.noRecords.classList.toggle('hidden', filtered.length > 0);

  if (filtered.length === 0 && records.length > 0) {
    dom.noRecords.textContent = 'No records match your filters.';
  } else if (records.length === 0) {
    dom.noRecords.textContent = 'No records yet. Complete a quiz and save your result!';
  }

  filtered.forEach((record, idx) => {
    const tr = document.createElement('tr');
    const dateStr = new Date(record.date).toLocaleDateString();
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${escapeHtml(record.category)}</td>
      <td>${escapeHtml(record.difficulty)}</td>
      <td>${record.score}</td>
      <td>${Math.round(record.accuracy)}%</td>
      <td>${formatTime(record.time)}</td>
      <td><button class="btn btn-danger btn-sm delete-record" data-id="${record.id}">Delete</button></td>
    `;
    dom.recordsTbody.appendChild(tr);
  });

  renderScoreStats(records);
  renderCharts(records);
}

function renderScoreStats(records) {
  if (records.length === 0) {
    dom.scoreStats.innerHTML = '';
    return;
  }

  const total = records.length;
  const avgScore = Math.round(records.reduce((s, r) => s + r.score, 0) / total);
  const avgAccuracy = Math.round(records.reduce((s, r) => s + r.accuracy, 0) / total);
  const bestScore = Math.max(...records.map(r => r.score));

  dom.scoreStats.innerHTML = `
    <div class="stat-item"><span>Total Quizzes</span><span>${total}</span></div>
    <div class="stat-item"><span>Avg Score</span><span>${avgScore}</span></div>
    <div class="stat-item"><span>Avg Accuracy</span><span>${avgAccuracy}%</span></div>
    <div class="stat-item"><span>Best Score</span><span>${bestScore}</span></div>
  `;
}

function renderCharts(records) {
  const last10 = records.slice(-10).map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: r.score
  }));

  const accuracyData = records.slice(-10).map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    accuracy: Math.round(r.accuracy)
  }));

  const catCounts = {};
  records.forEach(r => {
    catCounts[r.category] = (catCounts[r.category] || 0) + 1;
  });

  if (last10.length > 0) {
    renderProgressChart('progress-chart', last10);
    renderTrendChart('trend-chart', accuracyData);
  }

  if (Object.keys(catCounts).length > 0) {
    renderCategoryChart('category-chart', catCounts);
  }
}

function sortFn(sortBy) {
  const map = {
    'date-desc': (a, b) => new Date(b.date) - new Date(a.date),
    'date-asc': (a, b) => new Date(a.date) - new Date(b.date),
    'score-desc': (a, b) => b.score - a.score,
    'score-asc': (a, b) => a.score - b.score,
    'accuracy-desc': (a, b) => b.accuracy - a.accuracy,
    'accuracy-asc': (a, b) => a.accuracy - b.accuracy
  };
  return map[sortBy] || map['date-desc'];
}

function applyFilters() {
  renderScoreboard();
}

function deleteRecord(id) {
  showConfirmModal(
    'Delete Record',
    'Are you sure you want to delete this record? This cannot be undone.',
    () => {
      state.scoreboard.deleteRecord(id);
      renderScoreboard();
    }
  );
}

function clearAll() {
  const records = state.scoreboard.getRecords();
  if (records.length === 0) {
    alert('No records to clear.');
    return;
  }

  showConfirmModal(
    'Clear All Records',
    `Are you sure you want to delete all ${records.length} records? This cannot be undone.`,
    () => {
      state.scoreboard.clearAll();
      renderScoreboard();
    }
  );
}

function exportData(format) {
  const records = state.scoreboard.getRecords();
  if (records.length === 0) {
    alert('No records to export.');
    return;
  }

  if (format === 'csv') {
    const headers = ['Date', 'Category', 'Difficulty', 'Score', 'Accuracy', 'Time'];
    const rows = records.map(r => [
      new Date(r.date).toISOString(),
      r.category,
      r.difficulty,
      r.score,
      Math.round(r.accuracy) + '%',
      formatTime(r.time)
    ]);
    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
    ).join('\n');
    downloadFile('quiz-records.csv', csvContent, 'text/csv');
  } else if (format === 'json') {
    const jsonContent = JSON.stringify(records, null, 2);
    downloadFile('quiz-records.json', jsonContent, 'application/json');
  }
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderAchievements() {
  const allAchievements = getAllAchievements();
  const earned = checkAchievements(state.scoreboard) || [];

  dom.achievementsGrid.innerHTML = '';

  allAchievements.forEach(ach => {
    const isEarned = earned.some(e => e.id === ach.id);
    const div = document.createElement('div');
    div.className = 'achievement-badge ' + (isEarned ? 'earned' : 'unearned');
    div.innerHTML = isEarned
      ? `<span class="ach-icon">${ach.icon || '&#127942;'}</span><span class="ach-name">${escapeHtml(ach.name)}</span>`
      : `<span class="ach-locked">&#128274;</span><span class="ach-name">${escapeHtml(ach.name)}</span>`;
    dom.achievementsGrid.appendChild(div);
  });

  const records = state.scoreboard.getRecords();
  const catCounts = {};
  records.forEach(r => {
    catCounts[r.category] = (catCounts[r.category] || 0) + 1;
  });
  if (Object.keys(catCounts).length > 0) {
    renderCategoryChart('category-chart', catCounts);
  }
}

function showConfirmModal(title, message, onConfirm) {
  dom.modalTitle.textContent = title;
  dom.modalMessage.textContent = message;
  dom.modal.classList.remove('hidden');
  state.pendingAction = onConfirm;
}

function hideConfirmModal() {
  dom.modal.classList.add('hidden');
  state.pendingAction = null;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + 'm ' + sec + 's';
}

function bindEvents() {
  dom.btnStartQuiz.addEventListener('click', () => showScreen('setup'));
  dom.btnViewScoreboard.addEventListener('click', () => showScreen('scoreboard'));
  dom.btnViewAchievements.addEventListener('click', () => showScreen('achievements'));
  dom.btnBeginQuiz.addEventListener('click', startQuiz);
  dom.btnBackHome.addEventListener('click', () => showScreen('home'));
  dom.btnHome.addEventListener('click', () => showScreen('home'));
  dom.btnPlayAgain.addEventListener('click', () => showScreen('setup'));
  dom.btnHomeFromResults.addEventListener('click', () => showScreen('home'));
  dom.btnSaveResult.addEventListener('click', saveResult);
  dom.btnClearAll.addEventListener('click', clearAll);

  dom.countSlider.addEventListener('input', () => {
    dom.countDisplay.textContent = dom.countSlider.value;
  });

  dom.optionsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.option-btn');
    if (!btn || btn.classList.contains('disabled')) return;
    const index = parseInt(btn.dataset.index, 10);
    selectOption(index);
  });

  dom.scoreSearch.addEventListener('input', applyFilters);
  dom.sortSelect.addEventListener('change', applyFilters);

  dom.recordsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-record');
    if (!btn) return;
    const id = btn.dataset.id;
    deleteRecord(id);
  });

  document.getElementById('btn-export-csv').addEventListener('click', () => exportData('csv'));
  document.getElementById('btn-export-json').addEventListener('click', () => exportData('json'));

  dom.tabNav.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;
    const screenId = tabBtn.dataset.tab;
    if (screenId === 'scoreboard-screen') showScreen('scoreboard');
    if (screenId === 'achievements-screen') showScreen('achievements');
  });

  dom.modalCancel.addEventListener('click', hideConfirmModal);
  dom.modalConfirm.addEventListener('click', () => {
    if (state.pendingAction) {
      state.pendingAction();
    }
    hideConfirmModal();
  });

  dom.modal.querySelector('.modal-overlay').addEventListener('click', hideConfirmModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideConfirmModal();
  });
}

function init() {
  cacheDom();
  bindEvents();
  showScreen('home');
}

document.addEventListener('DOMContentLoaded', init);
