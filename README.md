# Design Gacha / loadsnow

Current stage: **M1 DNA Generator (DEV-002)**

Content → Profile → Eligible Pool → Compatibility → Conditional Sampling →
Resolved Parameters → Versioned Design DNA. Core is pure TypeScript; the DNA Lab
exposes the decisions and their weights. Poster rendering remains a later milestone.

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
Choose `case-medium-image`, enter seed `839217`, and press **DRAW**. The Lab treats
seeds as strings. Repeating DRAW or reloading with the same inputs reproduces the
complete DNA. NEXT SEED increments a numeric string; custom seeds gain `:next`.
Force Layout / Typography / Palette to inspect a combination. Force L003 with no
image returns `FORCED_CARD_INELIGIBLE`; clear the force to draw valid no-image DNA.
Density presets construct test content; `auto` uses the content case unchanged.

## Test

```sh
pnpm typecheck
pnpm test
```

Includes 100-run full-DNA acceptance, frozen module vectors, parameter-stream
isolation, 100 no-image seeds, 1,000-seed weight checks, force/lock precedence,
data-only card and compatibility extensions, schema rejection, Lab integration,
and Core architecture checks. Existing M0 RNG golden vectors are unchanged.

## Build

```sh
pnpm build
```

Typechecks all source and builds `apps/engine-lab/dist`.
Packages are private TypeScript source workspaces consumed by Vite/Vitest;
The repository does not publish separate library bundles.

## Repository structure

```text
apps/
  engine-lab/           React/Vite DNA diagnostic app
  workspace/            Reserved
packages/
  design-domain/        Content, Canvas, Card, Rule, Generation, Diagnostic types
  design-random/        SeededRandom
  design-rules/         Pure rule evaluation
  card-library/         Platform-independent schema validation and loading
  design-generation/    Profiler, conditional pools, sampling, parameter resolution
  design-layout/        Reserved
  design-quality/       Reserved
  design-render-model/  Reserved
  renderer-svg/         Reserved
  workspace-core/       Reserved
data/
  cards/                27 JSON prototype cards
  card-packs/           poster-core-prototype@0.1.0 metadata
  compatibility/        Explicit pair and tag multiplier data
  prototype-library.ts  Application-boundary static data assembly
  test-content/         Five ContentDocuments and retained M0 contexts
tests/
  deterministic/
  generation/           Contracts, profiles, pools, parameters and DNA acceptance
  layout/               Reserved
  architecture.test.ts
  cards.test.ts
  engine-lab.test.ts
  rules.test.ts
docs/architecture/      Contracts, plan and acceptance evidence
.github/workflows/     Typecheck, test and build CI
```

See [M1 architecture](docs/architecture/m1-dna-generator.md) for contracts and API
examples, and [M1 acceptance](docs/architecture/m1-acceptance.md) for gates and
verification evidence. M0 dependency directions remain unchanged. Stop at M1 for
architecture review before DEV-003 / M2 Solver.
