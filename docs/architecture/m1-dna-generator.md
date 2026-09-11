# M1 DNA Generator architecture

Baseline: merged M0 PR #1 (`51ae15c`). M1 implements decisions and sampled card
parameters only. Layout, quality, render-model, renderer and workspace remain shells.
There is no geometry, Poster, renderer, search, repair, history, save or export.

## Contracts and API

`GenerationRequest` contains explicit string/number seed, ContentDocument, CanvasSpec,
mode, variationPolicy and enabledPackIds. Optional fields are forcedCards, locks,
currentDNA and options.debug. Only `blind` / `new_direction` execute; other modes or
policies return named errors. Missing/invalid seed never triggers automatic randomness.

```ts
import { loadLibrary } from '@loadsnow/card-library';
import { createGenerator } from '@loadsnow/design-generation';

const loaded = loadLibrary(rawLibraryData); // supplied by the application
if (!loaded.library) throw new Error('Invalid card data');
const generate = createGenerator(loaded.library);
const result = generate(request);
if (result.status === 'success') {
  console.log(result.dna);
} else {
  console.error(result.error.code, result.diagnostics);
}
```

The two-argument `generate(request, library)` is also exported. The bound API
validates each request and supplied library on each call. Core never imports JSON,
reads files, fetches images or creates a clock/random seed. Static JSON assembly is
in `data/prototype-library.ts`, outside Core. Debug exports include profileContent,
buildCardPool, compatibilityWeight, sampleCards, resolveParameters and module seeds;
except generate/loadLibrary/validators, helpers expect already validated inputs.

Success is `{status:'success', dna, context, diagnostics, debug?}`; error is
`{status:'error', error, diagnostics}` with no partial DNA. Errors include invalid
request/parameter schema, empty required pool, unsupported mode/policy, missing or
ineligible forced/locked card. Loader diagnostics use `INVALID_CARD_SCHEMA`.

DNA `version` is `1.0.0`; `engineVersion` is `0.1.0`. Every selected card is
`{id,version}`. Layout/composition/typography/palette each require one reference;
image/wild are nullable; details is an array. Resolved parameters mirror those
cardinalities. No-op detail data (`noOp:true`) produces empty details/parameters.
DNA also records all module seeds, cardPackVersion and enabled `{id,version}` packs.
One pack uses its version; multiple packs use sorted `id@version` joined by commas,
with the structured cardPacks array as the unambiguous identity list.

## Content profile

Explicit language is retained; absent language becomes `unknown`. `ja`, `zh`, `ko`
and subtags use CJK thresholds; other languages use Latin thresholds. Count trimmed
Unicode codepoints from TITLE/BODY elements, joining multiple values with one space.

| Classification | Latin | CJK |
| --- | --- | --- |
| Title short / medium / long | ≤14 / ≤35 / ≤70 | ≤7 / ≤18 / ≤35 |
| Title extreme | >70 | >35 |
| Body none / short / medium / long | 0 / ≤80 / ≤240 / >240 | 0 / ≤40 / ≤120 / >120 |

All thresholds live in PROFILE_RULES. Nonempty text and image elements count toward
density. Title scores are 0/1/2/3; body scores 0/1/3/5; an applicable image adds 1.
`densityScore = (elementCount + titleScore + bodyScore + imageScore) ×
(1080 × 1440) / canvasArea`. Low ≤3, medium ≤8, high >8.

Images require finite positive metadata width/height. LOGO does not enable the
image module; IMAGE_PRIMARY is preferred, otherwise the first non-logo image.
Width/height ratio: tall ≤0.5, portrait <0.9, square ≤1.1, landscape <2, wide ≥2.
No applicable image means imageAspect `none`. Image source is never opened.

## Pools and conditional sampling

Frozen order: **Layout → Composition → Typography → Image → Palette → Detail → Wild**.
For each module, rebuild its pool using cards already selected upstream. Filter by
type, active status, enabled pack, declarative eligibility, compatibility and prior
selection; require positive final weight. Invalid nonfinite weights return an error.
Loader retains draft/deprecated cards, while new-generation pools exclude them.
Card IDs are globally unique within an M1 library; multiple versions per ID are not
loaded together. Candidate IDs use deterministic codepoint sorting.

Rules see ContentProfile fields plus flat keys `selected.layout`,
`selected.composition`, etc.; `selected.detail` is an ID array and `selected.tags`
contains all selected tags. Unselected singular fields are undefined.

`FinalWeight = BaseWeight × ContextWeight × CompatibilityWeight`.
ContextWeight comes from ordered weightMultiply effects. disable is sticky.
Pool entries retain each factor, parameter overrides, matched rule IDs and
compatibility effects; excluded entries record a reason.

This is forward greedy conditional sampling. Each decision changes downstream
eligibility and weights; it does not reconsider earlier decisions. An impossible
required downstream pool returns an error. There are no retries or candidate search.
Without images, image is null. Empty optional pools yield null/empty array.
Random detail count is 0 or 1 (50/50); explicit force/locks support multiple details,
rebuilding between each choice. noOp detail cannot be combined with other details.
Wild activates with 15% probability, then draws from its eligible pool.

## Compatibility data

```json
{
  "pairs": [{ "a": "L003", "b": "I004", "multiplier": 1.4 }],
  "tags": [{ "tagA": "minimal", "tagB": "dense", "multiplier": 0.3 }]
}
```

Rules are symmetric. Each matching rule applies once per candidate/selected pair.
All matching multipliers multiply, including matches against different selected
cards. Any zero forbids; one is neutral; 0..1 downweights; >1 prefers. Multipliers
must be finite and nonnegative. There are no card-ID branches in the engine.
The prototype has seven explicit pair rules and one tag rule in JSON.

## Force and lock

Priority: **explicit forcedCards > locks > seeded selection**. Force accepts ID or
CardRef; bare IDs resolve to the library's current version. `detail` is an array;
image/wild can be explicitly null. Active locks require currentDNA. Locks preserve
exact CardRefs, including optional null/empty arrays; parameters are sampled again
from the new seed and current rules. Version lookup must succeed. Current type,
status, pack, eligibility, compatibility and positive-weight requirements still apply.
Failure is explicit; no card substitution. Force overriding a lock emits info
`LOCK_OVERRIDDEN_BY_FORCE`.

## Seeds and parameter resolution

M0 RNG remains `mulberry32-fnv1a-utf16-v1`; its golden vectors are unchanged.
Numeric `839217` and string `"839217"` are deliberately distinct identities.
DNA Lab uses strings. Module derivation is:

```text
global = SeededRandom(request.seed)
storedModuleSeed = global.fork(module).nextInt(0, 0xffffffff)
moduleStream = SeededRandom(storedModuleSeed)
  select
  params
    parameterName
detailStream
  count
  select:0, select:1, ...
  params:0, params:1, ...
    parameterName
wildStream
  chance
  select
  params / parameterName
```

Derive-and-reseed makes the stored numeric module seed directly replayable with
SeededRandom. Forks do not consume their parent. Modules never sequentially share
one stream, and parameters cannot consume card-selection randomness. Parameter
names have their own forks, so adding parameters preserves existing draws.
Compatibility can legitimately change downstream choices when selected card
identities change; random-stream isolation does not remove that dependency.

Order: **definition → rule evaluation → concrete override → seeded sampling →
resolved value**. Integer is inclusive uniform; float is uniform within declared
bounds; boolean uses probability (default 0.5); enum supports uniform or weighted
string/number/boolean values. Weighted enums require equal-length weights, finite
nonnegative weights and at least one positive weight. Unsupported distributions
are rejected. Overrides must refer to declared parameters and satisfy their type,
range or enum membership; valid concrete overrides bypass random sampling.

## Review before M2

- Agree on lock semantics (cards only in M1), historical deprecated-card resolution,
  multiple card versions and unsupported DNA-version handling.
- Freeze version-bump/migration policy for sampler, seed derivation, compatibility
  data and pack edits. Replaying requires the same request and versioned data.
- Confirm per-selected-pair tag multiplication and greedy failure behavior before
  adding search/repair or new variation policies.
- Define the M2 boundary from card parameters to grid/slots/text/image fitting.
  No M1 field claims a final rendered position, font size or image crop.
- Review profile thresholds, multilingual text treatment and future detail counts
  against actual layout constraints once the Solver exists.
