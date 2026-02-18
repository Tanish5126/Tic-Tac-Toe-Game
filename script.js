/* ===================================
   NEON TIC TAC TOE — game.js
=================================== */

// ---- CONSTANTS ----
const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]              // diagonals
];

const TIMER_MAX = 10;
const CPU_DELAY = 550;

// ---- STATE ----
let state = {
  mode: 'pvp',
  board: Array(9).fill(null),
  current: 'X',
  scores: { X: 0, O: 0, D: 0 },
  round: 1,
  locked: false,
  timerSecs: TIMER_MAX,
  timerInterval: null
};

// ---- DOM REFS ----
const screens = {
  start: document.getElementById('start-screen'),
  game:  document.getElementById('game-screen'),
  over:  document.getElementById('gameover-screen')
};
const grid         = document.getElementById('game-grid');
const turnIndicator= document.getElementById('turn-indicator');
const roundInfo    = document.getElementById('round-info');
const timerBar     = document.getElementById('timer-bar');
const scoreXEl     = document.getElementById('score-x');
const scoreOEl     = document.getElementById('score-o');
const winsXEl      = document.getElementById('wins-x');
const winsOEl      = document.getElementById('wins-o');
const drawsEl      = document.getElementById('draws');
const oLabel       = document.getElementById('o-label');

// ---- SCREEN NAVIGATION ----
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

// ---- EVENT LISTENERS ----

// Mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    state.mode = btn.dataset.mode;
    oLabel.textContent = state.mode === 'cpu' ? 'CPU' : 'Player O';
  });
});

document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('back-btn').addEventListener('click', () => {
  stopTimer();
  showScreen('start');
});

document.getElementById('restart-btn').addEventListener('click', resetBoard);

document.getElementById('next-round-btn').addEventListener('click', () => {
  state.round++;
  showScreen('game');
  resetBoard();
});

document.getElementById('menu-btn').addEventListener('click', () => {
  stopTimer();
  state.scores = { X: 0, O: 0, D: 0 };
  state.round = 1;
  updateScoreUI();
  showScreen('start');
});

// ---- GAME SETUP ----
function startGame() {
  state.scores = { X: 0, O: 0, D: 0 };
  state.round = 1;
  oLabel.textContent = state.mode === 'cpu' ? 'CPU' : 'Player O';
  showScreen('game');
  buildGrid();
  resetBoard();
}

function buildGrid() {
  grid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Cell ${i + 1}`);
    cell.dataset.index = i;
    cell.addEventListener('click', onCellClick);
    grid.appendChild(cell);
  }
}

function resetBoard() {
  state.board = Array(9).fill(null);
  state.current = 'X';
  state.locked = false;

  document.querySelectorAll('.cell').forEach(cell => {
    cell.className = 'cell';
    cell.innerHTML = '';
    cell.setAttribute('aria-label', `Cell ${+cell.dataset.index + 1}`);
  });

  roundInfo.textContent = `Round ${state.round}`;
  updateTurnUI();
  updateScoreUI();
  startTimer();

  if (state.mode === 'cpu' && state.current === 'O') {
    setTimeout(cpuMove, CPU_DELAY);
  }
}

// ---- CELL INTERACTION ----
function onCellClick(e) {
  if (state.locked) return;
  const idx = +e.currentTarget.dataset.index;
  if (state.board[idx]) return;
  playMove(idx, e.currentTarget);
}

function playMove(idx, cellEl) {
  if (!cellEl) cellEl = grid.children[idx];

  state.board[idx] = state.current;

  const sym = document.createElement('span');
  sym.className = 'cell-symbol';
  sym.textContent = state.current;

  cellEl.className = `cell taken ${state.current.toLowerCase()}`;
  cellEl.setAttribute('aria-label', `${state.current} at cell ${idx + 1}`);
  cellEl.appendChild(sym);
  addRipple(cellEl);

  const winner = checkWin();

  if (winner) {
    state.locked = true;
    stopTimer();
    state.scores[winner]++;
    highlightWin(winner);
    setTimeout(() => showResult(winner), 700);
    return;
  }

  if (state.board.every(Boolean)) {
    state.locked = true;
    stopTimer();
    state.scores.D++;
    grid.classList.add('shake');
    setTimeout(() => {
      grid.classList.remove('shake');
      showResult('D');
    }, 600);
    return;
  }

  state.current = state.current === 'X' ? 'O' : 'X';
  updateTurnUI();
  startTimer();

  if (state.mode === 'cpu' && state.current === 'O' && !state.locked) {
    state.locked = true;
    setTimeout(() => {
      state.locked = false;
      cpuMove();
    }, CPU_DELAY);
  }
}

// ---- CPU LOGIC ----
function cpuMove() {
  let move = findWinOrBlock('O');      // try to win
  if (move === -1) move = findWinOrBlock('X'); // try to block
  if (move === -1 && !state.board[4]) move = 4; // take center
  if (move === -1) {
    const empties = state.board
      .map((v, i) => (v ? -1 : i))
      .filter(i => i !== -1);
    move = empties[Math.floor(Math.random() * empties.length)];
  }
  if (move !== -1) playMove(move);
}

function findWinOrBlock(mark) {
  for (const [a, b, c] of WIN_COMBOS) {
    const line = [state.board[a], state.board[b], state.board[c]];
    const countMark = line.filter(v => v === mark).length;
    const countNull = line.filter(v => v === null).length;
    if (countMark === 2 && countNull === 1) {
      return [a, b, c][line.indexOf(null)];
    }
  }
  return -1;
}

// ---- WIN CHECK ----
function checkWin() {
  for (const [a, b, c] of WIN_COMBOS) {
    if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
      return state.board[a];
    }
  }
  return null;
}

function highlightWin(winner) {
  for (const [a, b, c] of WIN_COMBOS) {
    if (state.board[a] === winner && state.board[b] === winner && state.board[c] === winner) {
      [a, b, c].forEach((idx, delay) => {
        setTimeout(() => grid.children[idx].classList.add('win-cell'), delay * 80);
      });
      break;
    }
  }
}

// ---- RESULT SCREEN ----
function showResult(winner) {
  updateScoreUI();

  const icon  = document.getElementById('result-icon');
  const title = document.getElementById('result-title');
  const sub   = document.getElementById('result-sub');
  const oName = state.mode === 'cpu' ? 'CPU' : 'Player O';

  if (winner === 'X') {
    icon.textContent = 'X';
    icon.className   = 'result-icon x';
    title.textContent = 'Player X Wins!';
    sub.textContent   = 'X takes the round';
    spawnConfetti('#00c8ff');
  } else if (winner === 'O') {
    icon.textContent = 'O';
    icon.className   = 'result-icon o';
    title.textContent = `${oName} Wins!`;
    sub.textContent   = 'O takes the round';
    spawnConfetti('#0057ff');
  } else {
    icon.textContent = '—';
    icon.className   = 'result-icon draw';
    title.textContent = "It's a Draw!";
    sub.textContent   = 'No winner this round';
  }

  document.getElementById('final-x').textContent = state.scores.X;
  document.getElementById('final-o').textContent = state.scores.O;
  document.getElementById('final-d').textContent = state.scores.D;

  showScreen('over');
}

// ---- UI UPDATES ----
function updateTurnUI() {
  const oName = state.mode === 'cpu' ? 'CPU' : 'Player O';
  turnIndicator.className = `turn-indicator ${state.current.toLowerCase()}-turn`;
  turnIndicator.textContent = state.current === 'X'
    ? "Player X's turn"
    : `${oName}'s turn`;

  scoreXEl.classList.toggle('active-turn', state.current === 'X');
  scoreOEl.classList.toggle('active-turn', state.current === 'O');
}

function updateScoreUI() {
  winsXEl.textContent = state.scores.X;
  winsOEl.textContent = state.scores.O;
  drawsEl.textContent = state.scores.D;
}

// ---- TIMER ----
function startTimer() {
  stopTimer();
  state.timerSecs = TIMER_MAX;
  renderTimer();

  state.timerInterval = setInterval(() => {
    state.timerSecs--;
    renderTimer();

    if (state.timerSecs <= 0) {
      stopTimer();
      if (!state.locked) {
        // Auto-skip turn on timeout
        state.current = state.current === 'X' ? 'O' : 'X';
        updateTurnUI();
        startTimer();

        if (state.mode === 'cpu' && state.current === 'O') {
          state.locked = true;
          setTimeout(() => { state.locked = false; cpuMove(); }, CPU_DELAY);
        }
      }
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

function renderTimer() {
  const pct = (state.timerSecs / TIMER_MAX) * 100;
  timerBar.style.width = pct + '%';
  timerBar.classList.toggle('urgent', state.timerSecs <= 3);
}

// ---- RIPPLE EFFECT ----
function addRipple(el) {
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.cssText = 'width:80px;height:80px;left:50%;top:50%;margin:-40px 0 0 -40px;';
  el.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

// ---- CONFETTI ----
function spawnConfetti(color) {
  const container = document.getElementById('confetti');
  container.innerHTML = '';
  const shades = [color, '#ffffff', '#00c8ff', '#003050'];

  for (let i = 0; i < 55; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 4 + Math.random() * 7;
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      background: ${shades[Math.floor(Math.random() * shades.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${1.4 + Math.random() * 1.8}s;
      animation-delay: ${Math.random() * 0.4}s;
    `;
    container.appendChild(piece);
  }

  setTimeout(() => { container.innerHTML = ''; }, 3000);
}