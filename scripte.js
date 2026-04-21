/* ============================================================
   MATHQUIZ — script.js
   100 niveaux de calcul mental progressif
   ============================================================ */

// ─── ÉTAT GLOBAL ─────────────────────────────────────────────
const state = {
  level:      1,
  score:      0,
  lives:      3,
  currentQ:   0,
  correct:    0,
  questions:  [],
  mode:       'classique',     // classique | chrono | qcm
  startLevel: 1,
  timerInt:   null,
  timeLeft:   100,

  // Persistance localStorage
  bestLevel:  parseInt(localStorage.getItem('mq_best')   || '1'),
  gamesPlayed:parseInt(localStorage.getItem('mq_games')  || '0'),
  bestScore:  parseInt(localStorage.getItem('mq_bscore') || '0'),
};

// ─── CONFIGURATION DES NIVEAUX ───────────────────────────────
function getLevelConfig(lvl) {
  if (lvl <=  10) return { ops:['+'],           maxA:10,  maxB:10,  label:'Addition',              hint:'',                  qs:5, time:15 };
  if (lvl <=  20) return { ops:['-'],           maxA:20,  maxB:10,  label:'Soustraction',           hint:'',                  qs:5, time:15 };
  if (lvl <=  30) return { ops:['+','-'],       maxA:25,  maxB:25,  label:'Addition & Soustraction', hint:'',                  qs:5, time:13 };
  if (lvl <=  40) return { ops:['×'],           maxA:10,  maxB:10,  label:'Multiplication',          hint:'Tables 1–10',       qs:5, time:12 };
  if (lvl <=  50) return { ops:['÷'],           maxA:10,  maxB:10,  label:'Division exacte',         hint:'Résultat entier',   qs:5, time:12 };
  if (lvl <=  60) return { ops:['+','-','×'],   maxA:50,  maxB:20,  label:'Opérations mixtes',       hint:'',                  qs:6, time:11 };
  if (lvl <=  70) return { ops:['×','÷'],       maxA:12,  maxB:12,  label:'Mult. & Division',        hint:'Tables avancées',   qs:6, time:10 };
  if (lvl <=  80) return { ops:['²'],           maxA:20,  maxB:0,   label:'Carrés',                  hint:'a²',                qs:6, time:10 };
  if (lvl <=  90) return { ops:['+','-','×','÷'],maxA:100,maxB:50,  label:'Calcul avancé',           hint:'Concentre-toi !',   qs:7, time:10 };
  return                  { ops:['chain'],       maxA:50,  maxB:15,  label:'Calcul en chaîne',        hint:'3 opérations',      qs:7, time:12 };
}

// ─── GÉNÉRATION D'UNE QUESTION ───────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(lvl) {
  const cfg = getLevelConfig(lvl);
  const op  = cfg.ops[Math.floor(Math.random() * cfg.ops.length)];
  let a, b, answer, text;

  if (op === '÷') {
    b = rand(2, cfg.maxB || 10);
    a = b * rand(1, 10);
    answer = a / b;
    text = `${a} ÷ ${b} = ?`;

  } else if (op === '×') {
    a = rand(2, cfg.maxA);
    b = rand(2, cfg.maxB || 10);
    answer = a * b;
    text = `${a} × ${b} = ?`;

  } else if (op === '²') {
    a = rand(2, cfg.maxA);
    answer = a * a;
    text = `${a}² = ?`;

  } else if (op === 'chain') {
    const simpleOps = ['+', '-', '×'];
    const o1 = simpleOps[Math.floor(Math.random() * 2)]; // +/-
    const o2 = simpleOps[Math.floor(Math.random() * 3)];
    a = rand(2, cfg.maxA);
    b = rand(2, cfg.maxB);
    const c = rand(2, 10);
    let mid = o1 === '+' ? a + b : a - b;
    answer  = o2 === '+' ? mid + c : o2 === '-' ? mid - c : mid * c;
    text = `${a} ${o1} ${b} ${o2} ${c} = ?`;

  } else { // + ou -
    a = rand(2, cfg.maxA);
    b = rand(1, cfg.maxB);
    if (op === '-' && b > a) [a, b] = [b, a]; // éviter résultats négatifs
    answer = op === '+' ? a + b : a - b;
    text = `${a} ${op} ${b} = ?`;
  }

  return { text, answer, label: cfg.label, hint: cfg.hint || '', time: cfg.time };
}

// ─── OPTIONS QCM ─────────────────────────────────────────────
function generateQCMOptions(answer) {
  const opts = new Set([answer]);
  let attempts = 0;
  while (opts.size < 4 && attempts < 50) {
    attempts++;
    const spread = Math.max(3, Math.floor(Math.abs(answer) * 0.25) + 2);
    const delta  = rand(1, spread);
    opts.add(answer + (Math.random() > 0.5 ? delta : -delta));
  }
  return [...opts].sort(() => Math.random() - 0.5);
}

// ─── NAVIGATION ÉCRANS ───────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── MENU ────────────────────────────────────────────────────
function updateMenuStats() {
  document.getElementById('stat-best-level').textContent = state.bestLevel;
  document.getElementById('stat-games').textContent      = state.gamesPlayed;
  document.getElementById('stat-best-score').textContent = state.bestScore;
}

// ─── VIES ────────────────────────────────────────────────────
function renderLives() {
  const row = document.getElementById('lives-row');
  row.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.className = 'heart' + (i >= state.lives ? ' lost' : '');
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="#f05f7a" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>`;
    row.appendChild(span);
  }
}

// ─── LANCER UN NIVEAU ────────────────────────────────────────
function startLevel() {
  clearTimer();
  const cfg = getLevelConfig(state.level);
  state.questions = Array.from({ length: cfg.qs }, () => generateQuestion(state.level));
  state.currentQ  = 0;
  state.correct   = 0;
  showScreen('screen-game');
  renderLives();
  renderQuestion();
}

// ─── AFFICHER UNE QUESTION ───────────────────────────────────
function renderQuestion() {
  clearTimer();
  const q = state.questions[state.currentQ];
  const totalQ = state.questions.length;

  // Header
  document.getElementById('level-tag').textContent  = `Niveau ${state.level}`;
  document.getElementById('score-tag').textContent  = `${state.score} pts`;

  // Meta
  document.getElementById('meta-cat').textContent  = q.label;
  document.getElementById('meta-qnum').textContent = `${state.currentQ + 1} / ${totalQ}`;

  // Progress
  document.getElementById('progress-fill').style.width =
    `${(state.currentQ / totalQ) * 100}%`;

  // Timer bar reset
  document.getElementById('timer-fill').style.width = '100%';
  document.getElementById('timer-fill').style.background = 'var(--green)';

  // Question
  document.getElementById('q-hint').textContent = q.hint;
  document.getElementById('q-text').textContent = q.text;

  // Reset card state
  const card = document.getElementById('question-card');
  card.classList.remove('correct', 'wrong');

  // Feedback reset
  const fb = document.getElementById('feedback-msg');
  fb.textContent = '';
  fb.className = 'feedback-msg';

  // Bouton suivant
  document.getElementById('next-btn').style.display = 'none';

  // Zone de réponse
  buildAnswerZone(q);

  // Timer chrono
  if (state.mode === 'chrono') startTimer(q.time);
}

// ─── ZONE DE RÉPONSE ─────────────────────────────────────────
function buildAnswerZone(q) {
  const zone = document.getElementById('answer-zone');
  zone.innerHTML = '';

  if (state.mode === 'qcm') {
    const grid = document.createElement('div');
    grid.className = 'qcm-grid';

    generateQCMOptions(q.answer).forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'qcm-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleQCM(btn, opt, q.answer, grid));
      grid.appendChild(btn);
    });

    zone.appendChild(grid);

  } else {
    const row = document.createElement('div');
    row.className = 'input-row';

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'answer-input';
    inp.placeholder = '?';
    inp.id = 'ans-input';
    inp.autocomplete = 'off';

    const btn = document.createElement('button');
    btn.className = 'btn-submit';
    btn.textContent = 'Valider';

    btn.addEventListener('click', () => handleInput(inp, q.answer));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleInput(inp, q.answer);
    });

    row.appendChild(inp);
    row.appendChild(btn);
    zone.appendChild(row);

    setTimeout(() => inp.focus(), 60);
  }
}

// ─── VÉRIFICATION RÉPONSE (input) ───────────────────────────
function handleInput(inp, answer) {
  clearTimer();
  const val = parseInt(inp.value, 10);
  if (isNaN(val)) { inp.focus(); return; }

  inp.disabled = true;
  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) submitBtn.disabled = true;

  resolveAnswer(val === answer, answer);
}

// ─── VÉRIFICATION RÉPONSE (QCM) ─────────────────────────────
function handleQCM(btn, chosen, answer, grid) {
  clearTimer();
  grid.querySelectorAll('.qcm-btn').forEach(b => {
    b.disabled = true;
    if (parseInt(b.textContent, 10) === answer) b.classList.add('correct');
  });
  if (chosen !== answer) btn.classList.add('wrong');

  resolveAnswer(chosen === answer, answer);
}

// ─── RÉSOLUTION (correct / incorrect) ───────────────────────
function resolveAnswer(isCorrect, answer) {
  const card = document.getElementById('question-card');
  const fb   = document.getElementById('feedback-msg');

  if (isCorrect) {
    const bonus = state.mode === 'chrono' ? Math.round(state.timeLeft / 10) * 5 : 0;
    const pts   = 10 + (state.level * 2) + bonus;
    state.score  += pts;
    state.correct++;
    card.classList.add('correct');
    fb.textContent = `✓ Correct !  +${pts} pts`;
    fb.className = 'feedback-msg ok';
  } else {
    state.lives--;
    renderLives();
    card.classList.add('wrong');
    fb.textContent = `✗ Incorrect — réponse : ${answer}`;
    fb.className = 'feedback-msg err';
    if (state.lives <= 0) { setTimeout(endLevel, 1400); return; }
  }

  document.getElementById('next-btn').style.display = 'block';
  document.getElementById('score-tag').textContent = `${state.score} pts`;
}

// ─── CHRONO ──────────────────────────────────────────────────
function startTimer(seconds) {
  state.timeLeft = 100;
  const fill = document.getElementById('timer-fill');
  const step = 100 / (seconds * 10);

  state.timerInt = setInterval(() => {
    state.timeLeft -= step;
    const pct = Math.max(0, state.timeLeft);
    fill.style.width = pct + '%';
    fill.style.background = pct < 25 ? 'var(--red)' : pct < 50 ? 'var(--amber)' : 'var(--green)';

    if (state.timeLeft <= 0) {
      clearTimer();
      timeUp();
    }
  }, 100);
}

function clearTimer() {
  if (state.timerInt) {
    clearInterval(state.timerInt);
    state.timerInt = null;
  }
}

function timeUp() {
  const q = state.questions[state.currentQ];
  state.lives--;
  renderLives();

  const fb = document.getElementById('feedback-msg');
  fb.textContent = `⏱ Temps écoulé ! Réponse : ${q.answer}`;
  fb.className = 'feedback-msg err';

  // Désactiver les inputs
  document.querySelectorAll('.qcm-btn, .answer-input, .btn-submit').forEach(el => {
    el.disabled = true;
    if (el.classList.contains('qcm-btn')) {
      if (parseInt(el.textContent, 10) === q.answer) el.classList.add('correct');
    }
  });

  if (state.lives <= 0) {
    setTimeout(endLevel, 1400);
    return;
  }
  document.getElementById('next-btn').style.display = 'block';
}

// ─── FIN D'UN NIVEAU ─────────────────────────────────────────
function endLevel() {
  clearTimer();
  const totalQ    = state.questions.length;
  const accuracy  = Math.round((state.correct / totalQ) * 100);
  const passed    = accuracy >= 60 && state.lives > 0;

  // Sauvegardes
  state.gamesPlayed++;
  localStorage.setItem('mq_games', state.gamesPlayed);

  if (passed && state.level >= state.bestLevel) {
    state.bestLevel = state.level + 1;
    localStorage.setItem('mq_best', state.bestLevel);
  }
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem('mq_bscore', state.bestScore);
  }

  // Résultats
  document.getElementById('r-score').textContent    = state.score;
  document.getElementById('r-correct').textContent  = `${state.correct}/${totalQ}`;
  document.getElementById('r-accuracy').textContent = accuracy + '%';

  if (passed) {
    document.getElementById('result-emoji').textContent = accuracy === 100 ? '🏆' : '🎉';
    document.getElementById('result-title').textContent = `Niveau ${state.level} réussi !`;
    document.getElementById('result-sub').textContent   = `Précision ${accuracy}% — tu passes au niveau ${state.level + 1}`;
    document.getElementById('continue-btn').textContent = `Niveau ${state.level + 1} →`;
    state.level++;
  } else {
    document.getElementById('result-emoji').textContent = '😤';
    document.getElementById('result-title').textContent = 'Niveau échoué';
    document.getElementById('result-sub').textContent   = `Il faut au moins 60% de bonnes réponses. (${accuracy}%)`;
    document.getElementById('continue-btn').textContent = `Réessayer le niveau ${state.level} →`;
  }

  state.lives = 3;
  showScreen('screen-result');
}

// ─── ÉVÉNEMENTS ──────────────────────────────────────────────

// Sélection du mode
document.querySelectorAll('#mode-row .mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#mode-row .mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
  });
});

// Sélecteur de niveau
let startLvl = 1;
document.getElementById('lvl-up').addEventListener('click', () => {
  if (startLvl < 100) { startLvl++; document.getElementById('lvl-display').textContent = startLvl; }
});
document.getElementById('lvl-down').addEventListener('click', () => {
  if (startLvl > 1)  { startLvl--; document.getElementById('lvl-display').textContent = startLvl; }
});

// Démarrer
document.getElementById('start-btn').addEventListener('click', () => {
  state.score  = 0;
  state.lives  = 3;
  state.level  = startLvl;
  startLevel();
});

// Retour menu depuis le jeu
document.getElementById('back-btn').addEventListener('click', () => {
  clearTimer();
  updateMenuStats();
  showScreen('screen-menu');
});

// Suivant
document.getElementById('next-btn').addEventListener('click', () => {
  state.currentQ++;
  if (state.currentQ >= state.questions.length) endLevel();
  else renderQuestion();
});

// Écran résultat
document.getElementById('continue-btn').addEventListener('click', () => {
  startLevel();
});
document.getElementById('menu-btn').addEventListener('click', () => {
  updateMenuStats();
  showScreen('screen-menu');
});

// ─── INIT ────────────────────────────────────────────────────
updateMenuStats();
showScreen('screen-menu');