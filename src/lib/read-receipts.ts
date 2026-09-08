import type { Action } from "./contracts";
type Read = Extract<Action, { type: "conversation.read" }>;
type Job = {
  active?: Read;
  latest?: Read;
  waiters: ((ok: boolean) => void)[];
  timer?: ReturnType<typeof setTimeout>;
  running: boolean;
};
export class ReadReceipts {
  private jobs = new Map<string, Job>();
  constructor(private delay = 750) {}
  enqueue(action: Read, send: (action: Read) => Promise<boolean>) {
    let job = this.jobs.get(action.conversation);
    if (!job)
      this.jobs.set(
        action.conversation,
        (job = { waiters: [], running: false }),
      );
    if (!job.latest || job.latest.through <= action.through) job.latest = action;
    const result = new Promise<boolean>((resolve) => job.waiters.push(resolve));
    this.schedule(action.conversation, job, send);
    return result;
  }
  private schedule(
    key: string,
    job: Job,
    send: (action: Read) => Promise<boolean>,
  ) {
    if (job.timer || job.running) return;
    job.timer = setTimeout(() => {
      job.timer = undefined;
      const action = job.latest!;
      const waiters = job.waiters.splice(0);
      job.latest = undefined;
      job.running = true;
      job.active = action;
      void send(action)
        .then(
          (ok) => waiters.forEach((resolve) => resolve(ok)),
          () => waiters.forEach((resolve) => resolve(false)),
        )
        .finally(() => {
          job.running = false;
          job.active = undefined;
          if (this.jobs.get(key) !== job) return;
          if (job.latest) this.schedule(key, job, send);
          else this.jobs.delete(key);
        });
    }, this.delay);
  }
  pending() {
    return [...this.jobs.values()].flatMap((job) => {
      const action =
        !job.active ||
        (job.latest && job.active.through <= job.latest.through)
          ? job.latest
          : job.active;
      return action ? [{ ...action }] : [];
    });
  }
  clear() {
    for (const job of this.jobs.values()) {
      clearTimeout(job.timer);
      job.waiters.forEach((resolve) => resolve(false));
    }
    this.jobs.clear();
  }
}

export function persistReadReceipts(
  reads: Read[],
  request: typeof fetch = fetch,
) {
  const requests: Promise<Response>[] = [];
  for (let offset = 0; offset < reads.length; offset += 50) {
    requests.push(
      request("/api/app", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reads.slice(offset, offset + 50)),
        keepalive: true,
      }),
    );
  }
  return requests;
}
