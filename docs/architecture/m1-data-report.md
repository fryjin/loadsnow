# M1 seed data report

## Result

Implemented the M1 poster prototype data pack from baseline `495214337408c0624e65680b6e2f7a43f6ddda4a`.

Data implementation commit: `107367d`

## TDD evidence

- RED: `pnpm test tests/generation/data.test.ts` exited 1 because `../../data/prototype-library` did not exist. This was the expected missing-feature failure after the 27-card acceptance assertions were added.
- GREEN: `pnpm test tests/generation/data.test.ts` exited 0 with 1 test file and 4 tests passed.
- Type verification: `pnpm typecheck` exited 0, covering both `tsconfig.json` and `tsconfig.core.json`.

## Changed files

- Migrated cards: `data/cards/L001.json`, `L002.json`, `L003.json`, `T001.json`, `T003.json`, `P001.json`, `P003.json`.
- Added cards: `data/cards/L005.json`, `L013.json`, `T004.json`, `T006.json`, `T009.json`, `P002.json`, `P004.json`, `P011.json`, `I001.json`, `I003.json`, `I004.json`, `I005.json`, `C001.json`, `C002.json`, `C008.json`, `D001.json`, `D002.json`, `D004.json`, `W001.json`, `W002.json`.
- Added pack assembly: `data/card-packs/poster-core-prototype.json`, `data/compatibility/poster-core-prototype.json`, `data/prototype-library.ts`.
- Added acceptance content: `data/test-content/case-low-no-image.json`, `case-medium-image.json`, `case-high-image.json`, `case-long-title.json`, `case-cjk.json`.
- Added acceptance coverage: `tests/generation/data.test.ts`.

## Acceptance checks

- 27 unique, active cards at version `0.1.0`; counts are layout 5, typography 5, palette 5, image 4, composition 3, detail 3, wild 2.
- All cards pass `loadLibrary` schema validation with no diagnostics and use only integer, float, boolean, and enum parameters.
- Required explicit pair multipliers and the `minimal` + `dense` tag multiplier are present.
- L002 retains its high-density weight rule; L003 and every image card disable when no image is present.
- D001 is the generic no-op detail card with empty parameters.
- All five ContentDocument fixtures include explicit IDs and language metadata; the M0 context fixtures are unchanged.

## Concerns

None in the owned data scope.
