<div align="center">
  <img src="public/abse-logo.svg" alt="Abse logo" width="520" />

  # Abse — Forge your history

  **A GitHub-powered strategy dungeon crawler built with React, TypeScript and Base44.**

  [Live app](https://abse.base44.app) · [Logo mark](public/abse-mark.svg) · [Full logo](public/abse-logo.svg)
</div>

## Overview

Abse turns a developer's public GitHub history into the foundation of a playable RPG identity. Public repository activity, account age, maintenance signals and language distribution become explainable attributes such as Force, Guard, Momentum, Precision and Insight.

The player decides how to shape the Architect and how to survive each dungeon encounter.

## Player flow

1. Sign in through Base44.
2. Enter a public GitHub username.
3. Generate a server-produced Forge profile.
4. Allocate attributes and create an Architect.
5. Enter the Depths and make combat decisions.
6. Progress through factions, rankings and territory influence.

Abse currently analyzes public GitHub data only. It does not request private repositories or private contribution history.

## Stack

- React 19
- TypeScript
- Vite
- Base44 authentication
- Base44 entities and backend functions
- GitHub public REST API

## Development

Requirements:

- Node.js 20.19 or newer
- A linked Base44 project

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Deployment:

```bash
npm run build && npx base44@latest deploy --yes
```

## Brand assets

- [`public/abse-mark.svg`](public/abse-mark.svg) — favicon and square app mark
- [`public/abse-logo.svg`](public/abse-logo.svg) — horizontal logo lockup
- [`public/site.webmanifest`](public/site.webmanifest) — installable app metadata

The SVG logo files are scalable and downloadable for the Base44 app logo, documentation and social materials.

## Documentation

- [`PRD.md`](PRD.md)
- [`GAME_DESIGN.md`](GAME_DESIGN.md)
- [`TECHNICAL_SPEC.md`](TECHNICAL_SPEC.md)
- [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)
- [`API_CONTRACTS.md`](API_CONTRACTS.md)
- [`SECURITY.md`](SECURITY.md)
- [`TEST_PLAN.md`](TEST_PLAN.md)
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)

Created by [Mojeeb Titilayo](https://github.com/mojeebdev) for the Base44 Backend Competition.
