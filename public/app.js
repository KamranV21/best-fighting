const fighters = [
  { id: 'samir', name: 'Samir Mugimov', color: '#7c5f4c', shirt: '#f2f2ef', combo: ['down', 'right', 'hand'], comboText: '↓ → + F' },
  { id: 'isa', name: 'Isa Zeynalzade', color: '#b98262', shirt: '#d9e6f8', combo: ['left', 'right', 'leg'], comboText: '← → + G' },
  { id: 'sadyg', name: 'Sadyg Babayev', color: '#8a6449', shirt: '#f7f7f7', combo: ['down', 'down', 'hand'], comboText: '↓ ↓ + F' }
];

const menuEl = document.getElementById('menu');
const gamePanelEl = document.getElementById('gamePanel');
const p1FighterCardsEl = document.getElementById('p1FighterCards');
const p2FighterCardsEl = document.getElementById('p2FighterCards');
const p1ComboHintEl = document.getElementById('p1ComboHint');
const p2ComboHintEl = document.getElementById('p2ComboHint');
const announcementEl = document.getElementById('announcement');
const timerEl = document.getElementById('roundTimer');
const p1Name = document.getElementById('p1Name');
const p2Name = document.getElementById('p2Name');
const p1Hp = document.getElementById('p1Hp');
const p2Hp = document.getElementById('p2Hp');
const p1Wins = document.getElementById('p1Wins');
const p2Wins = document.getElementById('p2Wins');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  selectedFighters: [fighters[0], fighters[1]],
  inputs: [makeInputState(), makeInputState()],
  actionQueues: [[], []],
  comboBuffers: [[], []],
  game: makeInitialGameState(),
  started: false,
  lastTs: performance.now()
};

function makeInputState() {
  return { left: false, right: false, jump: false, crouch: false };
}

function makeInitialGameState() {
  return {
    roundTime: 60,
    roundOver: false,
    gameOver: false,
    players: [
      { x: 280, y: 390, vx: 0, vy: 0, hp: 100, wins: 0, attacking: 0, crouch: false, fighter: fighters[0], facing: 1 },
      { x: 680, y: 390, vx: 0, vy: 0, hp: 100, wins: 0, attacking: 0, crouch: false, fighter: fighters[1], facing: -1 }
    ]
  };
}

function drawAvatar(canvasEl, fighter) {
  const c = canvasEl.getContext('2d');
  c.fillStyle = '#2d3244';
  c.fillRect(0, 0, 96, 96);
  c.fillStyle = fighter.shirt;
  c.fillRect(26, 58, 44, 28);
  c.fillStyle = fighter.color;
  c.fillRect(30, 22, 36, 34);
  c.fillStyle = '#1f140f';
  c.fillRect(28, 18, 40, 10);
  c.fillRect(34, 46, 28, 4);
  c.fillStyle = '#fff';
  c.fillRect(38, 34, 4, 4);
  c.fillRect(54, 34, 4, 4);
}

function renderFighterCards(containerEl, playerIndex) {
  containerEl.innerHTML = '';
  fighters.forEach((fighter) => {
    const card = document.createElement('article');
    card.className = `fighter ${fighter.id === state.selectedFighters[playerIndex].id ? 'selected' : ''}`;
    card.innerHTML = `<canvas class="avatar" width="96" height="96"></canvas><h3>${fighter.name}</h3><p>Special: <strong>${fighter.comboText}</strong></p>`;
    card.onclick = () => {
      state.selectedFighters[playerIndex] = fighter;
      renderSelections();
    };
    containerEl.appendChild(card);
    drawAvatar(card.querySelector('canvas'), fighter);
  });
}

function renderSelections() {
  renderFighterCards(p1FighterCardsEl, 0);
  renderFighterCards(p2FighterCardsEl, 1);
  p1ComboHintEl.textContent = `P1 combo (${state.selectedFighters[0].name}): ${state.selectedFighters[0].comboText}`;
  p2ComboHintEl.textContent = `P2 combo (${state.selectedFighters[1].name}): ${state.selectedFighters[1].comboText}`;
}

function startLocalMatch() {
  state.game = makeInitialGameState();
  state.game.players[0].fighter = state.selectedFighters[0];
  state.game.players[1].fighter = state.selectedFighters[1];
  state.inputs = [makeInputState(), makeInputState()];
  state.actionQueues = [[], []];
  state.comboBuffers = [[], []];
  p1Name.textContent = state.selectedFighters[0].name;
  p2Name.textContent = state.selectedFighters[1].name;
  menuEl.classList.add('hidden');
  gamePanelEl.classList.remove('hidden');
  state.started = true;
  announcementEl.textContent = 'Fight!';
  statusEl.textContent = 'Offline local match running.';
}

function triggerAttack(playerIndex, kind) {
  const me = state.game.players[playerIndex];
  const enemy = state.game.players[playerIndex === 0 ? 1 : 0];
  if (state.game.roundOver) return;
  me.attacking = kind === 'special' ? 0.5 : 0.25;
  const reach = kind === 'special' ? 120 : kind === 'leg' ? 90 : 70;
  const damage = kind === 'special' ? 22 : kind === 'leg' ? 12 : 9;
  if (Math.abs(me.x - enemy.x) < reach && Math.abs(me.y - enemy.y) < 90) {
    enemy.hp = Math.max(0, enemy.hp - damage);
    if (enemy.hp === 0) finishRound(playerIndex);
  }
}

function finishRound(winner) {
  const g = state.game;
  if (g.roundOver) return;
  g.roundOver = true;
  g.players[winner].wins += 1;
  announcementEl.textContent = `${g.players[winner].fighter.name} wins round!`;
  if (g.players[winner].wins >= 2) {
    g.gameOver = true;
    announcementEl.textContent = `${g.players[winner].fighter.name} wins BEST FIGHTING!`;
    return;
  }
  setTimeout(() => {
    g.players[0].x = 280;
    g.players[1].x = 680;
    g.players[0].y = 390;
    g.players[1].y = 390;
    g.players[0].hp = 100;
    g.players[1].hp = 100;
    g.roundTime = 60;
    g.roundOver = false;
    announcementEl.textContent = 'Fight!';
  }, 2000);
}

function updateGame(dt) {
  const g = state.game;
  if (g.gameOver) return;
  if (!g.roundOver) {
    g.roundTime = Math.max(0, g.roundTime - dt);
    if (g.roundTime <= 0) finishRound(g.players[0].hp >= g.players[1].hp ? 0 : 1);
  }

  for (let i = 0; i < 2; i++) {
    const p = g.players[i];
    const input = state.inputs[i];
    const speed = input.crouch ? 80 : 170;
    p.vx = input.left ? -speed : input.right ? speed : 0;
    if (input.jump && p.y >= 390) p.vy = -410;
    p.vy += 980 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.crouch = input.crouch;
    p.x = Math.max(70, Math.min(890, p.x));
    if (p.y > 390) {
      p.y = 390;
      p.vy = 0;
    }
    p.attacking = Math.max(0, p.attacking - dt);
  }

  const p1 = g.players[0];
  const p2 = g.players[1];
  p1.facing = p1.x < p2.x ? 1 : -1;
  p2.facing = -p1.facing;

  while (state.actionQueues[0].length) triggerAttack(0, state.actionQueues[0].shift());
  while (state.actionQueues[1].length) triggerAttack(1, state.actionQueues[1].shift());
}

function renderGame() {
  const g = state.game;
  p1Hp.style.width = `${g.players[0].hp}%`;
  p2Hp.style.width = `${g.players[1].hp}%`;
  p1Wins.textContent = `Wins: ${g.players[0].wins}`;
  p2Wins.textContent = `Wins: ${g.players[1].wins}`;
  timerEl.textContent = Math.ceil(g.roundTime);

  ctx.fillStyle = '#20293c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3f4e6d';
  for (let i = 0; i < 10; i++) ctx.fillRect(i * 100, 50, 80, 24);
  ctx.fillStyle = '#556286';
  ctx.fillRect(0, 130, canvas.width, 60);
  ctx.fillStyle = '#2c3348';
  ctx.fillRect(0, 430, canvas.width, 110);
  ctx.fillStyle = '#3d495f';
  for (let i = 0; i < canvas.width; i += 40) ctx.fillRect(i, 430, 20, 110);
  g.players.forEach(drawFighter);
}

function drawFighter(p) {
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y));
  if (p.facing < 0) ctx.scale(-1, 1);
  if (p.attacking > 0) {
    ctx.fillStyle = 'rgba(255,196,0,0.4)';
    ctx.fillRect(16, -62, 34, 22);
  }
  ctx.fillStyle = p.fighter.shirt;
  ctx.fillRect(-18, -52, 36, 44);
  ctx.fillStyle = p.fighter.color;
  ctx.fillRect(-16, -86, 32, 30);
  ctx.fillStyle = '#21150f';
  ctx.fillRect(-18, -90, 36, 10);
  ctx.fillStyle = '#140f0d';
  ctx.fillRect(-16, -8, 12, 24);
  ctx.fillRect(4, -8, 12, 24);
  if (p.crouch) ctx.fillRect(-18, 2, 36, 10);
  ctx.restore();
}

function queueAction(playerIndex, kind) {
  state.actionQueues[playerIndex].push(kind);
}

function pushCombo(playerIndex, token) {
  const fighter = state.selectedFighters[playerIndex];
  const buffer = state.comboBuffers[playerIndex];
  buffer.push(token);
  if (buffer.length > 6) buffer.shift();
  const tail = buffer.slice(-fighter.combo.length);
  if (fighter.combo.every((v, i) => tail[i] === v)) {
    queueAction(playerIndex, 'special');
    announcementEl.textContent = `${fighter.name} special!`;
    state.comboBuffers[playerIndex] = [];
  }
}

function bindControls() {
  const keyMap = {
    KeyA: [0, 'left', 'left'],
    KeyD: [0, 'right', 'right'],
    KeyW: [0, 'jump', 'up'],
    KeyS: [0, 'crouch', 'down'],
    ArrowLeft: [1, 'left', 'left'],
    ArrowRight: [1, 'right', 'right'],
    ArrowUp: [1, 'jump', 'up'],
    ArrowDown: [1, 'crouch', 'down']
  };

  document.addEventListener('keydown', (e) => {
    if (!state.started) return;
    if (keyMap[e.code]) {
      const [playerIndex, stateKey, comboToken] = keyMap[e.code];
      state.inputs[playerIndex][stateKey] = true;
      pushCombo(playerIndex, comboToken);
    }

    if (e.code === 'KeyF') {
      queueAction(0, 'hand');
      pushCombo(0, 'hand');
    }
    if (e.code === 'KeyG') {
      queueAction(0, 'leg');
      pushCombo(0, 'leg');
    }
    if (e.code === 'Numpad1') {
      queueAction(1, 'hand');
      pushCombo(1, 'hand');
    }
    if (e.code === 'Numpad2') {
      queueAction(1, 'leg');
      pushCombo(1, 'leg');
    }
  });

  document.addEventListener('keyup', (e) => {
    if (keyMap[e.code]) {
      const [playerIndex, stateKey] = keyMap[e.code];
      state.inputs[playerIndex][stateKey] = false;
    }
  });
}

function tick(ts) {
  const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
  state.lastTs = ts;
  if (state.started) {
    updateGame(dt);
    renderGame();
  }
  requestAnimationFrame(tick);
}

document.getElementById('startOfflineBtn').onclick = startLocalMatch;
document.getElementById('backToMenuBtn').onclick = () => {
  state.started = false;
  gamePanelEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  statusEl.textContent = 'Offline mode ready.';
};

renderSelections();
bindControls();
statusEl.textContent = 'Offline mode ready. Choose fighters and start local match.';
requestAnimationFrame(tick);
