# vaultbreak-heist-01

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Agusstyo/vaultbreak-heist-01/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Agusstyo/vaultbreak-heist-01/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Vaultbreak** is a top-down 2D heist game that runs offline in a desktop browser from static files — no build step, no network. You are the thief crossing a guarded vault floor: guards sweep vision cones across the room, cameras watch the corridors, and every step toward the loot raises the tension. Grab the loot, slip past the patrols, and reach the getaway before the alarm meter fills.

## Run it

```sh
node serve.ts            # then open http://localhost:8080
# or serve game/ with any static file server and open index.html
```

Play with WASD / arrow keys. The hand-in program is `main.ts` (Node 22): `MAKEFUN_OUTPUT_DIR=out node main.ts` copies `game/` and `screenshots/` to `out/` and writes `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hh8nsv3m&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
