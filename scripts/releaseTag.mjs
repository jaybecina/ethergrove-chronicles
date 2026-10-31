// Refuses to release when the git tag and the desktop app's version disagree (auto-update spec §6).
// CI runs this on `v*` tags: `node scripts/releaseTag.mjs` reads GITHUB_REF_NAME and apps/desktop/package.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * @param {{ tag: string; version: string }} input
 * @returns {string | null} an error message, or null when the tag is `v` plus a plain MAJOR.MINOR.PATCH version
 */
export function checkReleaseTag({ tag, version }) {
  if (SEMVER.test(version) && tag === `v${version}`) return null;
  return `Tag ${tag} does not match apps/desktop/package.json version ${version}.`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pkg = JSON.parse(
    readFileSync(new URL('../apps/desktop/package.json', import.meta.url), 'utf8'),
  );
  const error = checkReleaseTag({ tag: process.env.GITHUB_REF_NAME ?? '', version: pkg.version });
  if (error) {
    console.error(error);
    process.exit(1);
  }
}
