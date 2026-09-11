# Design Gacha / loadsnow

Current stage: **M0 Foundation (DEV-001)**

Data-driven card loading, deterministic random streams and declarative rule evaluation.
Engine Lab is a minimal development tool. Generation, Workspace and poster rendering
are reserved for later milestones.

## Requirements

- Node.js 22.12 or newer (CI uses Node 22)
- pnpm 11.19.0 (pinned in package.json)

## Install

```sh
pnpm install
```

## Run Engine Lab

```sh
pnpm dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).
Enter seed `839217` and press **RUN**. The Lab treats seeds as strings.
Reload and run the same inputs to reproduce the random results.
Change `hasImage` to see split layout eligibility; use high density to see the
centered layout weight become 0.3. Results change after pressing RUN.

## Test

```sh
pnpm typecheck
pnpm test
```

Includes 100-run deterministic acceptance, namespace isolation, all eight rule
operators, all three effects, schema rejection, data-only eligibility changes,
Lab integration, and Core architecture checks.

## Build

```sh
pnpm build
```

Typechecks all source and builds `apps/engine-lab/dist`.
Packages are private TypeScript source workspaces consumed by Vite/Vitest;
M0 does not publish separate library bundles.

## Repository structure

```text
apps/
  engine-lab/           Minimal React/Vite diagnostic app
  workspace/            Reserved
packages/
  design-domain/        Content, Canvas, Card, Rule, Generation, Diagnostic types
  design-random/        SeededRandom
  design-rules/         Pure rule evaluation
  card-library/         Platform-independent schema validation and loading
  design-generation/    Reserved
  design-layout/        Reserved
  design-quality/       Reserved
  design-render-model/  Reserved
  renderer-svg/         Reserved
  workspace-core/       Reserved
data/
  cards/                Seven JSON test cards
  test-content/         With-image and without-image contexts
tests/
  deterministic/
  generation/           Reserved
  layout/               Reserved
  architecture.test.ts
  cards.test.ts
  engine-lab.test.ts
  rules.test.ts
docs/architecture/      Contracts, plan and acceptance evidence
.github/workflows/     Typecheck, test and build CI
```

See [M0 contracts](docs/architecture/m0-foundation.md) for API conventions and
dependency directions. Stop at M0 for architecture review before DEV-002.
