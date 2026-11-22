// Vaultbreak's hand-in program (Node 22, standard library only). The game is the
// plain static files under game/ — index.html and its ES modules, no library and
// no network request — and this program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy a directory from the repo into the output, creating parents as needed. */
function handIn(name) {
  const from = join(repoRoot, name);
  const to = join(outDir, name);
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
handIn('game');
handIn('screenshots');

// The scorer refuses more than four screenshots, so count them before writing.
const shotCount = existsSync(join(repoRoot, 'screenshots'))
  ? readdirSync(join(repoRoot, 'screenshots')).filter((name) => !name.startsWith('.')).length
  : 0;
if (shotCount > 4) throw new Error(`too many screenshots: ${shotCount} (at most 4)`);

// The dossier is what the judge reads, so it must be exactly what the vendored
// library writes from the handed-in files. The caps below mirror the scorer's
// own (reference/gate.json): the text cap shapes the dossier's bytes, and the
// rest refuse an entry the scorer would refuse — more than 4 screenshots or
// one over 256 KiB, more than 993 files in game/ or 48 MiB of game files in
// all, or a path under game/ over 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
