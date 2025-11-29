# Quantum Tic-Tac-Toe

![Quantum Tic-Tac-Toe](https://github.com/gyk/quantum-tictactoe/raw/main/public/logo.svg)

A TypeScript + React implementation of [Quantum Tic-Tac-Toe](https://en.wikipedia.org/wiki/Quantum_tic-tac-toe), created by vibe coding. The game extends classic tic-tac-toe to conceptually model quantum phenomena such as superposition, entanglement, and collapse.

[Play online](https://gyk.github.io/quantum-tictactoe)

## Run locally

Prerequisites:

- Node.js 20+ (LTS recommended)
- pnpm (recommended; or use npm/yarn with equivalent commands)

Install dependencies:

```bash
pnpm install
```

Start dev server:

```bash
pnpm dev
# Open http://localhost:5173 (Vite dev server)
```

Build for production:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
# Open http://localhost:4173 (Vite preview)
```

Tests and linting:

```bash
pnpm test
pnpm lint
```

## Scripts

- dev: `vite`
- build: `tsc -b && vite build`
- preview: `vite preview`
- test: `vitest run`
- lint: `eslint .`

## Notes

- This is a pure frontend app; it should run on desktop and mobile browsers.
- Written by AI (mostly GPT-5).
- Logo designed by AI (Claude Opus 4.5).
