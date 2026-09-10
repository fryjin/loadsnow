# M0 Foundation contracts

## Scope and dependency direction

DEV-001 implements four Core packages and a minimal Engine Lab.
Other packages export nothing and only declare their intended dependencies.
No generator, content profiler, layout engine, Workspace or renderer is implemented.

| Package | Permitted dependencies |
| --- | --- |
| design-domain | None |
| design-random | None |
| design-rules | design-domain |
| card-library | design-domain |
| design-generation (reserved) | design-domain, design-random, design-rules, card-library |
| design-layout (reserved) | design-domain |
| design-quality (reserved) | design-domain |
| design-render-model (reserved) | design-domain |
| renderer-svg (reserved) | design-render-model |
| workspace-core (reserved) | design-domain |

The app imports JSON, calls the Card Loader, passes card rules and context to the Rule
Engine, and displays domain results. Neither the loader nor evaluator knows card IDs.
Core compiles with ES2022 only, without DOM or Node types. Architecture tests reject
platform identifiers/imports, random leakage and hardcoded prototype card IDs.
React and browser entry points belong to the app.

## Domain

Content elements carry semantic roles and discriminated text/image payloads.
Canvas baseline is 1080 x 1440. Safe area initially has four explicit zero insets;
later generation requests can provide their own insets.
CardDefinition contains data only, with no renderer callbacks or executable rules.
GenerationRequest, GenerationContext, GenerationResult, DesignDNA and ResolvedDNA
are reserved contracts to review before DEV-002. A partial card mapping does not yet
assert a complete seven-slot DNA.

## Random

`SeededRandom(seed: string | number)` uses `mulberry32-fnv1a-utf16-v1`:
hash the JSON-encoded seed type/value pair with FNV-1a multiplication over UTF-16
code units, then advance Mulberry32 with 32-bit integer arithmetic.
This is for reproducible design sampling, not cryptography.

- `nextFloat()`: [0, 1).
- `nextInt(min, max)`: inclusive safe-integer bounds with span at most 2^32.
  Rejection sampling avoids modulo bias.
- `pick(items)`: one item from a nonempty pool.
- `weightedPick([{ value, weight }])`: finite nonnegative weights; at least one
  positive weight. Weights are scaled before summation to avoid overflow.
- `fork(namespace)`: a fresh stream derived from the original stream identity
  and namespace, encoded as a JSON pair. It consumes no parent state. Repeating a
  namespace starts the same stream; keep the returned object to advance it.

Numeric seed `839217` and string seed `"839217"` are distinct. The Lab always uses
the input string. Namespace boundaries are preserved for nested forks.
Invalid seeds, bounds, pools and weights throw RangeError before drawing.
Future algorithm or call-order changes must be reviewed for replay compatibility.

## Rules

`evaluateRule(rule, context)` returns the matching effect, or null.
Conditions read a single own field in a flat context. There are no nested paths,
callbacks, expressions, OR/AND DSL, UI, storage or filesystem access.

| Operator | Meaning |
| --- | --- |
| eq / neq | Strict scalar comparison, no coercion |
| gt / gte / lt / lte | Numeric comparison only |
| contains | String substring or strict scalar membership in an array |
| in | Context scalar occurs in the condition's scalar array |

Missing/undefined fields never match, including neq. Numeric JSON rule values must
be finite. Rules and context are not mutated.

`evaluateRules(rules, context, { weight, parameters })` starts with the supplied base
(default weight 1, empty parameters), then folds matching effects in data order:

- disable: sets disabled to true; later effects cannot enable it.
- weightMultiply: multiplies the current weight by the factor.
- parameterOverride: shallow replacement of named values; the last match wins.

Disabled and weight are separate outputs. Later pool selection must exclude disabled
cards; a positive weight is not permission to select one.
The Lab evaluates eligibility first, then rules.

## Card data and validation

`loadCards(data: unknown)` accepts an already-parsed array and returns
`{ cards, diagnostics }`. File/network reads belong to callers.
Required fields: id, type, name, version, status, riskLevel, rarity, weight,
parameters and rules. Version uses x.y.z; status is draft/active/deprecated.
Parameters are typed number/string/boolean defaults. Numeric bounds, rule operators
and effects, optional eligibility and variants are also validated.
Card IDs must be unique. Invalid entries are excluded with INVALID_CARD_SCHEMA
diagnostics containing the source array index and card ID when available.
Other valid entries still load. The loader does not silently repair or default data.
Loaded data is typed readonly; callers must preserve it as immutable data.

Seven prototype cards: L001/L002/L003, T001/T003 and P001/P003.
The app's card-data.ts only assembles JSON imports, outside React components.

- L003 eligibility: hasImage eq false -> disable.
- L002 rule: contentDensity eq high -> weightMultiply 0.3.

Changing L003 eligibility requires editing data/cards/L003.json only.
Tests also rename and reverse that card's condition to prove the evaluator has
no card-specific branches.

## M0 limitations for architecture review

Packages are private source workspaces; the build emits the Lab bundle only.
Rule DSL remains deliberately small. Card parameters/variants and reserved
Generation contracts need review before M1 uses them as a broader authoring format.
Draft/deprecated status is validated metadata; status filtering belongs to the future
Card Pool Builder. There is no production Card selection in DEV-001.
