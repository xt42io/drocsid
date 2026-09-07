// Draft edits notify only the composer that owns the key.
export class Drafts {
  private values = new Map<string, string>();
  private listeners = new Map<string, Set<() => void>>();
  get(key: string) {
    return this.values.get(key) ?? "";
  }
  set(key: string, text: string) {
    if (this.get(key) === text) return;
    if (text) this.values.set(key, text);
    else this.values.delete(key);
    this.listeners.get(key)?.forEach((listener) => listener());
  }
  subscribe(key: string, listener: () => void) {
    let listeners = this.listeners.get(key);
    if (!listeners) this.listeners.set(key, (listeners = new Set()));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(key);
    };
  }
  clear() {
    for (const key of [...this.values.keys()]) this.set(key, "");
  }
}
