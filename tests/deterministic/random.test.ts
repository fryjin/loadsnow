import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../packages/design-random/src/index';

const sequence = (random: SeededRandom) => Array.from({ length: 32 }, () => random.nextFloat());

describe('SeededRandom', () => {
  it('repeats the same mixed sequence in 100 independent runs', () => {
    const run = () => {
      const random = new SeededRandom(839217);
      return Array.from({ length: 30 }, () => [
        random.nextFloat(), random.nextInt(-3, 9), random.pick(['a', 'b', 'c']),
        random.weightedPick([{ value: 'x', weight: 1 }, { value: 'y', weight: 3 }]),
      ]);
    };
    const expected = run();
    for (let i = 0; i < 100; i++) expect(run()).toEqual(expected);
  });
  it('normally diverges for different seeds', () => {
    expect(sequence(new SeededRandom(1))).not.toEqual(sequence(new SeededRandom(2)));
    expect(sequence(new SeededRandom('839217'))).not.toEqual(sequence(new SeededRandom(839217)));
  });
  it('returns floats in [0,1) and inclusive integers', () => {
    const random = new SeededRandom('bounds');
    const values = Array.from({ length: 1000 }, () => random.nextFloat());
    expect(values.every(value => value >= 0 && value < 1)).toBe(true);
    const integers = Array.from({ length: 1000 }, () => random.nextInt(-2, 2));
    expect([...new Set(integers)].sort()).toEqual([-1, -2, 0, 1, 2]);
    expect(random.nextInt(7, 7)).toBe(7);
    expect(integers.every(Number.isInteger)).toBe(true);
  });
  it('forks identical namespaces into repeatable streams independent of parent state', () => {
    const parent = new SeededRandom(839217);
    const expected = sequence(parent.fork('layout'));
    sequence(parent);
    expect(sequence(parent.fork('layout'))).toEqual(expected);
    expect(sequence(new SeededRandom(839217).fork('layout'))).toEqual(expected);
  });
  it('separates namespaces and nested namespace boundaries', () => {
    const parent = new SeededRandom(839217);
    expect(sequence(parent.fork('layout'))).not.toEqual(sequence(parent.fork('palette')));
    expect(sequence(parent.fork('a').fork('b'))).not.toEqual(sequence(parent.fork('a/b')));
  });
  it('does not consume parent or sibling streams when forking', () => {
    const parent = new SeededRandom(839217);
    sequence(parent.fork('layout'));
    expect(sequence(parent)).toEqual(sequence(new SeededRandom(839217)));
    expect(sequence(parent.fork('palette'))).toEqual(sequence(new SeededRandom(839217).fork('palette')));
  });
  it('picks entries deterministically, excludes zero weights and supports tiny weights', () => {
    const entries = [{ value: 'never', weight: 0 }, { value: 'a', weight: 1 }, { value: 'b', weight: 3 }];
    const draw = () => {
      const random = new SeededRandom('weighted');
      return Array.from({ length: 100 }, () => random.weightedPick(entries));
    };
    expect(draw()).toEqual(draw());
    expect(draw()).not.toContain('never');
    expect(new Set(draw())).toEqual(new Set(['a', 'b']));
    expect(new SeededRandom(0).weightedPick([{ value: 'tiny', weight: Number.MIN_VALUE }])).toBe('tiny');
    expect(new SeededRandom(0).pick(['only'])).toBe('only');
  });
  it('rejects invalid seeds, ranges, empty pools and invalid weights', () => {
    const random = new SeededRandom(0);
    for (const seed of [NaN, Infinity, -Infinity]) expect(() => new SeededRandom(seed)).toThrow();
    for (const [min, max] of [[2, 1], [0.1, 2], [0, Infinity], [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]] as const) {
      expect(() => random.nextInt(min, max)).toThrow();
    }
    expect(() => random.pick([])).toThrow();
    expect(() => random.weightedPick([])).toThrow();
    for (const weight of [-1, 0, NaN, Infinity]) {
      expect(() => random.weightedPick([{ value: 'bad', weight }])).toThrow();
    }
  });
});
