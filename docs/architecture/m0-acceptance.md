# DEV-001 acceptance evidence

Verified on 2026-09-10. Implementation is limited to M0 Foundation.

| Gate | Evidence |
| --- | --- |
| A — Engineering | pnpm install --frozen-lockfile, pnpm typecheck, pnpm test and pnpm build all exited 0 |
| B — Determinism | 100 independently constructed mixed sequences exactly equal; seed/fork golden vectors committed |
| C — Random leakage | Core Math.random call occurrences: 0; automated source guard included |
| D — Data-driven cards | Data-only edit reverses split-card eligibility, including under a different card ID; evaluator unchanged |
| E — Platform independence | All Core sources typecheck with ES2022 only and types: []; package/import/global boundary tests pass |
| F — Engine Lab | Browser runs; random output identical after reload; both eligibility states and card counts verified |

## Final local commands

```text
pnpm install --frozen-lockfile
  Scope: all 12 workspace projects
  Already up to date
  exit 0

pnpm typecheck
  Full-project and Core-only TypeScript checks
  exit 0

pnpm test
  Test Files  5 passed (5)
       Tests  65 passed (65)
  exit 0

pnpm build
  Typecheck passed
  Vite 8.3.0: 28 modules transformed
  dist/index.html                 0.40 kB
  dist/assets/index-BcLTVxkY.css  0.99 kB
  dist/assets/index-CR_V0hVq.js 231.04 kB
  exit 0
```

The build target is apps/engine-lab/dist. Core packages remain private TypeScript
source workspaces. GitHub Actions repeats installation, typecheck, tests and build;
the PR shows the latest remote status. No main merge is part of this task.

## Browser checks

Local URL: http://127.0.0.1:5173/

- Seed 839217: the complete rendered Random Test text matched exactly before/after
  a page reload, including floats, integers, pick, weightedPick and all three forks.
- hasImage=false, contentDensity=high, RUN: L003 disabled with requires-image;
  L002 weight 0.3 with high-density-weight.
- hasImage=true, RUN: L003 enabled.
- Card Library: 7 loaded cards; Layout 3, Typography 2, Palette 2.
- Diagnostics: all schemas valid.
- Browser warning/error log: empty.
- Screenshot capture timed out in the browser tool; assertions above were verified
  from the rendered accessibility tree and DOM text. No screenshot evidence is claimed.

## Independent review

Read-only review of implementation commit 9f41a330b6cc1040ab0f12f1825be688f822b26e
found no critical or important issues. The reviewer independently passed the then-current
64 tests and both typechecks. The one nonblocking recommendation, a fixed PRNG
regression vector, was added; the final local suite contains 65 tests.

## Known limitations and architecture review

No known M0 acceptance failure. Generation, layout/rendering and Workspace remain
reserved by design. Review the reserved Generation/DNA contracts and source-package
distribution before DEV-002; no extra architecture layer is required for M0.
See m0-foundation.md for exact seed, fork, schema and effect conventions.

The execution environment uses different pnpm store settings inside/outside its
sandbox; checks were run in the same authorized environment as dependency installation.
No project workaround or global configuration change was added for that environment issue.
