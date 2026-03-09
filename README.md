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
- GitHub Pages cannot run the Node signaling server, so a separate hosted backend is required for multiplayer.
- Configure the signaling API by opening the page with `?api=https://your-api-host/`, setting `<meta name="best-fighting-api-base" content="https://your-api-host/">`, or pasting the URL into the in-app API field and clicking **Save API URL** (stored in `localStorage`).
- When running on `github.io` without API configuration, the app blocks room actions and shows a setup message instead of attempting broken `/api/...` calls.
- Cross-origin signaling requests are enabled on the Node server (`OPTIONS` + CORS headers), so a separately hosted backend can be called from GitHub Pages.
