export function record(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
export const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const version = (value: unknown): value is string => text(value) && /^\d+\.\d+\.\d+$/.test(value);
