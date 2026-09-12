import { SeededRandom } from '@loadsnow/design-random';
import type { CardType, DesignSeeds, Seed } from '@loadsnow/design-domain';

export const SAMPLING_ORDER = ['layout', 'composition', 'typography', 'image', 'palette', 'detail', 'wild'] as const;
export const ENGINE_VERSION = '0.1.0';
export const DNA_VERSION = '1.0.0';

/** Derive replayable numeric module seeds without consuming the global stream. */
export function createModuleSeeds(seed: Seed): DesignSeeds {
  const global = new SeededRandom(seed);
  const derive = (module: CardType) => global.fork(module).nextInt(0, 0xffffffff);
  return { global: seed, layout: derive('layout'), composition: derive('composition'),
    typography: derive('typography'), image: derive('image'), palette: derive('palette'),
    detail: derive('detail'), wild: derive('wild') };
}
export function moduleRandom(seeds: DesignSeeds, module: CardType): SeededRandom {
  return new SeededRandom(seeds[module]);
}
