# DEV-001 M0 Foundation implementation plan

Goal: prove data-driven Card, Rule and Seed behavior, stopping before DEV-002.

The user-provided DEV-001 is the approved scope. Only design-domain, design-random,
design-rules, card-library and a minimal engine-lab are implemented.
TypeScript, pnpm workspace, Vite, React in apps only, and Vitest are required.

## Design decisions

- Private workspace packages expose TypeScript source to Vite/Vitest. M0 build
  typechecks all packages and produces the Engine Lab bundle. No publishing pipeline.
- Core packages compile separately with ES2022 only, no DOM and no Node ambient types.
- design-domain owns serializable types; random has no dependency; rules and card
  loader depend on domain only. The app composes data -> loader -> evaluator -> results.
- JSON under data/cards is the single source of truth, imported by the app/tests and
  passed as unknown to the loader. The loader never reads files or imports rules/UI.
- Flat field predicates only. evaluateRule returns a matched effect or null;
  evaluateRules folds effects in file order: disable is sticky, multipliers compose,
  and later parameter overrides win. No DSL, rendering, profiling or generation.
- SeededRandom uses a documented versioned noncryptographic algorithm. nextFloat is
  [0,1); nextInt includes both endpoints. weightedPick takes {value, weight} entries.
  Fork derives from initial seed and namespace, independent of parent consumption.
- Seed string/number identity is explicit. The Lab passes the entered string.
- Baseline canvas: 1080 x 1440. Generation types are reservations, with no generator.

## Implementation and verification

- [x] Scaffold package manifests, compiler configs and domain models.
  Files: package.json, pnpm-workspace.yaml, tsconfig*.json, packages/*/src/index.ts.
  Check: pnpm install; pnpm typecheck with separate Core compiler.
- [x] Random TDD: tests/deterministic/random.test.ts then design-random/src/index.ts.
  Check 100 repeated sequences, seed divergence, inclusive bounds, namespace stability,
  nested fork boundaries, weights and invalid input.
- [x] Rules TDD: tests/rules.test.ts then design-rules/src/index.ts.
  Check all 8 operators and all 3 effects, no mutation, absent fields fail closed.
- [x] Card TDD: tests/cards.test.ts then card-library/src/index.ts and data/cards/*.json.
  Check 7 cards (3/2/2), schema diagnostics, duplicates, L003 without/with image,
  L002 high density x0.3, and data-only eligibility change under a different card id.
- [x] Build app/src/main.tsx and run-lab.ts with basic form/results.
  Check reproducible output after RUN/reload; toggles; counts; diagnostics.
- [x] Add tests/architecture.test.ts to reject random leakage, platform imports,
  browser globals, hardcoded card IDs and invalid package dependency directions.
- [x] Add README and .github/workflows/ci.yml.
  Check pnpm install --frozen-lockfile, pnpm typecheck, pnpm test, pnpm build.
- [x] Independent code review and browser verification.
  Deliver tree, exact test/build outcomes, known issues and architecture review notes.


GitHub publication and current CI status are reported in the PR and final handoff.
