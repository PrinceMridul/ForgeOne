# AGENTS.md — apps/web

Scoped guidance for the execution console. The repository-wide contract is in
[`../../AGENTS.md`](../../AGENTS.md); everything there applies here too.

## Conventions specific to this app

- **Same-origin only.** `src/lib/api-client.ts` issues relative paths. Vite
  proxies them in development, `src/lib/api-proxy.ts` proxies them in
  production. Never hardcode an API origin and never widen CORS to work
  around a cross-origin call.
- **`src/routeTree.gen.ts` is generated** by the TanStack Router plugin. It is
  rewritten on every dev/build run — do not hand-edit it.
- **`vite.config.ts` wraps `@lovable.dev/vite-tanstack-config`,** which already
  supplies the TanStack Start, React, Tailwind, tsconfig-paths and nitro
  plugins. Adding any of them manually produces duplicate plugins and breaks the
  build. Extra config goes through the `vite: { ... }` key.
- **`nitro: { preset: "node-server" }` is deliberate.** The wrapper defaults to
  `cloudflare-module`, which emits a Worker that Node cannot execute and that
  `scripts/start-production.mjs` cannot start.
- **Numbers rendered in the console must be derived from run data.** "Repository
  files" and "pipeline artifacts" are different counts; never conflate them.
- **Illustrative screens carry a `<SampleDataNotice />` badge.** If you make one
  real, remove the badge. If you add one, add the badge.

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
