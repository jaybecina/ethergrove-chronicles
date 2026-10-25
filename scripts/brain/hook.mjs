#!/usr/bin/env node
// Claude Code hook entry for the second-brain automation (decision 0006). Wired in .claude/settings.json:
//   node scripts/brain/hook.mjs session-start | prompt | post-tool | stop | session-end
// Reads the hook's JSON from stdin. Any error exits 0 silently: memory upkeep must never break a session.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import {
  emptyState,
  graphStale,
  matchNotes,
  newPaths,
  parsePorcelain,
  promptContext,
  promptKeywords,
  recordChanges,
  sessionContext,
  staleInbox,
  stopDecision,
} from './brainHooks.mjs';
import { refreshGraph } from './refreshGraph.mjs';

/** @typedef {import('./brainHooks.mjs').BrainState} BrainState */

const GRAPH_LINES = 12;

/** @param {string} path */
const readOrNull = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/** @param {string} root @param {string[]} args */
const git = (root, args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

/** Repo-relative paths with uncommitted changes, untracked files included. */
function dirtyPaths(/** @type {string} */ root) {
  return parsePorcelain(git(root, ['status', '--porcelain=v1', '-uall', '-z']));
}

/** Markdown notes under brain/ worth matching against a prompt, with repo-relative paths. */
function brainNotes(/** @type {string} */ dir, /** @type {string} */ root) {
  if (!existsSync(dir)) return [];
  return (
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
      // MEMORY.md is already in context from session start; the inbox README is boilerplate.
      .filter((f) => f.endsWith('.md') && f !== 'MEMORY.md' && f !== join('inbox', 'README.md'))
      .map((f) => ({
        path: relative(root, join(dir, f)),
        text: readFileSync(join(dir, f), 'utf8'),
      }))
  );
}

/** The first node lines of a small `graphify query`, or null when it fails or finds nothing. */
function graphHints(/** @type {string} */ root, /** @type {string[]} */ keywords) {
  try {
    const out = execFileSync(
      'graphify',
      ['query', keywords.slice(0, 8).join(' '), '--budget', '350'],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    const nodes = out
      .split('\n')
      .filter((l) => l.startsWith('NODE '))
      .slice(0, GRAPH_LINES);
    return nodes.length > 0 ? nodes.join('\n') : null;
  } catch {
    return null;
  }
}

/** Local date as YYYY-MM-DD, matching brain/sessions/ file names. */
function today() {
  const d = new Date();
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function main() {
  const event = process.argv[2];
  /** @type {Record<string, unknown>} */
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const root = process.env.CLAUDE_PROJECT_DIR ?? String(input.cwd ?? process.cwd());
  const sessionId = String(input.session_id ?? 'default').replace(/[^\w-]/g, '_');
  const stateDir = join(root, '.claude', '.brain-state');
  const stateFile = join(stateDir, `${sessionId}.json`);

  /** @returns {BrainState} */
  const load = () => {
    const raw = readOrNull(stateFile);
    return raw ? /** @type {BrainState} */ (JSON.parse(raw)) : emptyState();
  };
  const save = (/** @type {BrainState} */ s) => {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(stateFile, JSON.stringify(s));
  };
  const head = () => git(root, ['rev-parse', 'HEAD']).trim();

  if (event === 'session-start') {
    const state = load();
    if (state.head === undefined) save({ ...state, head: head(), dirty: dirtyPaths(root) });
    if (graphStale(readOrNull(join(root, 'graphify-out', 'GRAPH_REPORT.md')), head()))
      refreshGraph(root);
    const inboxDir = join(root, 'brain', 'inbox');
    const additionalContext = sessionContext({
      memory: readOrNull(join(root, 'brain', 'MEMORY.md')),
      staleInbox: existsSync(inboxDir) ? staleInbox(readdirSync(inboxDir), new Date()) : [],
    });
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } }),
    );
    return;
  }

  if (event === 'prompt') {
    const report = readOrNull(join(root, 'graphify-out', 'GRAPH_REPORT.md'));
    if (graphStale(report, head())) refreshGraph(root);
    const keywords = promptKeywords(String(input.prompt ?? ''));
    const additionalContext = promptContext({
      branch: git(root, ['branch', '--show-current']).trim() || '(detached HEAD)',
      commits: git(root, ['log', '--oneline', '-5']).split('\n').filter(Boolean),
      dirty: dirtyPaths(root),
      notes: matchNotes(brainNotes(join(root, 'brain'), root), keywords),
      graph: report && keywords.length > 0 ? graphHints(root, keywords) : null,
    });
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext },
      }),
    );
    return;
  }

  if (event === 'post-tool') {
    const toolInput = /** @type {Record<string, unknown>} */ (input.tool_input ?? {});
    const file = toolInput.file_path ?? toolInput.notebook_path;
    if (typeof file !== 'string') return;
    const rel = isAbsolute(file) ? relative(root, file) : file;
    if (rel.startsWith('..')) return;
    save(recordChanges(load(), [rel]));
    return;
  }

  if (event === 'stop') {
    let state = load();
    // Catch edits made through the shell or commits, which the post-tool hook does not see.
    const nowHead = head();
    const nowDirty = dirtyPaths(root);
    const committed =
      state.head && state.head !== nowHead
        ? git(root, ['diff', '--name-only', state.head, nowHead]).split('\n').filter(Boolean)
        : [];
    state = recordChanges(state, newPaths(state.dirty ?? nowDirty, nowDirty, committed));
    const decision = stopDecision(state, {
      stopHookActive: input.stop_hook_active === true,
      today: today(),
    });
    save({ ...decision.next, head: nowHead, dirty: nowDirty });
    if (decision.refreshGraph) refreshGraph(root);
    if (decision.block)
      process.stdout.write(JSON.stringify({ decision: 'block', reason: decision.reason }));
    return;
  }

  if (event === 'session-end') {
    if (existsSync(stateFile)) rmSync(stateFile);
    if (graphStale(readOrNull(join(root, 'graphify-out', 'GRAPH_REPORT.md')), head()))
      refreshGraph(root);
  }
}

try {
  main();
} catch {
  // Silent by design: see the header.
}
