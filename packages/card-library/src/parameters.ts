import type { CardParameter, ParameterScalar } from '@loadsnow/design-domain';
import { finite, record } from './schema';

const scalar = (value: unknown): value is ParameterScalar =>
  typeof value === 'string' || typeof value === 'boolean' || finite(value);

export function isCardParameter(value: unknown): value is CardParameter {
  if (!record(value)) return false;
  switch (value.type) {
    case 'integer': case 'float': {
      if (!finite(value.min) || !finite(value.max) || !finite(value.default)
        || value.min > value.max || !Number.isFinite(value.max - value.min)
        || value.default < value.min || value.default > value.max
        || (value.distribution !== undefined && value.distribution !== 'uniform')) return false;
      return value.type === 'float' || (Number.isSafeInteger(value.min) && Number.isSafeInteger(value.max)
        && Number.isSafeInteger(value.default) && value.max - value.min + 1 <= 2 ** 32);
    }
    case 'boolean':
      return typeof value.default === 'boolean' && (value.probability === undefined
        || (finite(value.probability) && value.probability >= 0 && value.probability <= 1));
    case 'enum':
      if (!Array.isArray(value.values) || value.values.length === 0 || !value.values.every(scalar)
        || !scalar(value.default) || !value.values.includes(value.default)) return false;
      if (value.distribution === 'weighted') {
        return Array.isArray(value.weights) && value.weights.length === value.values.length
          && value.weights.every(weight => finite(weight) && weight >= 0)
          && value.weights.some(weight => weight > 0);
      }
      return (value.distribution === undefined || value.distribution === 'uniform') && value.weights === undefined;
    default: return false;
  }
}

/** Overrides are concrete values within the declared parameter's valid domain. */
export function isParameterValue(parameter: CardParameter, value: unknown): value is ParameterScalar {
  switch (parameter.type) {
    case 'integer': case 'float':
      return finite(value) && value >= parameter.min && value <= parameter.max
        && (parameter.type === 'float' || Number.isSafeInteger(value));
    case 'boolean': return typeof value === 'boolean';
    case 'enum': return scalar(value) && parameter.values.includes(value);
  }
}
