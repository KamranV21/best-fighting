# Best Fighting

Best Fighting is a browser-based 2D pixel-style oldschool fighting game inspired by arcade classics. It supports online 1v1 play via WebRTC data channels in the browser.

## Features

- **Online multiplayer (2 players)** using WebRTC.
- **Room flow**: create room -> share code -> second player joins -> both choose fighters -> match starts.
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

Since this is now a static app, you can serve `public/` with any static file server.

Example with Python:

```bash
cd public
python3 -m http.server 3000
```

Open two browser tabs/windows at `http://localhost:3000`:

1. Player 1 creates room and selects fighter.
2. Player 2 joins room by code and selects fighter.
3. Match starts automatically.

## GitHub Pages deployment

This repository includes a GitHub Actions workflow that deploys the `public/` folder to GitHub Pages when you push to `main`.

After enabling Pages in repo settings (source: GitHub Actions), the game will be hosted at:

`https://<your-username>.github.io/<repo-name>/`
