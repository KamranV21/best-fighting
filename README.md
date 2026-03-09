# Best Fighting

Best Fighting is a browser-based 2D pixel-style oldschool fighting game inspired by arcade classics. The game now runs as an **offline-only local VS experience** with both players on the same machine.

## Features

- **Offline local multiplayer (2 players, same keyboard)**.
- **No online signaling or WebRTC required**.
- **3 playable fighters**:
  - Samir Mugimov
  - Isa Zeynalzade
  - Sadyg Babayev
- **Single arena**: Office Space stage.
- **Gameplay mechanics**:
  - Move forward/back
  - Jump
  - Crouch (sit)
  - Hand kick
  - Leg kick
  - Character-specific special combo shown in character select.
- **Victory rule**: first fighter to win **2 rounds** wins the match.

## Controls

### Player 1

- `A` - move left
- `D` - move right
- `W` - jump
- `S` - crouch
- `F` - hand kick
- `G` - leg kick

### Player 2

- `←` - move left
- `→` - move right
- `↑` - jump
- `↓` - crouch
- `Numpad 1` - hand kick
- `Numpad 2` - leg kick

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`, choose fighters for both players, and start the offline match.
