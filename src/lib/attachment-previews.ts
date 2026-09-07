// Browser-only previews belong to the outbox, not persisted attachment metadata.
// Keep each URL until every mounted copy has switched to the downloaded image.
export class AttachmentPreviews {
  private entries = new Map<
    string,
    { url: string; readers: number; loaded: boolean }
  >();
  constructor(private revoke = (url: string) => URL.revokeObjectURL(url)) {}

  add(id: string, url: string) {
    const previous = this.entries.get(id);
    if (previous?.url === url) return;
    if (previous) this.revoke(previous.url);
    this.entries.set(id, { url, readers: 0, loaded: false });
  }
  get(id: string) {
    const entry = this.entries.get(id);
    return entry && !entry.loaded ? entry.url : undefined;
  }
  retain(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return () => {};
    entry.readers++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      entry.readers--;
      if (entry.loaded && !entry.readers && this.entries.get(id) === entry)
        this.remove(id);
    };
  }
  loaded(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.loaded = true;
    if (!entry.readers) this.remove(id);
  }
  prune(visibleIds: Set<string>) {
    for (const id of this.entries.keys())
      if (!visibleIds.has(id)) this.remove(id);
  }
  clear() {
    for (const id of this.entries.keys()) this.remove(id);
  }
  private remove(id: string) {
    const entry = this.entries.get(id);
    if (entry) {
      this.entries.delete(id);
      this.revoke(entry.url);
    }
  }
}
