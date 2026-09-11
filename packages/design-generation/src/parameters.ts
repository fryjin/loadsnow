import type { CardDefinition, GenerationError, ResolvedParameters, RuleValue } from '@loadsnow/design-domain';
import { isCardParameter, isParameterValue } from '@loadsnow/card-library';
import type { SeededRandom } from '@loadsnow/design-random';

type ParameterResult = { readonly status: 'success'; readonly parameters: ResolvedParameters }
  | { readonly status: 'error'; readonly error: GenerationError };

export function resolveParameters(card: CardDefinition, overrides: ResolvedParameters, random: SeededRandom): ParameterResult {
  const invalid = (name: string): ParameterResult => ({ status: 'error', error: {
    code: 'INVALID_PARAMETER_SCHEMA', cardId: card.id, message: 'Invalid parameter definition or override: ' + name,
  } });
  for (const name of Object.keys(overrides)) if (!Object.hasOwn(card.parameters, name)) return invalid(name);
  const entries: [string, RuleValue][] = [];
  for (const name of Object.keys(card.parameters).sort()) {
    const definition = card.parameters[name]!;
    if (!isCardParameter(definition)) return invalid(name);
    if (Object.hasOwn(overrides, name)) {
      const value = overrides[name];
      if (!isParameterValue(definition, value)) return invalid(name);
      entries.push([name, value]);
      continue;
    }
    const stream = random.fork(name);
    let value: RuleValue;
    switch (definition.type) {
      case 'integer': value = stream.nextInt(definition.min, definition.max); break;
      case 'float': value = definition.min + stream.nextFloat() * (definition.max - definition.min); break;
      case 'boolean': value = stream.nextFloat() < (definition.probability ?? 0.5); break;
      case 'enum':
        value = definition.distribution === 'weighted'
          ? stream.weightedPick(definition.values.map((item, index) => ({ value: item, weight: definition.weights[index]! })))
          : stream.pick(definition.values);
        break;
    }
    entries.push([name, value]);
  }
  return { status: 'success', parameters: Object.fromEntries(entries) };
}
