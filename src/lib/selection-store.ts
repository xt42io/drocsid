export function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) =>
        Object.hasOwn(b, key) &&
        Object.is(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    )
  );
}
export function selectionStore<T extends object>(initial: T) {
  let current = initial;
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const functions: Partial<T> = {};
  for (const key of Object.keys(initial) as (keyof T)[])
    if (typeof initial[key] === "function") {
      functions[key] = ((...args: unknown[]) =>
        (current[key] as (...args: unknown[]) => unknown)(
          ...args,
        )) as T[keyof T];
    }
  snapshot = { ...current, ...functions };
  return {
    get: () => snapshot,
    set(value: T) {
      current = value;
      const next = { ...value, ...functions };
      if (shallowEqual(snapshot, next)) return;
      snapshot = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
