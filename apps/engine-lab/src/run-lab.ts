import { loadCards } from '@loadsnow/card-library';
import { RANDOM_ALGORITHM, SeededRandom } from '@loadsnow/design-random';
import { evaluateRules } from '@loadsnow/design-rules';
import { prototypeCardData } from './card-data';

export type ContentDensity = 'low' | 'medium' | 'high';
export interface LabContext {
  readonly hasImage: boolean;
  readonly contentDensity: ContentDensity;
}

function randomSample(seed: string) {
  const random = new SeededRandom(seed);
  const namespaces = ['layout', 'typography', 'palette'] as const;
  return {
    algorithm: RANDOM_ALGORITHM,
    floats: Array.from({ length: 8 }, () => random.nextFloat()),
    integers: Array.from({ length: 8 }, () => random.nextInt(1, 100)),
    pick: random.pick(['a', 'b', 'c']),
    weightedPick: random.weightedPick([{ value: 'a', weight: 1 }, { value: 'b', weight: 3 }]),
    forks: Object.fromEntries(namespaces.map(namespace => {
      const stream = random.fork(namespace);
      return [namespace, Array.from({ length: 4 }, () => stream.nextFloat())];
    })),
  };
}

/** Lab composition only: no sampling cards or generating DNA in M0. */
export function runLab(seed: string, context: LabContext, data: unknown = prototypeCardData) {
  const library = loadCards(data);
  const random = randomSample(seed);
  const rules = library.cards.map(card => ({
    id: card.id,
    name: card.name,
    ...evaluateRules([...(card.eligibility ?? []), ...card.rules], { ...context }, {
      weight: card.weight,
      parameters: Object.fromEntries(Object.entries(card.parameters).map(([name, parameter]) => [name, parameter.default])),
    }),
  }));
  const counts = { total: library.cards.length, layout: 0, typography: 0, palette: 0, image: 0, composition: 0, detail: 0, wild: 0 };
  for (const card of library.cards) counts[card.type]++;
  return {
    seed, context: { ...context }, random, rules,
    deterministic: JSON.stringify(random) === JSON.stringify(randomSample(seed)),
    counts,
    diagnostics: library.diagnostics,
  };
}
