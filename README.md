# Hawk2

The home for **new** games. Hawk2 exists because [bparlette/Hawk](https://github.com/bparlette/Hawk) grew to ~4.9 GB — almost all of it git history from hundreds of game deploys — and GitHub pushes back on repositories that size. Rather than migrate working games and break their links, new games are built here and the existing catalogue stays where it is.

## The convention

- **New games live here**, one folder each: `games/<name>/`, served at `https://bparlette.github.io/Hawk2/games/<name>/`.
- **Existing Hawk games are NOT migrated.** Their URLs keep working untouched.
- **The catalogue stays in Hawk.** The demo page ([Brad's Demos](https://bparlette.github.io/Hawk/games/)) is the single hub for both repos. Nothing about how games are found or played changes — only where the files sit.

## Linking a Hawk2 game from the demo page (verified 2026-11-20, no code change needed)

The demo shell (`Hawk: brad-demos/shell.js`) loads a game by setting the player iframe's `src` directly to the registry entry's `path`, verbatim. Absolute URLs are already used in production — 21 of the 243 entries in `brad-demos/games.json` point at full `https://` URLs on other hosts.

- **`Hawk: brad-demos/games.json`** — add the game as a normal entry, with its `path` set to the full Hawk2 URL:

  ```json
  "path": "https://bparlette.github.io/Hawk2/games/<name>/"
  ```

- **`Hawk: games/index.html`** — add a plain list item linking to the same full URL (precedent: the "100 Retro Worlds" entry already links cross-repo to `bparlette.github.io/worlds/`).

Bonus: Hawk and Hawk2 are served from the same origin (`bparlette.github.io`), so the demo shell's keyboard injection, autostart and pause/resume hooks work for Hawk2 games exactly as they do for Hawk games.

## Deploy rules

- **Batched pushes to `main` only** — one push per finished change set, never a commit per file.
- **Text files** (HTML/JS/CSS/JSON/Markdown) go through the GitHub connector's disk route (`push-files --source-dir`), reading real files from disk.
- **Binaries never go through the connector** — it corrupts them. Images/audio/fonts are uploaded via the browser web-upload route, or referenced from where they already live (e.g. jsDelivr).
- After every push, read the files back and compare byte sizes before calling anything live; GitHub Pages can lag a few minutes behind a push.
