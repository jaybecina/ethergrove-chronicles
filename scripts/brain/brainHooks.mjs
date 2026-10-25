// Pure logic behind the second-brain automation (decision 0006). `hook.mjs` does the I/O.

/** @typedef {{ pending: string[], memoryTouched: boolean, head?: string, dirty?: string[] }} BrainState */

/** The standing instruction every session starts with, so the owner never has to repeat it. */
export const STANDING_RULE =
  'Always follow best practices and standards: the Working standard in AGENTS.md applies to every task, ' +
  'even when the prompt does not ask for it.';

const IGNORED = [
  /^graphify-out\//,
  /^\.claude\/\.brain-state\//,
  /(^|\/)node_modules\//,
  /(^|\/)(dist|coverage|test-results|playwright-report)\//,
];
const MEMORY = [/^brain\//, /^AGENTS\.md$/];
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|css)$/;
const MAX_LISTED = 10;
const INBOX_MAX_DAYS = 7;

/** @returns {BrainState} */
export function emptyState() {
  return { pending: [], memoryTouched: false };
}

/**
 * Adds changed repo-relative paths: memory files flag `memoryTouched`, other work files stay pending.
 * @param {BrainState} state
 * @param {readonly string[]} paths
 * @returns {BrainState}
 */
export function recordChanges(state, paths) {
  const pending = new Set(state.pending);
  let memoryTouched = state.memoryTouched;
  for (const p of paths) {
    if (IGNORED.some((re) => re.test(p))) continue;
    if (MEMORY.some((re) => re.test(p))) memoryTouched = true;
    else pending.add(p);
  }
  return { ...state, pending: [...pending], memoryTouched };
}

/**
 * End of a turn: ask the agent once to capture what it learned when work changed but memory did not.
 * @param {BrainState} state
 * @param {{ stopHookActive: boolean, today: string }} ctx
 * @returns {{ block: boolean, reason?: string, refreshGraph: boolean, next: BrainState }}
 */
export function stopDecision(state, { stopHookActive, today }) {
  const next = { ...state, pending: [], memoryTouched: false };
  const refreshGraph = state.pending.some((p) => CODE.test(p));
  if (stopHookActive || state.pending.length === 0 || state.memoryTouched)
    return { block: false, refreshGraph, next };
  const shown = state.pending.slice(0, MAX_LISTED).map((p) => `- ${p}`);
  const more = state.pending.length - shown.length;
  if (more > 0) shown.push(`- …and ${more} more`);
  const reason = [
    `Second brain: this turn changed ${state.pending.length} file(s) but nothing in brain/ or AGENTS.md:`,
    ...shown,
    'Before you finish, capture what a future session could not cheaply rediscover (second-brain skill, capture rules):',
    '1. A decision and why, or a root cause: write or update the note in brain/decisions/ or brain/lessons/.',
    '2. A rule every agent should follow from now on (a better practice or standard): add one line to AGENTS.md.',
    `3. Otherwise: append one line under "Done" in brain/sessions/${today}.md (create it from the template) saying what changed and why.`,
    'Never record secrets, personal data, raw prompts or command output. Then finish your reply as planned.',
  ].join('\n');
  return { block: true, reason, refreshGraph, next };
}

/**
 * Paths from `git status --porcelain=v1 -z`. A rename or copy entry is followed by its source path,
 * which is skipped.
 * @param {string} z
 */
export function parsePorcelain(z) {
  const entries = z.split('\0');
  /** @type {string[]} */
  const paths = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i] ?? '';
    if (e.length < 4) continue;
    paths.push(e.slice(3));
    if (e[0] === 'R' || e[0] === 'C') i++;
  }
  return paths;
}

/**
 * Paths that became dirty since the last snapshot, plus paths committed since then.
 * @param {readonly string[]} before
 * @param {readonly string[]} now
 * @param {readonly string[]} committed
 */
export function newPaths(before, now, committed) {
  const seen = new Set(before);
  return [...new Set([...now.filter((p) => !seen.has(p)), ...committed])];
}

/**
 * True when GRAPH_REPORT.md is missing or was built from a different commit than HEAD.
 * @param {string | null} report
 * @param {string} head
 */
export function graphStale(report, head) {
  const built = report?.match(/Built from commit: `([0-9a-f]+)`/)?.[1];
  return !built || !head.startsWith(built);
}

/**
 * Inbox captures (`YYYY-MM-DD-topic.md`) older than a week.
 * @param {readonly string[]} files
 * @param {Date} now
 */
export function staleInbox(files, now) {
  return files.filter((f) => {
    const date = /^(\d{4}-\d{2}-\d{2})-/.exec(f)?.[1];
    if (!date) return false;
    return (now.getTime() - Date.parse(`${date}T00:00:00Z`)) / 86_400_000 > INBOX_MAX_DAYS;
  });
}

/**
 * Context added at session start: the standing rule, the brain index and overdue inbox items.
 * @param {{ memory: string | null, staleInbox: readonly string[] }} input
 */
export function sessionContext({ memory, staleInbox: stale }) {
  const parts = [`Standing instruction from the owner: ${STANDING_RULE}`];
  if (memory)
    parts.push(`Project memory index (brain/MEMORY.md), loaded automatically:\n\n${memory}`);
  if (stale.length > 0)
    parts.push(
      `brain/inbox/ has captures older than a week; sort them with the second-brain review mode when convenient: ${stale.join(', ')}`,
    );
  return parts.join('\n\n');
}

const STOPWORDS = new Set(
  (
    'about also been best change changes could does doing done every from have here into just like make ' +
    'more need only please really should some still sure than thanks that their them then there they ' +
    'this those want were what when where which while will with would your'
  ).split(' '),
);
const MAX_NOTES = 5;
const MAX_DIRTY = 8;

/**
 * Distinctive words of a prompt (4+ letters, no filler), in first-seen order. Used only in memory, never stored.
 * @param {string} prompt
 */
export function promptKeywords(prompt) {
  const words = prompt.toLowerCase().match(/[a-z0-9][a-z0-9_-]{3,}/g) ?? [];
  return [...new Set(words.filter((w) => !STOPWORDS.has(w)))];
}

/**
 * Brain notes that mention the most keywords, best first.
 * @param {readonly { path: string, text: string }[]} notes
 * @param {readonly string[]} keywords
 * @returns {{ path: string, title: string }[]}
 */
export function matchNotes(notes, keywords) {
  if (keywords.length === 0) return [];
  return notes
    .map((n) => {
      const text = n.text.toLowerCase();
      const score = keywords.filter((k) => text.includes(k)).length;
      const title = /^#\s+(.+)$/m.exec(n.text)?.[1]?.trim() ?? n.path;
      return { path: n.path, title, score };
    })
    .filter((n) => n.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NOTES)
    .map(({ path, title }) => ({ path, title }));
}

/**
 * The briefing added before every prompt: where the work stands, related memory, and code-map hints.
 * @param {{ branch: string, commits: readonly string[], dirty: readonly string[],
 *   notes: readonly { path: string, title: string }[], graph: string | null }} input
 */
export function promptContext({ branch, commits, dirty, notes, graph }) {
  const parts = [
    'Live briefing (added automatically before this prompt; check details against the code before acting):',
  ];
  const head =
    commits.length > 0 ? ` Recent commits:\n${commits.map((c) => `- ${c}`).join('\n')}` : '';
  parts.push(`Branch ${branch}.${head}`);
  if (dirty.length === 0) parts.push('Working tree clean.');
  else {
    const shown = dirty.slice(0, MAX_DIRTY).map((p) => `- ${p}`);
    if (dirty.length > MAX_DIRTY) shown.push(`- …and ${dirty.length - MAX_DIRTY} more`);
    parts.push(`${dirty.length} uncommitted file(s):\n${shown.join('\n')}`);
  }
  if (notes.length > 0)
    parts.push(
      `Related brain notes (read the ones that bear on the request):\n${notes.map((n) => `- ${n.path}: ${n.title}`).join('\n')}`,
    );
  if (graph)
    parts.push(`Code map starting points from graphify query (a guide, not the truth):\n${graph}`);
  return parts.join('\n\n');
}
