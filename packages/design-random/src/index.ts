export const RANDOM_ALGORITHM = 'mulberry32-fnv1a-utf16-v1';
export interface WeightedItem<T> {
  readonly value: T;
  readonly weight: number;
}

const UINT32_RANGE = 0x100000000;

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    result = Math.imul(result ^ value.charCodeAt(index), 0x01000193);
  }
  return result >>> 0;
}

/** Reproducible, noncryptographic random stream. Algorithm changes require a new version. */
export class SeededRandom {
  private identity: string;
  private state: number;

  constructor(seed: string | number) {
    if (typeof seed === 'number' && !Number.isFinite(seed)) {
      throw new RangeError('Seed must be a finite number or string.');
    }
    this.identity = JSON.stringify([typeof seed, seed]);
    this.state = hash(this.identity);
  }

  private nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  nextFloat(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** Inclusive endpoints; at most 2^32 possible integers. Rejection avoids modulo bias. */
  nextInt(min: number, max: number): number {
    const span = max - min + 1;
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || span < 1 || span > UINT32_RANGE) {
      throw new RangeError('Expected safe integer bounds with a span from 1 to 2^32.');
    }
    const limit = Math.floor(UINT32_RANGE / span) * span;
    let value: number;
    do { value = this.nextUint32(); } while (value >= limit);
    return min + (value % span);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Cannot pick from an empty pool.');
    return items[this.nextInt(0, items.length - 1)]!;
  }

  weightedPick<T>(items: readonly WeightedItem<T>[]): T {
    let maxWeight = 0;
    for (const item of items) {
      if (!Number.isFinite(item.weight) || item.weight < 0) {
        throw new RangeError('Weights must be finite and nonnegative.');
      }
      maxWeight = Math.max(maxWeight, item.weight);
    }
    if (maxWeight === 0) throw new RangeError('At least one positive weight is required.');
    // Scaling avoids overflow of the sum and supports subnormal positive weights.
    const total = items.reduce((sum, item) => sum + item.weight / maxWeight, 0);
    const target = this.nextFloat() * total;
    let cumulative = 0;
    let lastPositive: WeightedItem<T> | undefined;
    for (const item of items) {
      if (item.weight === 0) continue;
      lastPositive = item;
      cumulative += item.weight / maxWeight;
      if (target < cumulative) return item.value;
    }
    return lastPositive!.value;
  }

  /** A fresh namespace stream, independent of calls on this stream or its siblings. */
  fork(namespace: string): SeededRandom {
    const child = new SeededRandom(0);
    child.identity = JSON.stringify([this.identity, namespace]);
    child.state = hash(child.identity);
    return child;
  }
}
