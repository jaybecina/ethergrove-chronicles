#!/usr/bin/env node
// Runs the project checks one by one with live progress: `node scripts/checks.mjs commit|push`.
// In a terminal each step shows a spinner and elapsed time, and its output is printed only if it
// fails. Long steps (e2e) stream their own live progress. Outside a terminal it prints plain lines.
import { spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

/** @typedef {{ name: string, cmd: string, live?: boolean }} Step */

/** @type {Record<string, Step[]>} */
const PLANS = {
  commit: [
    { name: 'Typecheck', cmd: 'pnpm typecheck' },
    { name: 'Unit tests', cmd: 'pnpm test' },
  ],
  push: [
    { name: 'Lint', cmd: 'pnpm lint' },
    { name: 'Typecheck', cmd: 'pnpm typecheck' },
    { name: 'Unit tests + coverage', cmd: 'pnpm test:coverage' },
    { name: 'Production build', cmd: 'pnpm build' },
    { name: 'No debug hook in build', cmd: 'pnpm --filter web check:build' },
    { name: 'Bundle size budget', cmd: 'pnpm --filter web size' },
    {
      name: 'E2E: Chromium + WebKit',
      cmd: 'CI=true pnpm --filter web e2e --project=chromium --project=webkit',
      live: true,
    },
  ],
};

const tty = process.stdout.isTTY === true && !process.env.NO_COLOR;
const paint = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = paint('32');
const red = paint('31');
const cyan = paint('36');
const dim = paint('2');
const bold = paint('1');
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** "850ms", "4.2s" or "2m 05s". */
function duration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

/** Runs one shell command; resolves with its exit code and (unless live) its captured output. */
/** Latest non-empty output line of the running step, shown dimmed beside its spinner. */
let current = '';

function run(cmd, live) {
  current = '';
  return new Promise((resolve) => {
    const child = spawn(cmd, {
      shell: true,
      stdio: live ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: tty ? '1' : '0' },
    });
    let out = '';
    const take = (d) => {
      out += d;
      const lines = stripVTControlCharacters(String(d)).split(/[\r\n]+/);
      const last = lines.map((l) => l.trim()).findLast((l) => l !== '');
      if (last) current = last;
    };
    child.stdout?.on('data', take);
    child.stderr?.on('data', take);
    child.on('close', (code) => {
      resolve({ code: code ?? 1, out });
    });
  });
}

async function main(planName) {
  const plan = PLANS[planName];
  if (!plan) {
    console.error(`Unknown plan "${planName}". Use one of: ${Object.keys(PLANS).join(', ')}`);
    process.exit(2);
  }
  const total = plan.length;
  const started = performance.now();
  console.log(
    bold(`\n${planName === 'push' ? 'Pre-push' : 'Pre-commit'} checks (${total} steps)\n`),
  );

  for (const [i, step] of plan.entries()) {
    const label = `${dim(`[${i + 1}/${total}]`)} ${step.name}`;
    const t0 = performance.now();
    let timer;
    if (step.live) {
      console.log(`${cyan('▶')} ${label} ${dim('(live output below)')}\n`);
    } else if (tty) {
      let f = 0;
      const draw = () => {
        const frame = FRAMES[f++ % FRAMES.length] ?? '';
        const head = `${frame} [${i + 1}/${total}] ${step.name} ${duration(performance.now() - t0)}`;
        // Fit the activity line to the terminal so the spinner never wraps onto a new row.
        const room = (process.stdout.columns || 100) - head.length - 4;
        const now = room > 10 && current ? `  › ${current.slice(0, room)}` : '';
        process.stdout.write(
          `\r\x1b[2K${cyan(frame)} ${label} ${dim(duration(performance.now() - t0))}${dim(now)}`,
        );
      };
      draw();
      timer = setInterval(draw, 80);
    } else {
      console.log(`… ${label}`);
    }

    const { code, out } = await run(step.cmd, step.live === true);
    clearInterval(timer);
    const took = dim(duration(performance.now() - t0));
    if (tty && !step.live) process.stdout.write('\r\x1b[2K');
    if (step.live) console.log('');

    if (code !== 0) {
      console.log(`${red('✗')} ${label} ${took}`);
      if (!step.live) console.log(`\n${out.trimEnd()}\n`);
      console.log(red(bold(`✗ Failed at step ${i + 1}/${total}: ${step.name}`)));
      console.log(dim(`  Re-run it alone with: ${step.cmd}\n`));
      process.exit(code);
    }
    console.log(`${green('✓')} ${label} ${took}`);
  }
  console.log(
    green(bold(`\n✓ All ${total} checks passed in ${duration(performance.now() - started)}\n`)),
  );
}

await main(process.argv[2] ?? 'push');
