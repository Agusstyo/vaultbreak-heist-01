# vaultbreak-heist-01

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Agusstyo/vaultbreak-heist-01/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Agusstyo/vaultbreak-heist-01/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Vaultbreak** is a top-down 2D heist game that runs offline in a desktop browser from static files — no build step, no network. You are the thief crossing a guarded vault floor: guards sweep vision cones across the room, cameras watch the corridors, and every step toward the loot raises the tension. Grab the loot, slip past the patrols, and reach the getaway before the alarm meter fills.

## How to play

You slip in through the lobby, cross the gallery, and lift the **Sunburst Diamond** from the vault — then run for the getaway van at the bottom left. Side loot (gold bars, paintings) adds to your score, and a time bonus rewards a fast, clean job.

- **Move:** WASD or arrow keys. **Sneak:** hold Shift — slower, quieter, harder to spot.
- **Toss a coin:** click anywhere within reach. The nearest guard walks over to investigate the clink. You carry 3 coins.
- **EMP pulse:** press `2`. Knocks out every camera near you for 8 seconds. You carry 2 charges.
- **Disguise:** press `3`. For 6 seconds the guards take you for staff — unless you get very close. 25-second cooldown; cameras see through it.
- **Pause:** `P` or Esc. **Mute:** `M`. **Start / retry:** Enter or click.

## The floor

Three ways through every wall: the doors, the **vent shaft** along the top (dark, and guards never look up there), and the service corridor under the vault. Shadows hide you — suspicion rises far slower inside them. Guards patrol fixed routes and pause to scan; a `?` fills over a guard's head as suspicion builds, and a `!` means the chase is on. Cameras sweep their arcs and feed the **alarm meter** at the top of the screen: at 100 the whole crew hunts you until you break line of sight for a few seconds. Get caught and the run ends — the cause is shown, so the next try is fairer.

## Run it

```sh
node serve.ts            # then open http://localhost:8080
# or serve game/ with any static file server and open index.html
```

Play with WASD / arrow keys. The hand-in program is `main.ts` (Node 22): `MAKEFUN_OUTPUT_DIR=out node main.ts` copies `game/` and `screenshots/` to `out/` and writes `out/dossier.json`.

## Under the hood

Plain static files under `game/`, no library and no build step: `src/config.js` (tuning + floor plan), `src/world.js` (patrols, vision, alarm, tools), `src/render.js` (raycast vision cones, HUD, screens), `src/input.js`, `src/audio.js` (synthesised WebAudio), `src/shots.js` (the four staged screenshot scenes), `src/main.js` (boot + fixed-step loop). Screenshots are real renders staged with `?shot=cover|stealth|alarm|getaway`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hh8nsv3m&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
