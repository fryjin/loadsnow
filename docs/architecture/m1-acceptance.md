# M1 acceptance

DEV-002 implements deterministic Content → Profile → Pool → Compatibility →
Conditional Sampling → Parameter Resolution → Design DNA. M1 stops before M2.

## Prototype inventory

All cards are active at `0.1.0`, packaged as `poster-core-prototype@0.1.0`.

| Module | Cards |
| --- | --- |
| Layout (5) | L001 Classic Left Editorial; L002 Centered Statement; L003 Split Editorial; L005 Type Dominant; L013 Poster Stack |
| Typography (5) | T001 Neutral Sans; T003 Condensed Impact; T004 Serif Editorial; T006 Serif × Sans; T009 Compact Editorial |
| Palette (5) | P001 Black / White; P002 Black / Cream; P003 Cream / Red / Black; P004 White / Blue / Black; P011 Neutral + Accent |
| Image (4) | I001 Contained; I003 Edge Crop; I004 Half Frame; I005 Top Banner |
| Composition (3) | C001 Balanced; C002 Left Gravity; C008 Asymmetric Tension |
| Detail (3) | D001 No Detail; D002 Index Number; D004 Guide Line |
| Wild (2) | W001 Edge Overflow; W002 Oversized Title |

## Gate evidence

| Gate | Evidence |
| --- | --- |
| A Core boundaries | architecture.test.ts checks imports/globals; tsconfig.core.json excludes DOM and Node types |
| B Seeded only | AST/source guard rejects Math.random, Date and crypto in Core; RNG implementation unchanged |
| C Data-only card | acceptance.test.ts injects T999 and selects it with the existing generator |
| D Data-only compatibility | acceptance.test.ts injects a pair multiplier and observes doubled downstream weight |
| E Determinism | 100 repeated whole results on real pack; full DNA snapshot |
| F Module isolation | frozen numeric/string seed vectors; 40 added typography parameters over 50 seeds preserve all selected cards and palette parameters |
| G 27 valid cards | data.test.ts checks counts, IDs, versions, tags and parameter schemas |
| H Complete DNA | type contract, runtime validator, every content fixture and generation success checks |
| I No-image exclusion | real pack over 100 seeds: image/parameters null and never L003 |
| J DNA Lab | browser DRAW/reload, forces, error, weights, parameters and module seeds verified; no Poster |

Additional tests cover all profile categories, draft/deprecated exclusion, enabled
packs, multiplicative/forbidden compatibility, required/optional pools, concrete
overrides, unsupported modes/policies, force/lock priority and multiple detail locks.
A fixed 1,000-seed set excludes zero/forbidden weights and checks broad weight/Wild
frequency expectations. All existing M0 RNG/rule/schema checks remain in the suite.

## Browser observations (2026-09-12)

At `http://127.0.0.1:5173`, default case is the requested NEW FORMS exhibition with
portrait metadata and seed string `"839217"`. Actual output:
L002 / C001 / T006 / I003 / P002 / [D002] / null, all CardRefs at `0.1.0`.
This is a legal sampled combination; the brief's example combination was illustrative.

- DRAW twice: complete displayed DNA text identical.
- Reload with the same default content/seed: complete DNA text identical.
- NEXT SEED changes the string to `"839218"`; DRAW produces another valid DNA
  (L002 / C001 / T001 / I004 / P001 / [D002] / null).
- Force L003 / T001 / P003 with an image: all three references match.
- Remove image with L003 forced: `FORCED_CARD_INELIGIBLE`, displayed DNA null.
- Clear Layout force with no image: L001 selected and image/parameters null.
- Page shows all seven modules, resolved parameters, module seeds, weights and
  compatibility effects; 27 loaded cards and no diagnostics on valid draws.
- Captured browser warning/error logs: empty.

## Automated verification

- `pnpm install`: passed; workspace package link and lockfile updated, no new external dependency.
- `pnpm typecheck`: passed (full app/tests plus Core without DOM/Node types).
- `pnpm test`: passed, 13 files / 160 tests, including 3 frozen M1 snapshots.
- `pnpm build`: passed; includes typecheck, then Vite production build (68 modules).
- Data task independent review: spec compliant, quality approved. Its minor fixture
  validation gap was closed in acceptance.test.ts for all five ContentDocuments.
- Independent whole-branch review of `51ae15c..275d029`: compliant with DEV-002,
  ready to merge subject to CI; no critical, important or minor findings.
- Remote push CI for `275d029`: [passed](https://github.com/fryjin/loadsnow/actions/runs/34637978215).
- Delivery PR: [#2](https://github.com/fryjin/loadsnow/pull/2), targeting main.
  The PR checks tab records CI for its latest head, including documentation updates.

## Known limits

Only blind/new_direction. Greedy forward sampling can return an impossible-pool
error and does not search for another earlier choice. Random details are 0..1;
forced/locked arrays support N. Locks preserve cards, not parameters. M1 requires
globally unique card IDs; no historical resolver or multiple versions of one card.
Profile rules are transparent heuristics. Card/pack versions are manually managed;
there is no content digest or migration service. Libraries must be injected; no
Core persistence, browser API, file access or automatic seed creation.

Architecture-review topics before M2 are in [m1-dna-generator.md](m1-dna-generator.md#review-before-m2).
