module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{js,jsx,cjs,mjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,yaml,yml}': ['prettier --write'],
  '*.css': ['prettier --write'],
  '*.py': ['ruff check --fix', 'ruff format'],
};
