# M1 seed data task brief

Work in D:/loadsnow on feature/m1-dna-generator. The controller implements Core.
Your owned scope: data/** and tests/generation/data.test.ts only.
Do not edit domain/loader/generator/app or other tests. Do not switch branches.
Use test-driven-development for meaningful data acceptance tests: first write the
27-card assertions and observe failure, then create/migrate the data and run them.

## Global constraints

Card / Compatibility / Sampling 参数数据驱动. 新增 Card 不要求修改 Generator 主逻辑.
27 张 Card 全部通过 Schema Validation. All cards active, version 0.1.0.
No geometry, coordinates, final font sizes/crops, filesystems or renderer work.

## Data outputs

Migrate seven existing JSONs to M1 parameter schema; add 20 JSONs. Names/IDs:

- layout (5): L001 Classic Left Editorial; L002 Centered Statement;
  L003 Split Editorial; L005 Type Dominant; L013 Poster Stack.
- typography (5): T001 Neutral Sans; T003 Condensed Impact; T004 Serif Editorial;
  T006 Serif × Sans; T009 Compact Editorial.
- palette (5): P001 Black / White; P002 Black / Cream; P003 Cream / Red / Black;
  P004 White / Blue / Black; P011 Neutral + Accent.
- image (4): I001 Contained; I003 Edge Crop; I004 Half Frame; I005 Top Banner.
- composition (3): C001 Balanced; C002 Left Gravity; C008 Asymmetric Tension.
- detail (3): D001 No Detail; D002 Index Number; D004 Guide Line.
- wild (2): W001 Edge Overflow; W002 Oversized Title.

Each has tags, weight, eligibility (possibly []), parameters, riskLevel, rarity,
status, rules (possibly []). Preserve L003 eligibility rule requires-image:
hasImage eq false -> disable. Preserve L002 first rule high-density-weight:
contentDensity eq high -> weightMultiply factor 0.3.
All image cards also disable for hasImage=false via data rules.
D001 has noOp:true, parameters:{}, tags including no-detail; generator will
normalize this generic noOp flag to empty details, without checking card IDs.

Use real, small decision parameters, not arbitrary decorative data: alignment enum,
column count integer, split ratio weighted enum, relative emphasis/spacing float,
booleans with probabilities, palette color enums. All four parameter types must
occur across the pack. Consult packages/design-domain/src/index.ts CardParameter:
integer/float min/max/default and optional uniform distribution; boolean default
and probability; enum values (string/number/boolean), default, distribution
uniform or weighted, and matching nonnegative weights with at least one positive.
No old number/string types. Example splitRatio values [0.4,0.45,0.5,0.55,0.6],
default 0.5, distribution weighted, weights [0.1,0.2,0.4,0.2,0.1].
Never use final geometry or actual fonts downloaded from network.

Create data/card-packs/poster-core-prototype.json with id poster-core-prototype,
name Poster Core Prototype, version 0.1.0.
Create data/compatibility/poster-core-prototype.json as:
{ pairs: [{a:string,b:string,multiplier:number}], tags:
[{tagA:string,tagB:string,multiplier:number}] }.
Required symmetric pairs:
L003 + I004 = 1.4; L005 + T003 = 1.3; L005 + W002 = 1.3;
L001 + T006 = 1.2; L013 + I005 = 1.25; L002 + T009 = 0.4;
L005 + T009 = 0.4.
Add at least one clearly named tag rule (minimal + dense = 0.3) and assign
tags sensibly. Do not duplicate the L003 image eligibility as compatibility.

Create data/prototype-library.ts: statically import the 27 JSONs, pack metadata
and compatibility data; export prototypeLibraryData: unknown =
{packs:[{...metadata,cards:[...all27]}],compatibility}. Assembly is in data,
so adding a card changes only data and leaves the Generator algorithm alone.

Add ContentDocument JSONs in data/test-content:
case-low-no-image, case-medium-image, case-high-image, case-long-title, case-cjk.
Each contains id, explicit language, elements with id/type/role/text for text,
and source/alt/width/height for image. Sources can be placeholder paths; never
load actual images. Use Japanese (ja) for the CJK case.
The medium case is the final acceptance scenario: NEW FORMS title,
Contemporary Design Exhibition subtitle, Short body copy, October 12–18 date,
Seoul location and a portrait image. Low case title only, no body/image.
High case long body (over 240 chars), title, subtitle, date, location, meta and image.
Long title over 70 Latin codepoints. Japanese short/long thresholds are lower.
Keep M0 with-image.json / without-image.json context fixtures unchanged.
No need to create a case registry: parent will assemble cases in the app.

## Tests and handoff

Read loadLibrary and loadCards from packages/card-library/src/index.ts;
loadLibrary(prototypeLibraryData) returns {library, diagnostics}. Check all 27 IDs
and type counts 5/5/5/4/3/3/2, no diagnostics, required pair data, noOp detail flag,
all parameter types present, all 5 cases contain expected metadata.
Run focused test (pnpm test tests/generation/data.test.ts with escalation if
the sandbox store differs), verify and commit ONLY your owned paths using
git -c user.name=Codex -c user.email=codex@openai.com commit.
Write report to D:/loadsnow/docs/architecture/m1-data-report.md with RED/GREEN
test evidence, changed files, commit SHA and any concerns. This report is also
your owned path. Return a brief status, SHA, test count and report path.
