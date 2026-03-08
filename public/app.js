const fighters = [
  { id: 'samir', name: 'Samir Mugimov', color: '#7c5f4c', shirt: '#f2f2ef', combo: ['down', 'right', 'hand'], comboText: '↓ → + F' },
  { id: 'isa', name: 'Isa Zeynalzade', color: '#b98262', shirt: '#d9e6f8', combo: ['left', 'right', 'leg'], comboText: '← → + G' },
  { id: 'sadyg', name: 'Sadyg Babayev', color: '#8a6449', shirt: '#f7f7f7', combo: ['down', 'down', 'hand'], comboText: '↓ ↓ + F' }
];

const statusEl = document.getElementById('status');
const menuEl = document.getElementById('menu');
const lobbyEl = document.getElementById('lobby');
const gamePanelEl = document.getElementById('gamePanel');
const fighterCardsEl = document.getElementById('fighterCards');
const comboHintEl = document.getElementById('comboHint');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomCodeLabel = document.getElementById('roomCodeLabel');
const lobbyStatus = document.getElementById('lobbyStatus');
const announcementEl = document.getElementById('announcement');
const timerEl = document.getElementById('roundTimer');
const p1Name = document.getElementById('p1Name');
const p2Name = document.getElementById('p2Name');
const p1Hp = document.getElementById('p1Hp');
const p2Hp = document.getElementById('p2Hp');
const p1Wins = document.getElementById('p1Wins');
const p2Wins = document.getElementById('p2Wins');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  peer: null,
  conn: null,
  role: null,
  roomId: null,
  selectedFighter: fighters[0],
  remoteFighterId: null,
  inputs: [makeInputState(), makeInputState()],
  localActions: [],
  comboBuffer: [],
  game: makeInitialGameState(),
  localIndex: 0,
  started: false,
  netTimer: 0,
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

function randomRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function renderFighterCards() {
  fighterCardsEl.innerHTML = '';
  fighters.forEach((fighter) => {
    const card = document.createElement('article');
    card.className = `fighter ${fighter.id === state.selectedFighter.id ? 'selected' : ''}`;
    card.innerHTML = `<canvas class="avatar" width="96" height="96"></canvas><h3>${fighter.name}</h3><p>Special: <strong>${fighter.comboText}</strong></p>`;
    card.onclick = () => {
      state.selectedFighter = fighter;
      comboHintEl.textContent = `Special combo for ${fighter.name}: ${fighter.comboText}`;
      if (state.conn?.open) sendNet({ type: 'fighter-selected', fighter: fighter.id });
      renderFighterCards();
      refreshLobbyText();
    };
    fighterCardsEl.appendChild(card);
    drawAvatar(card.querySelector('canvas'), fighter);
  });
  comboHintEl.textContent = `Special combo for ${state.selectedFighter.name}: ${state.selectedFighter.comboText}`;
}

function drawAvatar(canvasEl, fighter) {
  const c = canvasEl.getContext('2d');
  c.fillStyle = '#2d3244'; c.fillRect(0, 0, 96, 96);
  c.fillStyle = fighter.shirt; c.fillRect(26, 58, 44, 28);
  c.fillStyle = fighter.color; c.fillRect(30, 22, 36, 34);
  c.fillStyle = '#1f140f'; c.fillRect(28, 18, 40, 10); c.fillRect(34, 46, 28, 4);
  c.fillStyle = '#fff'; c.fillRect(38, 34, 4, 4); c.fillRect(54, 34, 4, 4);
}

function beginAsHost() {
  state.role = 'host';
  state.roomId = randomRoomCode();
  state.peer = new Peer(`bestfighting-${state.roomId.toLowerCase()}`);
  statusEl.textContent = 'Initializing host peer...';

  state.peer.on('open', () => {
    roomCodeLabel.textContent = state.roomId;
    menuEl.classList.add('hidden');
    lobbyEl.classList.remove('hidden');
    refreshLobbyText();
    statusEl.textContent = 'Room created. Send room code to second player.';
  });

  state.peer.on('connection', (conn) => {
    if (state.conn?.open) {
      conn.close();
      return;
    }
    setupConnection(conn);
  });

  state.peer.on('error', (err) => {
    statusEl.textContent = `Host error: ${err.type || err.message}`;
  });
}

function beginAsGuest(roomId) {
  state.role = 'guest';
  state.roomId = roomId;
  state.peer = new Peer();
  statusEl.textContent = 'Initializing guest peer...';

  state.peer.on('open', () => {
    const conn = state.peer.connect(`bestfighting-${roomId.toLowerCase()}`);
    setupConnection(conn);
    roomCodeLabel.textContent = roomId;
    menuEl.classList.add('hidden');
    lobbyEl.classList.remove('hidden');
    refreshLobbyText();
  });

  state.peer.on('error', (err) => {
    statusEl.textContent = `Guest error: ${err.type || err.message}`;
  });
}

function setupConnection(conn) {
  state.conn = conn;
  conn.on('open', () => {
    statusEl.textContent = 'Peer connected.';
    sendNet({ type: 'fighter-selected', fighter: state.selectedFighter.id });
    refreshLobbyText();
  });

  conn.on('data', (msg) => {
    if (msg.type === 'fighter-selected') {
      state.remoteFighterId = msg.fighter;
      refreshLobbyText();
      if (bothReady() && state.role === 'host' && !state.started) {
        sendNet({ type: 'start-match', hostFighter: state.selectedFighter.id, guestFighter: state.remoteFighterId });
        startGame(state.selectedFighter.id, state.remoteFighterId);
      }
    }

    if (msg.type === 'start-match' && state.role === 'guest') {
      startGame(msg.hostFighter, msg.guestFighter);
    }

    if (msg.type === 'input' && state.role === 'host') {
      state.inputs[1] = msg.input;
      if (msg.action) state.localActions.push({ player: 1, kind: msg.action });
    }

    if (msg.type === 'snapshot' && state.role === 'guest') {
      state.game = msg.game;
      renderGame();
    }
  });

  conn.on('close', () => {
    statusEl.textContent = 'Peer disconnected.';
    state.started = false;
    gamePanelEl.classList.add('hidden');
    lobbyEl.classList.remove('hidden');
    refreshLobbyText();
  });
}

function sendNet(payload) {
  if (state.conn?.open) state.conn.send(payload);
}

function bothReady() {
  return Boolean(state.conn?.open && state.selectedFighter?.id && state.remoteFighterId);
}

function refreshLobbyText() {
  if (!state.conn?.open) {
    lobbyStatus.textContent = 'Waiting for second player...';
    return;
  }
  if (!bothReady()) {
    lobbyStatus.textContent = 'Connected. Waiting for fighter lock-in...';
    return;
  }
  lobbyStatus.textContent = 'Both fighters selected. Match starts now.';
}

function startGame(hostFighterId, guestFighterId) {
  const hostFighter = fighters.find((f) => f.id === hostFighterId) || fighters[0];
  const guestFighter = fighters.find((f) => f.id === guestFighterId) || fighters[1];
  state.game = makeInitialGameState();
  state.game.players[0].fighter = hostFighter;
  state.game.players[1].fighter = guestFighter;
  p1Name.textContent = hostFighter.name;
  p2Name.textContent = guestFighter.name;
  state.localIndex = state.role === 'host' ? 0 : 1;
  lobbyEl.classList.add('hidden');
  gamePanelEl.classList.remove('hidden');
  state.started = true;
  state.lastTs = performance.now();
  announcementEl.textContent = 'Fight!';
}

function updateHost(dt) {
  const g = state.game;
  if (g.gameOver) return;

  if (!g.roundOver) {
    g.roundTime = Math.max(0, g.roundTime - dt);
    if (g.roundTime <= 0) finishRound(g.players[0].hp >= g.players[1].hp ? 0 : 1);
  }

  for (let i = 0; i < 2; i += 1) {
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

  while (state.localActions.length) {
    const action = state.localActions.shift();
    triggerAttack(action.player, action.kind);
  }
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
  for (let i = 0; i < 10; i += 1) ctx.fillRect(i * 100, 50, 80, 24);
  ctx.fillStyle = '#556286';
  ctx.fillRect(0, 130, canvas.width, 60);
  ctx.fillStyle = '#2c3348';
  ctx.fillRect(0, 430, canvas.width, 110);
  ctx.fillStyle = '#3d495f';
  for (let i = 0; i < canvas.width; i += 40) ctx.fillRect(i, 430, 20, 110);

  g.players.forEach((p) => {
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
  });
}

function tick(ts) {
  const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
  state.lastTs = ts;

  if (state.started) {
    if (state.role === 'host') {
      updateHost(dt);
      state.netTimer += dt;
      if (state.netTimer >= 0.05) {
        state.netTimer = 0;
        sendNet({ type: 'snapshot', game: state.game });
      }
    }
    renderGame();
  }
  requestAnimationFrame(tick);
}

function addAction(kind) {
  state.localActions.push({ player: state.localIndex, kind });
  if (state.role === 'guest') sendNet({ type: 'input', input: state.inputs[state.localIndex], action: kind });
}

function pushCombo(token) {
  state.comboBuffer.push(token);
  if (state.comboBuffer.length > 6) state.comboBuffer.shift();
  const needed = state.selectedFighter.combo;
  const tail = state.comboBuffer.slice(-needed.length);
  if (needed.every((v, i) => tail[i] === v)) {
    addAction('special');
    announcementEl.textContent = `${state.selectedFighter.name} special!`;
    state.comboBuffer = [];
  }
}

function bindControls() {
  const keyMap = { KeyA: ['left', 'left'], KeyD: ['right', 'right'], KeyW: ['jump', 'up'], KeyS: ['crouch', 'down'] };
  document.addEventListener('keydown', (e) => {
    if (!state.started) return;
    if (keyMap[e.code]) {
      state.inputs[state.localIndex][keyMap[e.code][0]] = true;
      pushCombo(keyMap[e.code][1]);
    }
    if (e.code === 'KeyF') { addAction('hand'); pushCombo('hand'); }
    if (e.code === 'KeyG') { addAction('leg'); pushCombo('leg'); }
    if (state.role === 'guest') sendNet({ type: 'input', input: state.inputs[state.localIndex] });
  });

  document.addEventListener('keyup', (e) => {
    if (!keyMap[e.code]) return;
    state.inputs[state.localIndex][keyMap[e.code][0]] = false;
    if (state.role === 'guest') sendNet({ type: 'input', input: state.inputs[state.localIndex] });
  });
}

document.getElementById('createRoomBtn').onclick = () => {
  if (state.peer) return;
  beginAsHost();
};

document.getElementById('joinRoomBtn').onclick = () => {
  const roomId = roomCodeInput.value.trim().toUpperCase();
  if (!roomId) {
    statusEl.textContent = 'Enter room ID first.';
    return;
  }
  if (state.peer) return;
  beginAsGuest(roomId);
};

renderFighterCards();
bindControls();
requestAnimationFrame(tick);
statusEl.textContent = 'Ready. Create a room or join with a room code.';
