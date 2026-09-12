# DEV-002 implementation plan

Goal: a complete deterministic Content -> Profile -> Pool -> Compatibility ->
conditional sampling -> resolved parameters -> versioned DNA pipeline, plus DNA Lab.
Baseline: merged PR #1, 51ae15c. Work in existing feature/m1-dna-generator.

## Global constraints

Core 无 UI 依赖; Core 无 DOM; Core 无 browser storage; Core 无 filesystem.
所有随机行为 Seeded. 新增 Card 不要求修改 Generator 主逻辑.
No Solver, geometry, renderer, Poster, Quality, Repair, Candidate Search, Workspace,
History, Save or Export. Existing M0 RNG algorithm/golden vectors must not change.
Only blind/new_direction is implemented; reject other modes/policies explicitly.

## Decisions

- Inject GenerationLibrary: generate(request, library), or bind once with
  createGenerator(library) to obtain the public generate(request) function.
- CardPack owns cards; enabled IDs filter packs at generation time. Loader keeps
  draft/deprecated data. M1 libraries require globally unique card IDs.
- Force > lock > sampling. Forced/locked cards must still satisfy the current pool.
  A missing locked version is LOCKED_CARD_NOT_FOUND; an unavailable lock gets
  LOCKED_CARD_INELIGIBLE. Locks preserve CardRefs (not sampled parameters).
- Cardinalities: required layout/composition/typography/palette; optional image/wild;
  details array. M1 random details count 0 or 1 (50/50); force/lock arrays supported.
  noOp:true on a detail definition normalizes to []. No card ID branches.
- Compatibility rules are symmetric. Multiply every matching rule per selected
  candidate pair; zero forbids. Conditional pools see selected module IDs/tags.
- Module streams use global.fork(module), select and params namespaces; parameters
  also fork by name. Seed labels are replayable module seed identities.
- Integer/float/boolean/enum schemas replace M0 number/string schemas. Concrete
  overrides must match the parameter schema, and bypass random sampling entirely.
- Profile: explicit language or unknown; CJK language tags use lower thresholds;
  image dimensions are metadata only. Central thresholds and density formula.
- DNA records CardRefs, all module parameters/seeds, engine version, pack version,
  and enabled pack identity/version list. No geometry.

## Tasks

- [x] 1. Formalize contracts and parameter/library validation.
  Files: packages/design-domain/src/{index,generation}.ts,
  packages/card-library/src/{index,parameters,library}.ts; tests/generation/schema.test.ts.
  Check invalid weights, types, overrides; CardRef/cardinality/result type checks.
- [x] 2. Seed data task (independent delegate, task brief in m1-data-task.md):
  27 cards, pack/compatibility data and five ContentDocument cases. Tests data schema
  and exact counts/IDs. Review task diff before integration.
- [x] 3. Profile, compatibility, pool and parameter resolution.
  Files: packages/design-generation/src/{profile,compatibility,pool,parameters,seeds}.ts;
  tests/generation/{profile,pool,parameters}.test.ts. Write failing behavior tests
  first, implement, verify focused tests.
- [x] 4. Generate validation + conditional sampler + API.
  Files: packages/design-generation/src/{request,sample,generate,index}.ts;
  tests/generation/{contracts,generation}.test.ts.
  Check 100 identical full DNAs, 100 no-image seeds, downstream weight effects,
  0 weight/forbidden exclusion, force/lock precedence and errors, module isolation.
- [x] 5. DNA Lab with case/seed/image/density/force controls, DRAW, versioned
  cards, params, seeds, final weights/compatibility/diagnostics. No Poster.
  Files: apps/engine-lab/src/*, tests/engine-lab.test.ts, package manifest.
  Browser: same seed reload, forced split with/without image, 27 valid cards.
- [x] 6. Architecture guards, docs, independent final review, CI and PR.
  Files: tests/architecture.test.ts, README.md, .github/workflows/ci.yml,
  docs/architecture/{m1-dna-generator,m1-acceptance}.md.
  pnpm typecheck, pnpm test, pnpm build; all gates A-J. Stop for M1 review.
