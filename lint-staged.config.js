const path = require('path');

/**
 * Lint each file with the config its own workspace uses.
 *
 * Running `eslint` from the repository root applies the root flat config to
 * everything, but `pnpm turbo lint` — the gate CI runs — invokes each
 * workspace's own config. The two are not the same: apps/web loads the
 * react-hooks and react-refresh plugins, the root config does not. That made
 * the pre-commit hook and CI disagree about the same file, in both directions —
 * a `react-hooks/exhaustive-deps` disable comment is required by one and an
 * unresolvable rule reference to the other.
 *
 * Routing web files through the web workspace removes the disagreement, so
 * passing the hook means passing CI.
 */
const WEB_WORKSPACE = 'apps/web';

const toRepoPath = (file) => path.relative(process.cwd(), file).split(path.sep).join('/');
const quote = (files) => files.map((f) => JSON.stringify(f)).join(' ');

function eslintCommands(files) {
  const web = [];
  const root = [];

  for (const file of files) {
    const repoPath = toRepoPath(file);
    if (repoPath.startsWith(`${WEB_WORKSPACE}/`)) {
      web.push(repoPath.slice(WEB_WORKSPACE.length + 1));
    } else {
      root.push(repoPath);
    }
  }

  const commands = [];
  if (web.length) {
    commands.push(`pnpm --filter @forgeone/web exec eslint --fix ${quote(web)}`);
  }
  if (root.length) {
    commands.push(`eslint --fix ${quote(root)}`);
  }
  return commands;
}

module.exports = {
  '*.{ts,tsx}': (files) => [...eslintCommands(files), `prettier --write ${quote(files)}`],
  '*.{js,jsx,cjs,mjs}': (files) => [...eslintCommands(files), `prettier --write ${quote(files)}`],
  '*.{json,yaml,yml}': ['prettier --write'],
  '*.css': ['prettier --write'],
  '*.py': ['ruff check --fix', 'ruff format'],
};
