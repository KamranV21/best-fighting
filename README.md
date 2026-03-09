# Best Fighting

Best Fighting is a browser-based 2D pixel-style oldschool fighting game inspired by arcade classics. It supports online 1v1 play via WebRTC data channels, with room creation and signaling handled by a lightweight Node signaling API.

## Features

- **Online multiplayer (2 players)** using WebRTC data channels.
- **Room flow**: create room -> join room -> both choose fighters -> match starts.
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

- `A` - move left
- `D` - move right
- `W` - jump
- `S` - crouch
- `F` - hand kick
- `G` - leg kick

## Run locally

```bash
npm install
npm start
```

Open two browser tabs/windows at `http://localhost:3000`:

1. Player 1 creates room and selects fighter.
2. Player 2 joins room by code and selects fighter.
3. Match starts automatically after WebRTC peer connection is ready.

## Notes

- The host client runs authoritative simulation and streams snapshots to guest over WebRTC.
- Signaling uses REST endpoints with short polling relayed by `server.js`.
- For GitHub Pages deployments, point the client to a hosted signaling API using `?api=https://your-api-host/` once; the game stores this value in `localStorage` for later visits.
