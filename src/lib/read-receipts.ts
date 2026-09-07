import type { Action } from "./contracts";
type Read = Extract<Action, { type: "conversation.read" }>;
type Job = {
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
    if (!job.latest || job.latest.through < action.through) job.latest = action;
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
      void send(action)
        .then(
          (ok) => waiters.forEach((resolve) => resolve(ok)),
          () => waiters.forEach((resolve) => resolve(false)),
        )
        .finally(() => {
          job.running = false;
          if (this.jobs.get(key) !== job) return;
          if (job.latest) this.schedule(key, job, send);
          else this.jobs.delete(key);
        });
    }, this.delay);
  }
  clear() {
    for (const job of this.jobs.values()) {
      clearTimeout(job.timer);
      job.waiters.forEach((resolve) => resolve(false));
    }
    this.jobs.clear();
  }
}
